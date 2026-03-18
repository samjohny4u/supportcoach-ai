import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "../../../lib/supabaseServer";
import { getCurrentOrganization } from "../../../lib/currentOrganization";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

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

function isKnownAgentName(name: string | null | undefined) {
  if (!name) return false;
  const cleaned = name.trim().toLowerCase();
  return cleaned !== "" && cleaned !== "unknown" && cleaned !== "null";
}

async function getAgentNames(organizationId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("chat_analyses")
    .select("agent_name")
    .eq("organization_id", organizationId)
    .neq("excluded", true);

  if (error || !data) {
    return [];
  }

  return Array.from(
    new Set(
      data
        .map((row) => row.agent_name)
        .filter((name): name is string => isKnownAgentName(name))
    )
  ).sort();
}

async function getManagerReport(
  organizationId: string,
  selectedAgent: string,
  selectedDays: string
): Promise<string> {
  try {
    const date = new Date();
    date.setDate(date.getDate() - Number(selectedDays));

    let query = supabase
      .from("chat_analyses")
      .select("*")
      .eq("organization_id", organizationId)
      .neq("excluded", true)
      .gte("created_at", date.toISOString())
      .order("created_at", { ascending: false })
      .limit(200);

    if (selectedAgent && selectedAgent !== "all") {
      query = query.eq("agent_name", selectedAgent);
    }

    const { data, error } = await query;

    if (error) {
      return `Failed to load data: ${error.message}`;
    }

    if (!data || data.length === 0) {
      return "No analyzed chats found for this filter selection.";
    }

    const trimmedDataset = (data as ChatAnalysis[]).slice(0, 75);
    const isSingleAgent = selectedAgent !== "all";

    const systemPrompt = isSingleAgent
      ? `
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
        `.trim()
      : `
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

    const userPrompt = isSingleAgent
      ? `
Selected agent: ${selectedAgent}

Dataset for analysis:

${JSON.stringify(trimmedDataset, null, 2)}
        `.trim()
      : `
Dataset for analysis:

${JSON.stringify(trimmedDataset, null, 2)}
        `.trim();

    const completion = await openai.chat.completions.create({
      model: "gpt-5.4",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
    });

    const rawReport =
      completion.choices[0]?.message?.content || "Report generation failed.";

    return sanitizeReport(rawReport);
  } catch (error: any) {
    console.error("Manager report generation error:", error);
    return error?.message || "Report generation failed.";
  }
}

function renderInlineMarkdown(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/g);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    return <span key={index}>{part}</span>;
  });
}

function renderReport(report: string) {
  const lines = report.split("\n").filter((line) => line.trim() !== "");

  return lines.map((line, index) => {
    const trimmed = line.trim();

    if (trimmed.startsWith("## ")) {
      return (
        <h1 key={index} className="mb-4 mt-8 text-3xl font-bold text-white first:mt-0">
          {renderInlineMarkdown(trimmed.replace(/^##\s+/, ""))}
        </h1>
      );
    }

    if (trimmed.startsWith("### ")) {
      return (
        <h2 key={index} className="mb-3 mt-6 text-2xl font-semibold text-white">
          {renderInlineMarkdown(trimmed.replace(/^###\s+/, ""))}
        </h2>
      );
    }

    if (trimmed.startsWith("- ")) {
      return (
        <li key={index} className="ml-5 list-disc leading-7 text-gray-300">
          {renderInlineMarkdown(trimmed.replace(/^- /, ""))}
        </li>
      );
    }

    return (
      <p key={index} className="leading-7 text-gray-300">
        {renderInlineMarkdown(trimmed)}
      </p>
    );
  });
}

export default async function ManagerReportPage({
  searchParams,
}: {
  searchParams?: Promise<{ agent?: string; days?: string }>;
}) {
  const supabaseAuth = await createSupabaseServer();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let organizationId: string;

  try {
    const organization = await getCurrentOrganization();
    organizationId = organization.organizationId;
  } catch (error: any) {
    const message = error?.message || "";

    if (
      message.includes("User is not assigned to an organization") ||
      message.includes("User not authenticated")
    ) {
      redirect("/onboarding");
    }

    throw error;
  }

  const resolvedSearchParams = (await searchParams) || {};
  const selectedAgent = resolvedSearchParams.agent || "all";
  const selectedDays = resolvedSearchParams.days || "7";

  const [report, agentNames] = await Promise.all([
    getManagerReport(organizationId, selectedAgent, selectedDays),
    getAgentNames(organizationId),
  ]);

  const pdfParams = new URLSearchParams({
    agent: selectedAgent,
    days: selectedDays,
  });

  return (
    <main className="px-6 py-16">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <a
            href="/dashboard"
            className="mb-6 inline-block text-sm text-gray-400 hover:text-white"
          >
            ÃƒÂ¢Ã¢â‚¬Â Ã‚Â Back to Dashboard
          </a>

          <div className="mb-3 inline-flex items-center rounded-full border border-indigo-400/20 bg-indigo-400/10 px-3 py-1 text-xs font-medium text-indigo-300">
            Manager Coaching Report
          </div>

          <h1 className="mb-3 text-4xl font-bold tracking-tight">
            Weekly Support Coaching Report
          </h1>

          <p className="mb-6 text-gray-400">
            AI-generated leadership summary based on analyzed support conversations.
          </p>

          <form
            method="get"
            className="mb-6 rounded-2xl border border-white/10 bg-[#081225] p-5"
          >
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">
                  Date Range
                </label>
                <select
                  name="days"
                  defaultValue={selectedDays}
                  className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white"
                >
                  <option value="7">Last 7 Days</option>
                  <option value="30">Last 30 Days</option>
                  <option value="90">Last 90 Days</option>
                  <option value="365">Last 365 Days</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">
                  Agent
                </label>
                <select
                  name="agent"
                  defaultValue={selectedAgent}
                  className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white"
                >
                  <option value="all">All Agents</option>
                  {agentNames.map((agent) => (
                    <option key={agent} value={agent}>
                      {agent}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full rounded-xl border border-white/10 bg-white px-5 py-3 font-semibold text-black hover:bg-gray-200"
                >
                  Apply Filters
                </button>
              </div>

              <div className="flex items-end">
                <a
                  href={`/api/manager-report-pdf?${pdfParams.toString()}`}
                  className="inline-block w-full rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-3 text-center font-semibold text-emerald-300 hover:bg-emerald-500/20"
                >
                  Download PDF
                </a>
              </div>
            </div>
          </form>
        </div>

        <div className="rounded-3xl border border-white/10 bg-[#081225] p-8">
          <div className="space-y-3">{renderReport(report)}</div>
        </div>
      </div>
    </main>
  );
}
