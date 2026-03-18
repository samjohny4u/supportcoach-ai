import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabaseServer";
import { getCurrentOrganization } from "@/lib/currentOrganization";

export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type ChatAnalysis = {
  id: number;
  file_name: string;
  agent_name: string | null;
  customer_name: string | null;
  chat_type: string | null;
  issue_summary: string | null;
  empathy: number | null;
  clarity: number | null;
  ownership: number | null;
  resolution_quality: number | null;
  professionalism: number | null;
  churn_risk: string | null;
  deleted_message: boolean | null;
  missed_confirmation: boolean | null;
  premature_close: boolean | null;
  product_limitation_chat: boolean | null;
  customer_frustration_present: boolean | null;
  escalation_done_well: boolean | null;
  summary_strengths: string[] | null;
  summary_improvements: string[] | null;
  created_at: string;
  organization_id?: string | null;
};

function sanitizeReport(text: string) {
  return text
    .replace(/^\s*(?:ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢|Ã¢â‚¬Â¢|â€¢|•)\s+/gm, "- ")
    .replace(/^If helpful, I can also.*$/gim, "")
    .replace(/^Let me know if.*$/gim, "")
    .replace(/^I can also.*$/gim, "")
    .trim();
}

function buildSystemPrompt(isSingleAgent: boolean) {
  if (isSingleAgent) {
    return `
You are writing a finished internal coaching report for one support agent.

You are NOT a chatbot.
You are NOT an assistant.
You are producing a polished coaching report focused on a single agent.

Use this structure:

## Agent Coaching Report
### Agent Snapshot
### Top Strengths
### Top Coaching Opportunities
### Risk Patterns
### Coaching Focus Next

Rules:
- Write for managers and leadership.
- Focus only on the selected agent.
- Do not refer to "team" or "agents" in plural.
- Do not include a section called "Agents Needing Attention".
- Do not use assistant language.
- Do not offer extra help.
- Do not say "If helpful, I can..."
- No closing paragraph after Coaching Focus Next.
- Coaching Focus Next must contain 3ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“5 specific actions for this one agent.
    `.trim();
  }

  return `
You are writing a finished internal management report for a support leadership team.

You are NOT a chatbot.
You are NOT an assistant.
You are producing a polished weekly coaching report.

Use this structure:

## Weekly Support Coaching Report
### Team Health
### Top Strengths
### Top Coaching Opportunities
### Risk Patterns
### Agents Needing Attention
### Manager Focus Next

Rules:
- Write for managers and leadership.
- Do not use assistant language.
- Do not offer extra help.
- Do not say "If helpful, I can..."
- No closing paragraph after Manager Focus Next.
- Manager Focus Next must contain 3ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“5 specific coaching actions.
  `.trim();
}

function buildUserPrompt(data: ChatAnalysis[], selectedAgent: string, isSingleAgent: boolean) {
  if (isSingleAgent) {
    return `
Selected agent: ${selectedAgent}

Dataset for analysis:

${JSON.stringify(data.slice(0, 75), null, 2)}
    `.trim();
  }

  return `
Dataset for analysis:

${JSON.stringify(data.slice(0, 75), null, 2)}
  `.trim();
}

export async function GET(req: Request) {
  try {
    const supabaseAuth = await createSupabaseServer();
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { report: "Not authenticated." },
        { status: 401 }
      );
    }

    const { organizationId } = await getCurrentOrganization();

    if (!organizationId) {
      return NextResponse.json(
        { report: "Organization not found." },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);
    const agent = searchParams.get("agent") || "all";
    const days = searchParams.get("days") || "7";
    const isSingleAgent = agent !== "all";

    const date = new Date();
    date.setDate(date.getDate() - Number(days));

    let query = supabase
      .from("chat_analyses")
      .select("*")
      .eq("organization_id", organizationId)
      .neq("excluded", true)
      .gte("created_at", date.toISOString())
      .order("created_at", { ascending: false })
      .limit(200);

    if (isSingleAgent) {
      query = query.eq("agent_name", agent);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { report: `Failed to load data: ${error.message}` },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json({
        report: "No analyzed chats found for this filter selection.",
      });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-5.4",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: buildSystemPrompt(isSingleAgent),
        },
        {
          role: "user",
          content: buildUserPrompt(data as ChatAnalysis[], agent, isSingleAgent),
        },
      ],
    });

    const rawReport =
      completion.choices[0]?.message?.content || "Report generation failed.";

    const report = sanitizeReport(rawReport);

    return NextResponse.json({ report });
  } catch (error: any) {
    console.error("Manager report route error:", error);

    return NextResponse.json(
      { report: error?.message || "Report generation failed." },
      { status: 500 }
    );
  }
}
