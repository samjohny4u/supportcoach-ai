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
const DIGEST_WINDOW_DAYS = 14;
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

function buildSystemPrompt(agentName: string): string {
  return `You are writing a coaching digest for a support agent named ${agentName}, on behalf of their manager. The digest consolidates coaching themes from the agent's toughest chats over the last ${DIGEST_WINDOW_DAYS} days into ONE supportive, actionable message the manager can paste and send.

TONE AND INTENT:
- Supportive, specific, manager-like. The goal is a plan of action the agent can act on, NOT a list of everything that went wrong.
- Consolidate: if the same behavior shows up in several chats, present it ONCE as a theme, noting it has come up more than once in an encouraging way (e.g. "this one keeps sneaking back in, so let's make it the focus"). Never shame, never pile on.
- Ground every claim in the provided data. Never invent chats, quotes, or behaviors that are not in the data. Reference chats by their date (e.g. "your chat on 2026-08-20").

STRUCTURE (use exactly these plain-text section headers):
Opening - one or two warm sentences acknowledging real effort, referencing the period.
Patterns worth your attention - the 1-3 consolidated themes, each with the specific behavior observed and which chat dates it appeared in.
What to keep doing - 1-2 genuine strengths visible in the data.
Your plan of action - exactly 3 concrete, doable behaviors phrased as suggestions, each with a short example phrasing the agent can use verbatim in a chat.
Closing - one encouraging sentence looking forward.

FORMAT RULES:
- 250 to 400 words total.
- Plain ASCII characters only. No Unicode bullets, em dashes, arrows, or emoji. Use "-" for bullets.
- Return ONLY the digest text. No preamble, no sign-off as an AI, no offers of further help.`;
}

function buildUserPrompt(agentName: string, rows: DigestChatRow[]): string {
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
Problem chats from the last ${DIGEST_WINDOW_DAYS} days (newest first):
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
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - DIGEST_WINDOW_DAYS);

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
        message: `No high-attention, high-churn-risk, or frustration-flagged chats found for ${agentName} in the last ${DIGEST_WINDOW_DAYS} days. Nothing to digest — that is good news.`,
      });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-5.4",
      temperature: 0.2,
      messages: [
        { role: "system", content: buildSystemPrompt(agentName) },
        { role: "user", content: buildUserPrompt(agentName, rows) },
      ],
    });

    const digest = completion.choices[0]?.message?.content?.trim() || "";

    if (!digest) {
      return NextResponse.json(
        { error: "Digest generation failed. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ digest, chat_count: rows.length });
  } catch (error) {
    console.error("Coaching digest route error:", error);
    return NextResponse.json(
      { error: "Digest generation failed. Please try again." },
      { status: 500 }
    );
  }
}
