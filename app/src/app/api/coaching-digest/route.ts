import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getCurrentOrganization } from "@/lib/currentOrganization";
import { createSupabaseServer } from "@/lib/supabaseServer";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Tunable digest constants
const DIGEST_WINDOW_DAYS = 14; // default and minimum window
const DIGEST_WINDOW_MAX_DAYS = 30; // cap when the manager returns late
const DIGEST_CHAT_LIMIT = 10;

type DigestChatRow = {
  id: string;
  created_at: string | null;
  customer_name: string | null;
  chat_type: string | null;
  issue_summary: string | null;
  summary_improvements: string[] | null;
  coaching_points: unknown;
  attention_priority: string | null;
  churn_risk: string | null;
  customer_frustration_present: boolean | null;
};

function buildSystemPrompt(agentName: string, windowDays: number): string {
  const firstName = agentName.trim().split(/\s+/)[0] || agentName.trim();

  return `You are writing a coaching digest for a support agent named ${agentName}, on behalf of their manager. It consolidates coaching themes from the agent's toughest chats over the last ${windowDays} days into ONE supportive, actionable message.

THE MESSAGE MUST BE READY TO SEND AS-IS - the manager pastes it to the agent with ZERO editing:
- Start directly with the agent's first name and a dash: "${firstName} -" followed by a warm opening line acknowledging real effort over the period.
- Do NOT print any section labels or headers of any kind (never write "Opening", "Patterns", "Strengths", "Closing", or anything similar as a label). The ONLY literal label allowed is "Your plan of action:" introducing the action list.
- Flow, as natural short paragraphs: warm opening -> the 1-3 consolidated themes worth attention (the specific behavior and which chat dates it appeared in; if the same behavior shows up in several chats, present it ONCE as a theme, encouragingly - e.g. "this one keeps sneaking back in, so let's make it the focus" - never shame, never pile on) -> one or two genuine strengths from the data -> "Your plan of action:" with exactly 3 concrete, doable suggestions, each with a short example phrasing the agent can use verbatim in a chat -> one encouraging closing sentence.
- Ground every claim in the provided data. Never invent chats, quotes, or behaviors that are not in the data. Reference chats by their date (e.g. "your chat on 2026-08-20").

FORMAT RULES:
- 250 to 400 words total; shorter when the data is thin.
- Plain ASCII characters only. No Unicode bullets, em dashes, arrows, or emoji. Use "-" for bullets.
- Return ONLY the message text. No preamble, no meta commentary, no sign-off as an AI.`;
}

function buildUserPrompt(agentName: string, rows: DigestChatRow[], windowDays: number): string {
  const chats = rows.map((row) => ({
    date: row.created_at ? row.created_at.split("T")[0] : "unknown",
    customer: row.customer_name || "Unknown",
    topic: row.chat_type || "Unknown",
    issue_summary: row.issue_summary || "",
    improvement_areas: Array.isArray(row.summary_improvements)
      ? row.summary_improvements
      : [],
    coaching_points: Array.isArray(row.coaching_points) ? row.coaching_points : [],
    attention_priority: row.attention_priority || "low",
    churn_risk: row.churn_risk || "low",
    customer_frustration_present: row.customer_frustration_present === true,
  }));

  return `Agent: ${agentName}
Problem chats from the last ${windowDays} days (newest first):
${JSON.stringify(chats, null, 2)}`;
}

export async function GET(req: Request) {
  try {
    const supabaseAuth = await createSupabaseServer();
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let organizationId: string;

  try {
    const organization = await getCurrentOrganization();
    organizationId = organization.organizationId;
  } catch {
    return NextResponse.json(
      { error: "User is not assigned to an organization." },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(req.url);
  const agentParam = searchParams.get("agent");
  const agentName =
    typeof agentParam === "string" && agentParam.trim().length > 0
      ? agentParam.trim()
      : "";

  if (!agentName) {
    return NextResponse.json({ error: "agent is required." }, { status: 400 });
  }

  try {
    // Dynamic window: cover everything since the last digest (min 14, capped at
    // 30 days) so a manager returning in week 3 or 4 leaves no coverage gap.
    // try/catch: the coaching_digests table may not exist yet — fall back to 14.
    let lastDigestAt: string | null = null;
    try {
      const { data: lastDigestRow } = await supabaseAdmin
        .from("coaching_digests")
        .select("generated_at")
        .eq("organization_id", organizationId)
        .eq("agent_name", agentName)
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      lastDigestAt =
        typeof lastDigestRow?.generated_at === "string" ? lastDigestRow.generated_at : null;
    } catch {
      lastDigestAt = null;
    }

    let windowDays = DIGEST_WINDOW_DAYS;
    if (lastDigestAt) {
      const daysSinceLast = Math.ceil(
        (Date.now() - new Date(lastDigestAt).getTime()) / (24 * 60 * 60 * 1000)
      );
      if (Number.isFinite(daysSinceLast) && daysSinceLast > DIGEST_WINDOW_DAYS) {
        windowDays = Math.min(daysSinceLast, DIGEST_WINDOW_MAX_DAYS);
      }
    }

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - windowDays);

    const { data, error } = await supabaseAdmin
      .from("chat_analyses")
      .select(
        "id, created_at, customer_name, chat_type, issue_summary, summary_improvements, coaching_points, attention_priority, churn_risk, customer_frustration_present"
      )
      .eq("organization_id", organizationId)
      .eq("agent_name", agentName)
      .eq("excluded", false)
      .gte("created_at", cutoff.toISOString())
      .or(
        "attention_priority.eq.high,churn_risk.eq.high,customer_frustration_present.eq.true"
      )
      .order("created_at", { ascending: false })
      .limit(DIGEST_CHAT_LIMIT);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = (data || []) as DigestChatRow[];

    if (rows.length === 0) {
      return NextResponse.json({
        digest: "",
        empty: true,
        message: `No high-attention, high-churn-risk, or frustration-flagged chats found for ${agentName} in the last ${windowDays} days. Nothing to digest — that is good news.`,
        window_days: windowDays,
        last_digest_at: lastDigestAt,
      });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-5.4",
      temperature: 0.2,
      messages: [
        { role: "system", content: buildSystemPrompt(agentName, windowDays) },
        { role: "user", content: buildUserPrompt(agentName, rows, windowDays) },
      ],
    });

    const digest = completion.choices[0]?.message?.content?.trim() || "";

    if (!digest) {
      return NextResponse.json(
        { error: "Digest generation failed. Please try again." },
        { status: 500 }
      );
    }

    // Record the generation so the agent page can show last-digest/due status.
    // Silent no-op until the owner runs the coaching_digests SQL.
    try {
      await supabaseAdmin.from("coaching_digests").insert({
        organization_id: organizationId,
        agent_name: agentName,
        window_days: windowDays,
        chat_count: rows.length,
      });
    } catch {
      // Table not created yet — cadence tracking simply stays off.
    }

    return NextResponse.json({
      digest,
      chat_count: rows.length,
      window_days: windowDays,
      last_digest_at: lastDigestAt,
    });
  } catch (error) {
    console.error("Coaching digest route error:", error);
    return NextResponse.json(
      { error: "Digest generation failed. Please try again." },
      { status: 500 }
    );
  }
}
