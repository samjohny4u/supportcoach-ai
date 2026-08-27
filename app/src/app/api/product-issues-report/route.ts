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

const REPORT_CHAT_LIMIT = 200;

type ProductIssueRow = {
  id: string;
  created_at: string | null;
  customer_name: string | null;
  chat_type: string | null;
  issue_summary: string | null;
  quick_summary: string | null;
  churn_risk: string | null;
  customer_frustration_present: boolean | null;
};

function getRangeDays(range: string): number | null {
  if (range === "7d") return 7;
  if (range === "30d") return 30;
  if (range === "90d") return 90;
  return null; // all time
}

function getRangeLabel(range: string): string {
  if (range === "7d") return "last 7 days";
  if (range === "30d") return "last 30 days";
  if (range === "90d") return "last 90 days";
  return "all time";
}

function toDateOnly(value: string | null): string {
  if (!value) return "unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "unknown";
  return date.toISOString().split("T")[0];
}

function buildSystemPrompt(): string {
  return `You are a product-feedback analyst preparing a report for a company's product team and leadership, based on support chats where the PRODUCT (a bug, glitch, or missing feature) - not the support agent - was the blocker.

Your job: consolidate the per-chat data into a report that product and leadership can act on without opening a single chat.

STRUCTURE (use exactly these plain-text section headers):
PRODUCT FRICTION REPORT - <period label> (<earliest date> to <latest date>)

OVERVIEW
- Total chats where the product was the blocker: <n> of <total_analyzed> analyzed chats (<percent>%)
- Note: the base is chats analyzed in SupportCoach for this period - a manager-selected sample (often weighted toward low-rated chats), NOT the team's total support volume.
- Topics affected: <n>
- High churn risk chats: <n> | Medium: <n> | Customers showing frustration: <n>

FRICTION BY TOPIC
For each topic, ordered by chat count descending:
<Topic> (<n> chats)
- One to three sentences CONSOLIDATING what feature or behavior soured the experience across ALL of that topic's chats - name the feature, what it failed to do or lacked, and the workflow impact on customers. Synthesize the pattern; do not list every chat.

HIGH CHURN RISK CALLOUTS
For each chat rated high churn risk:
- <date> | <customer> | <topic>: one sentence on WHY the risk is high, grounded in that chat's summary (what happened and what makes the customer likely to leave).
If there are none, write "None in this period."

BOTTOM LINE
Two or three sentences for leadership: the biggest product friction themes this period and where fixing them would reduce churn risk fastest.

RULES:
- Ground EVERY claim in the provided summaries. Never invent features, causes, or customer sentiment that is not in the data.
- This is a product report: never name or blame support agents.
- Consolidate duplicates into patterns - leadership reads themes, not lists.
- Scale the report to the data: a handful of chats needs a short report.
- Plain ASCII only. No Unicode bullets, em dashes, arrows, or emoji. Use "-" for bullets.
- Return ONLY the report text. No preamble, no AI sign-off, no offers of further help.`;
}

function buildUserPrompt(
  rangeLabel: string,
  rows: ProductIssueRow[],
  totalAnalyzed: number
): string {
  const chats = rows.map((row) => ({
    date: toDateOnly(row.created_at),
    customer: row.customer_name || "Unknown",
    topic: row.chat_type || "Uncategorized",
    issue_summary: row.issue_summary || "",
    quick_summary: row.quick_summary || "",
    churn_risk: row.churn_risk || "low",
    customer_frustration_present: row.customer_frustration_present === true,
  }));

  return `Period: ${rangeLabel}
Total chats analyzed in this period (all analyzed chats, not just product-blocker ones): ${totalAnalyzed}
Product-blocker chats (newest first):
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
  const rangeParam = searchParams.get("range") || "all";
  const range =
    rangeParam === "7d" || rangeParam === "30d" || rangeParam === "90d"
      ? rangeParam
      : "all";

  try {
    let query = supabaseAdmin
      .from("chat_analyses")
      .select(
        "id, created_at, customer_name, chat_type, issue_summary, quick_summary, churn_risk, customer_frustration_present"
      )
      .eq("organization_id", organizationId)
      .eq("excluded", false)
      .eq("product_limitation_chat", true)
      .order("created_at", { ascending: false })
      .limit(REPORT_CHAT_LIMIT);

    const rangeDays = getRangeDays(range);
    if (rangeDays !== null) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - rangeDays);
      query = query.gte("created_at", cutoff.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Denominator: ALL analyzed chats in the same period (not just product-blocker
    // ones) — leadership's first question is "out of how many?". The prompt labels
    // it as the manager-selected analyzed sample, never total support volume.
    let totalAnalyzed = 0;
    try {
      let countQuery = supabaseAdmin
        .from("chat_analyses")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("excluded", false);

      if (rangeDays !== null) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - rangeDays);
        countQuery = countQuery.gte("created_at", cutoff.toISOString());
      }

      const { count } = await countQuery;
      totalAnalyzed = typeof count === "number" ? count : 0;
    } catch {
      totalAnalyzed = 0;
    }

    const rows = (data || []) as ProductIssueRow[];

    if (rows.length === 0) {
      return NextResponse.json({
        report: "",
        empty: true,
        message: `No product-blocker chats found for the ${getRangeLabel(range)}. Nothing to report - that is good news for the product team.`,
      });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-5.4",
      temperature: 0.2,
      messages: [
        { role: "system", content: buildSystemPrompt() },
        { role: "user", content: buildUserPrompt(getRangeLabel(range), rows, totalAnalyzed) },
      ],
    });

    const report = completion.choices[0]?.message?.content?.trim() || "";

    if (!report) {
      return NextResponse.json(
        { error: "Report generation failed. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ report, chat_count: rows.length });
  } catch (error) {
    console.error("Product issues report route error:", error);
    return NextResponse.json(
      { error: "Report generation failed. Please try again." },
      { status: 500 }
    );
  }
}
