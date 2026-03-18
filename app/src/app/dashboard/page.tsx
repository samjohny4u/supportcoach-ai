import { createClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "../../lib/supabaseServer";
import { getCurrentOrganization } from "../../lib/currentOrganization";
import TrendChart from "../../components/TempChart";
import CopyButton from "../../components/CopyButton";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type ChatAnalysis = {
  id: string;
  file_name: string;
  agent_name: string | null;
  customer_name: string | null;
  chat_type: string | null;
  issue_summary: string | null;
  quick_summary: string | null;
  copy_coaching_message: string | null;
  attention_priority: string | null;
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
  excluded?: boolean | null;
};

type AgentSummary = {
  agentName: string;
  chatsCount: number;
  avgEmpathy: number;
  avgClarity: number;
  avgOwnership: number;
  avgResolutionQuality: number;
  avgProfessionalism: number;
  highChurnCount: number;
  deletedMessageCount: number;
  missedConfirmationCount: number;
  prematureCloseCount: number;
};

type TeamSummaryResult = {
  headline: string;
  top_strengths: string[];
  top_coaching_opportunities: string[];
  risk_patterns: string[];
  manager_focus_next: string[];
  agents_needing_attention: string[];
};

type ManagerInsightsResult = {
  headline: string;
  what_is_going_wrong: string[];
  repeating_patterns: string[];
  agents_needing_attention: string[];
  manager_focus_next: string[];
};

type TrendPoint = {
  date: string;
  empathy: number;
  clarity: number;
  ownership: number;
  resolution: number;
  professionalism: number;
};

function avg(values: Array<number | null>) {
  const filtered = values.filter((value): value is number => typeof value === "number");
  if (filtered.length === 0) return 0;
  return Number(
    (filtered.reduce((sum, value) => sum + value, 0) / filtered.length).toFixed(1)
  );
}

function countPhrases(
  chats: ChatAnalysis[],
  field: "summary_improvements" | "summary_strengths"
) {
  const counts = new Map<string, number>();

  for (const chat of chats) {
    const values = chat[field];
    if (!Array.isArray(values)) continue;

    for (const value of values) {
      const cleaned = value.trim();
      if (!cleaned) continue;
      counts.set(cleaned, (counts.get(cleaned) || 0) + 1);
    }
  }

  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
}

function getStartDate(range: string) {
  const now = new Date();

  if (range === "7d") {
    now.setDate(now.getDate() - 7);
    return now.toISOString();
  }

  if (range === "30d") {
    now.setDate(now.getDate() - 30);
    return now.toISOString();
  }

  return null;
}

function normalizeLabel(value: string | null | undefined) {
  if (!value) return "Unknown";

  const compact = value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  const specialMap: Record<string, string> = {
    "workflow confusion": "Workflow Confusion",
    "product limitation": "Product Limitation",
    support: "Support",
    "technical issue": "Technical Issue",
    "billing issue": "Billing Issue",
    "accounting issue": "Accounting Issue",
    "onboarding help": "Onboarding Help",
    "feature limitation": "Feature Limitation",
  };

  if (specialMap[compact]) return specialMap[compact];

  return compact.replace(/\b\w/g, (char) => char.toUpperCase());
}

function isKnownAgentName(name: string | null | undefined) {
  if (!name) return false;
  const cleaned = name.trim().toLowerCase();
  return cleaned !== "" && cleaned !== "unknown" && cleaned !== "null";
}

function getPriorityClasses(priority: string | null | undefined) {
  const normalized = (priority || "").toLowerCase();

  if (normalized === "high") {
    return "border border-red-500/20 bg-red-500/15 text-red-300";
  }

  if (normalized === "medium") {
    return "border border-yellow-500/20 bg-yellow-500/15 text-yellow-300";
  }

  return "border border-emerald-500/20 bg-emerald-500/15 text-emerald-300";
}

function getRiskClasses(risk: string | null | undefined) {
  const normalized = (risk || "").toLowerCase();

  if (normalized === "high") {
    return "border border-red-500/20 bg-red-500/15 text-red-300";
  }

  if (normalized === "medium") {
    return "border border-yellow-500/20 bg-yellow-500/15 text-yellow-300";
  }

  return "border border-emerald-500/20 bg-emerald-500/15 text-emerald-300";
}

function getSignalClasses(type: "danger" | "warning" | "info") {
  if (type === "danger") {
    return "rounded-full border border-red-500/20 bg-red-500/15 px-3 py-1 text-xs font-semibold text-red-300";
  }

  if (type === "warning") {
    return "rounded-full border border-yellow-500/20 bg-yellow-500/15 px-3 py-1 text-xs font-semibold text-yellow-300";
  }

  return "rounded-full border border-indigo-500/20 bg-indigo-500/15 px-3 py-1 text-xs font-semibold text-indigo-300";
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const width = `${Math.max(0, Math.min(100, value * 10))}%`;

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-gray-300">{label}</span>
        <span className="font-semibold text-white">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-white/10">
        <div className="h-2 rounded-full bg-indigo-400" style={{ width }} />
      </div>
    </div>
  );
}

function buildTrendData(chats: ChatAnalysis[]): TrendPoint[] {
  const grouped: Record<string, ChatAnalysis[]> = {};

  for (const row of chats) {
    const date = new Date(row.created_at).toISOString().split("T")[0];
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(row);
  }

  return Object.entries(grouped).map(([date, rows]) => {
    const avgKey = (key: keyof ChatAnalysis) => {
      const values = rows
        .map((r) => r[key])
        .filter((value): value is number => typeof value === "number");

      if (values.length === 0) return 0;

      return values.reduce((a, b) => a + b, 0) / values.length;
    };

    return {
      date,
      empathy: avgKey("empathy"),
      clarity: avgKey("clarity"),
      ownership: avgKey("ownership"),
      resolution: avgKey("resolution_quality"),
      professionalism: avgKey("professionalism"),
    };
  });
}

async function getTeamAISummary(payload: unknown): Promise<TeamSummaryResult | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const res = await fetch(`${baseUrl}/api/team-summary`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ summaries: payload }),
      cache: "no-store",
    });

    if (!res.ok) return null;

    const data = await res.json();
    return data.result as TeamSummaryResult;
  } catch (error) {
    console.error("AI summary fetch error:", error);
    return null;
  }
}

async function getManagerInsights(payload: unknown): Promise<ManagerInsightsResult | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const res = await fetch(`${baseUrl}/api/manager-insights`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ summaries: payload }),
      cache: "no-store",
    });

    if (!res.ok) return null;

    const data = await res.json();
    return data.result as ManagerInsightsResult;
  } catch (error) {
    console.error("Manager insights fetch error:", error);
    return null;
  }
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ agent?: string; range?: string; view?: string }>;
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
  const selectedRange = resolvedSearchParams.range || "all";
  const selectedView = resolvedSearchParams.view === "attention" ? "attention" : "all";
  const isSingleAgentView = selectedAgent !== "all";
  const isAttentionView = selectedView === "attention";

  let query = supabase
    .from("chat_analyses")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("excluded", false)
    .order("created_at", { ascending: false });

  const startDate = getStartDate(selectedRange);
  if (startDate) {
    query = query.gte("created_at", startDate);
  }

  if (isSingleAgentView) {
    query = query.eq("agent_name", selectedAgent);
  }

  if (isAttentionView) {
    query = query.eq("attention_priority", "high");
  }

  const { data, error } = await query;

  const { data: allAgentsData } = await supabase
    .from("chat_analyses")
    .select("agent_name")
    .eq("organization_id", organizationId)
    .eq("excluded", false);

  const { count: excludedCount } = await supabase
    .from("chat_analyses")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("excluded", true);

  const allAgentNames = Array.from(
    new Set(
      (allAgentsData || [])
        .map((row) => row.agent_name)
        .filter((name): name is string => isKnownAgentName(name))
    )
  ).sort();

  if (error) {
    return (
      <main className="px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <h1 className="mb-4 text-4xl font-bold">Manager Dashboard</h1>
          <p className="text-red-400">Failed to load dashboard data.</p>
          <pre className="mt-4 text-sm text-gray-400">{error.message}</pre>
        </div>
      </main>
    );
  }

  const chats = (data || []) as ChatAnalysis[];
  const trendData = buildTrendData(chats);

  const totalChats = chats.length;
  const uniqueAgents = new Set(
    chats
      .map((chat) => chat.agent_name)
      .filter((name): name is string => isKnownAgentName(name))
  ).size;

  const highChurnCount = chats.filter(
    (chat) => (chat.churn_risk || "").toLowerCase() === "high"
  ).length;

  const highAttentionCount = chats.filter(
    (chat) => (chat.attention_priority || "").toLowerCase() === "high"
  ).length;

  const mediumAttentionCount = chats.filter(
    (chat) => (chat.attention_priority || "").toLowerCase() === "medium"
  ).length;

  const grouped = new Map<string, ChatAnalysis[]>();

  for (const chat of chats) {
    const rawAgentName = chat.agent_name;
    if (!isKnownAgentName(rawAgentName)) continue;

    const agentName = rawAgentName!.trim();
    if (!grouped.has(agentName)) {
      grouped.set(agentName, []);
    }
    grouped.get(agentName)!.push(chat);
  }

  const agentSummaries: AgentSummary[] = Array.from(grouped.entries()).map(
    ([agentName, items]) => ({
      agentName,
      chatsCount: items.length,
      avgEmpathy: avg(items.map((item) => item.empathy)),
      avgClarity: avg(items.map((item) => item.clarity)),
      avgOwnership: avg(items.map((item) => item.ownership)),
      avgResolutionQuality: avg(items.map((item) => item.resolution_quality)),
      avgProfessionalism: avg(items.map((item) => item.professionalism)),
      highChurnCount: items.filter(
        (item) => (item.churn_risk || "").toLowerCase() === "high"
      ).length,
      deletedMessageCount: items.filter((item) => item.deleted_message).length,
      missedConfirmationCount: items.filter((item) => item.missed_confirmation).length,
      prematureCloseCount: items.filter((item) => item.premature_close).length,
    })
  );

  agentSummaries.sort((a, b) => b.avgEmpathy - a.avgEmpathy);

  const topChatTypes = (() => {
    const counts = new Map<string, number>();

    for (const chat of chats) {
      const key = normalizeLabel(chat.chat_type);
      counts.set(key, (counts.get(key) || 0) + 1);
    }

    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  })();

  const topImprovementAreas = countPhrases(chats, "summary_improvements").slice(0, 5);
  const topStrengths = countPhrases(chats, "summary_strengths").slice(0, 5);

  const flagSummary = {
    deletedMessages: chats.filter((chat) => chat.deleted_message).length,
    missedConfirmations: chats.filter((chat) => chat.missed_confirmation).length,
    prematureCloses: chats.filter((chat) => chat.premature_close).length,
    productLimitationChats: chats.filter((chat) => chat.product_limitation_chat).length,
    customerFrustrationChats: chats.filter((chat) => chat.customer_frustration_present).length,
    escalationDoneWell: chats.filter((chat) => chat.escalation_done_well).length,
  };

  const agentNeedingMostCoaching =
    [...agentSummaries].sort((a, b) => {
      const aScore =
        a.missedConfirmationCount + a.prematureCloseCount + a.deletedMessageCount;
      const bScore =
        b.missedConfirmationCount + b.prematureCloseCount + b.deletedMessageCount;
      return bScore - aScore;
    })[0] || null;

  const recentChats = chats.slice(0, 10);
  const attentionChats = chats
    .filter((chat) => {
      const priority = (chat.attention_priority || "").toLowerCase();
      return priority === "high";
    })
    .slice(0, 8);

  const teamAverageScores = {
    empathy: avg(chats.map((c) => c.empathy)),
    clarity: avg(chats.map((c) => c.clarity)),
    ownership: avg(chats.map((c) => c.ownership)),
    resolutionQuality: avg(chats.map((c) => c.resolution_quality)),
    professionalism: avg(chats.map((c) => c.professionalism)),
  };

  const aiSummaryPayload = {
    totalChats,
    uniqueAgents,
    highChurnCount,
    topChatTypes,
    topImprovementAreas,
    topStrengths,
    flagSummary,
    agentSummaries: agentSummaries.map((agent) => ({
      agentName: agent.agentName,
      chatsCount: agent.chatsCount,
      avgEmpathy: agent.avgEmpathy,
      avgClarity: agent.avgClarity,
      avgOwnership: agent.avgOwnership,
      avgResolutionQuality: agent.avgResolutionQuality,
      avgProfessionalism: agent.avgProfessionalism,
      highChurnCount: agent.highChurnCount,
      deletedMessageCount: agent.deletedMessageCount,
      missedConfirmationCount: agent.missedConfirmationCount,
      prematureCloseCount: agent.prematureCloseCount,
    })),
    viewContext: isSingleAgentView ? "single-agent" : "team",
    selectedAgent: isSingleAgentView ? selectedAgent : null,
  };

  const aiWeeklySummary = await getTeamAISummary(aiSummaryPayload);
  const managerInsights = await getManagerInsights(aiSummaryPayload);

  const pageTitle = isSingleAgentView
    ? `${selectedAgent} Coaching Dashboard`
    : "Manager Dashboard";

  const pageSubtitle = isSingleAgentView
    ? `Focused coaching and QA view for ${selectedAgent} based on saved transcript analysis.`
    : "Real-time view of saved support coaching results, team behavior patterns, and performance insights generated from chat transcript analysis.";

  const summaryTitle = isSingleAgentView
    ? `AI Coaching Summary for ${selectedAgent}`
    : "AI Weekly Team Summary";

  const summaryStrengthsTitle = isSingleAgentView
    ? `${selectedAgent} Strength Highlights`
    : "Top Strengths";

  const summaryOpportunitiesTitle = isSingleAgentView
    ? `${selectedAgent} Coaching Opportunities`
    : "Top Coaching Opportunities";

  const summaryRiskTitle = isSingleAgentView
    ? `${selectedAgent} Risk Patterns`
    : "Risk Patterns";

  const summaryFocusTitle = isSingleAgentView
    ? `Coaching Focus for ${selectedAgent}`
    : "Manager Focus Next";

  const summaryAttentionTitle = isSingleAgentView
    ? "Related Attention Signals"
    : "Agents Needing Attention";

  const trendSectionTitle = isSingleAgentView
    ? `${selectedAgent} Quality Trends`
    : "Support Quality Trends";

  const trendSectionSubtitle = isSingleAgentView
    ? `Trend view for ${selectedAgent} across saved chats.`
    : undefined;

  const patternAnalyzerTitle = isSingleAgentView
    ? "Coaching Pattern Analyzer"
    : "AI Team Pattern Analyzer";

  const coachingInsightsTitle = isSingleAgentView
    ? "Coaching Insights"
    : "Team Coaching Insights";

  const focusCardTitle = isSingleAgentView
    ? `Key Focus Areas for ${selectedAgent}`
    : "Agent Needing Most Coaching";

  const topChatTypesTitle = isSingleAgentView
    ? `${selectedAgent} Top Chat Types`
    : "Top Chat Types";

  const leaderboardTitle = isSingleAgentView
    ? "Filtered Agent Summary"
    : "Agent Leaderboard";

  const performanceSummaryTitle = isSingleAgentView
    ? `${selectedAgent} Performance Summary`
    : "Agent Performance Summary";

  const recentChatsTitle = isSingleAgentView
    ? `${selectedAgent} Recent Analyzed Chats`
    : "Recent Analyzed Chats";

  const attentionSectionTitle = isSingleAgentView
    ? `${selectedAgent} Chats Needing Attention`
    : "Chats Needing Attention";

  const attentionViewDescription = isAttentionView
    ? "Showing only chats where attention priority is high."
    : "Use the view filter to focus only on high-priority chats.";

  const managerInsightsTitle = isSingleAgentView
    ? `${selectedAgent} Manager Coaching Insights`
    : "Manager Coaching Insights";

  return (
    <main className="px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10">
          <div className="mb-3 inline-flex items-center rounded-full border border-indigo-400/20 bg-indigo-400/10 px-3 py-1 text-xs font-medium text-indigo-300">
            {isSingleAgentView ? "Agent Coaching View" : "Support Intelligence Dashboard"}
          </div>

          <h1 className="mb-3 text-4xl font-bold tracking-tight">{pageTitle}</h1>

          <p className="max-w-3xl text-gray-300">{pageSubtitle}</p>
        </div>

        <form className="mb-8 rounded-3xl border border-white/10 bg-[#081225] p-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-300">
                Date Range
              </label>
              <select
                name="range"
                defaultValue={selectedRange}
                className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white"
              >
                <option value="all">All Time</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
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
                {allAgentNames.map((agent) => (
                  <option key={agent} value={agent}>
                    {agent}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-300">
                View
              </label>
              <select
                name="view"
                defaultValue={selectedView}
                className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white"
              >
                <option value="all">All Chats</option>
                <option value="attention">Chats Needing Attention</option>
              </select>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <button
                type="submit"
                className="rounded-xl bg-white px-5 py-3 font-semibold text-black hover:bg-gray-200"
              >
                Apply Filters
              </button>

              <a
                href="/dashboard"
                className="rounded-xl border border-white/10 px-5 py-3 font-semibold text-gray-300 hover:bg-white/5 hover:text-white"
              >
                Reset
              </a>

              <a
                href={`/api/export?agent=${encodeURIComponent(
                  selectedAgent
                )}&range=${encodeURIComponent(selectedRange)}`}
                className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-3 font-semibold text-emerald-300 hover:bg-emerald-500/15"
              >
                Export CSV
              </a>

              <a
                href={`/dashboard/report?agent=${encodeURIComponent(
                  selectedAgent
                )}&days=${
                  selectedRange === "7d" ? "7" : selectedRange === "30d" ? "30" : "7"
                }`}
                className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-5 py-3 font-semibold text-indigo-300 hover:bg-indigo-500/20"
              >
                Generate Coaching Report
              </a>
            </div>
          </div>
        </form>

        <div className="mb-4 rounded-2xl border border-white/10 bg-[#081225] p-4 text-sm text-gray-300">
          {attentionViewDescription}
        </div>

        <div className="mb-6 rounded-2xl border border-white/10 bg-[#081225] p-4 text-sm text-gray-300">
          Showing {totalChats} included chats
          {typeof excludedCount === "number" && excludedCount > 0
            ? ` • ${excludedCount} excluded from reports`
            : ""}
        </div>

        <div className="mb-10 grid gap-6 md:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-[#081225] p-6">
            <p className="mb-2 text-sm text-gray-400">Chats Analyzed</p>
            <p className="text-3xl font-bold">{totalChats}</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#081225] p-6">
            <p className="mb-2 text-sm text-gray-400">
              {isSingleAgentView ? "Agents In View" : "Agents Represented"}
            </p>
            <p className="text-3xl font-bold">{uniqueAgents}</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#081225] p-6">
            <p className="mb-2 text-sm text-gray-400">High Churn Risk Chats</p>
            <p className="text-3xl font-bold text-red-400">{highChurnCount}</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#081225] p-6">
            <p className="mb-2 text-sm text-gray-400">Chats Needing Attention</p>
            <p className="text-3xl font-bold text-yellow-300">{highAttentionCount}</p>
            <p className="mt-2 text-xs text-gray-500">
              {highAttentionCount} high / {mediumAttentionCount} medium
            </p>
          </div>
        </div>

        <div className="mb-10">
          <TrendChart data={trendData} title={trendSectionTitle} subtitle={trendSectionSubtitle} />
        </div>

        <div className="mb-10 rounded-3xl border border-white/10 bg-[#081225] p-8">
          <h2 className="mb-6 text-2xl font-semibold">{managerInsightsTitle}</h2>

          {managerInsights ? (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-6 md:col-span-2">
                <p className="text-lg font-semibold text-white">
                  {managerInsights.headline}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
                <h3 className="mb-4 text-lg font-semibold">What Is Going Wrong</h3>
                <ul className="space-y-2 text-gray-300">
                  {managerInsights.what_is_going_wrong?.map((item, index) => (
                    <li key={index}>• {item}</li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
                <h3 className="mb-4 text-lg font-semibold">Repeating Patterns</h3>
                <ul className="space-y-2 text-gray-300">
                  {managerInsights.repeating_patterns?.map((item, index) => (
                    <li key={index}>• {item}</li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
                <h3 className="mb-4 text-lg font-semibold">Agents Needing Attention</h3>
                <ul className="space-y-2 text-gray-300">
                  {managerInsights.agents_needing_attention?.map((item, index) => (
                    <li key={index}>• {item}</li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
                <h3 className="mb-4 text-lg font-semibold">Manager Focus Next</h3>
                <ul className="space-y-2 text-gray-300">
                  {managerInsights.manager_focus_next?.map((item, index) => (
                    <li key={index}>• {item}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <p className="text-gray-400">Manager coaching insights could not be generated yet.</p>
          )}
        </div>

        <div className="mb-10 rounded-3xl border border-white/10 bg-[#081225] p-8">
          <h2 className="mb-6 text-2xl font-semibold">{summaryTitle}</h2>

          {aiWeeklySummary ? (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-6 md:col-span-2">
                <p className="text-lg font-semibold text-white">
                  {aiWeeklySummary.headline}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
                <h3 className="mb-4 text-lg font-semibold">{summaryStrengthsTitle}</h3>
                <ul className="space-y-2 text-gray-300">
                  {aiWeeklySummary.top_strengths?.map((item, index) => (
                    <li key={index}>• {item}</li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
                <h3 className="mb-4 text-lg font-semibold">{summaryOpportunitiesTitle}</h3>
                <ul className="space-y-2 text-gray-300">
                  {aiWeeklySummary.top_coaching_opportunities?.map((item, index) => (
                    <li key={index}>• {item}</li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
                <h3 className="mb-4 text-lg font-semibold">{summaryRiskTitle}</h3>
                <ul className="space-y-2 text-gray-300">
                  {aiWeeklySummary.risk_patterns?.map((item, index) => (
                    <li key={index}>• {item}</li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
                <h3 className="mb-4 text-lg font-semibold">{summaryFocusTitle}</h3>
                <ul className="space-y-2 text-gray-300">
                  {aiWeeklySummary.manager_focus_next?.map((item, index) => (
                    <li key={index}>• {item}</li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-6 md:col-span-2">
                <h3 className="mb-4 text-lg font-semibold">{summaryAttentionTitle}</h3>
                <ul className="space-y-2 text-gray-300">
                  {aiWeeklySummary.agents_needing_attention?.map((item, index) => (
                    <li key={index}>• {item}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <p className="text-gray-400">AI summary could not be generated yet.</p>
          )}
        </div>

        <div className="mb-10 rounded-3xl border border-white/10 bg-[#081225] p-8">
          <h2 className="mb-6 text-2xl font-semibold">
            {isSingleAgentView ? `${selectedAgent} Score Snapshot` : "Small Team Score Charts"}
          </h2>

          <div className="grid gap-6 md:grid-cols-2">
            <ScoreBar label="Empathy" value={teamAverageScores.empathy} />
            <ScoreBar label="Clarity" value={teamAverageScores.clarity} />
            <ScoreBar label="Ownership" value={teamAverageScores.ownership} />
            <ScoreBar label="Resolution Quality" value={teamAverageScores.resolutionQuality} />
            <ScoreBar label="Professionalism" value={teamAverageScores.professionalism} />
          </div>
        </div>

        <div className="mb-10 rounded-3xl border border-white/10 bg-[#081225] p-8">
          <h2 className="mb-2 text-2xl font-semibold">{attentionSectionTitle}</h2>
          <p className="mb-6 text-sm text-gray-400">
            High-priority chats based on the worker’s computed attention score.
          </p>

          <div className="space-y-4">
            {attentionChats.length === 0 ? (
              <p className="text-gray-400">No high-priority chats found in this view.</p>
            ) : (
              attentionChats.map((chat) => (
                <div
                  key={chat.id}
                  className="rounded-2xl border border-white/10 bg-black/20 p-5"
                >
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-white">
                        {isKnownAgentName(chat.agent_name) ? chat.agent_name : "Unknown Agent"} →{" "}
                        {chat.customer_name || "Unknown Customer"}
                      </p>
                      <p className="text-sm text-gray-400">{chat.file_name}</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <div
                        className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${getPriorityClasses(
                          chat.attention_priority
                        )}`}
                      >
                        {(chat.attention_priority || "low")} priority
                      </div>

                      <div
                        className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${getRiskClasses(
                          chat.churn_risk
                        )}`}
                      >
                        {(chat.churn_risk || "low")} churn risk
                      </div>
                    </div>
                  </div>

                  <p className="mb-2 text-sm text-gray-400">
                    {normalizeLabel(chat.chat_type)}
                  </p>

                  <p className="mb-3 text-gray-300">
                    {chat.quick_summary?.trim() || chat.issue_summary || "No quick summary."}
                  </p>

                  <div className="mb-4 flex flex-wrap gap-2">
                    {chat.customer_frustration_present ? (
                      <span className={getSignalClasses("danger")}>Customer Frustration</span>
                    ) : null}

                    {chat.premature_close ? (
                      <span className={getSignalClasses("warning")}>Premature Close</span>
                    ) : null}

                    {chat.missed_confirmation ? (
                      <span className={getSignalClasses("warning")}>Missed Confirmation</span>
                    ) : null}

                    {chat.product_limitation_chat ? (
                      <span className={getSignalClasses("info")}>Product Limitation</span>
                    ) : null}

                    {String(chat.churn_risk || "").toLowerCase() === "high" ? (
                      <span className={getSignalClasses("danger")}>High Churn Risk</span>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {chat.copy_coaching_message?.trim() ? (
                      <CopyButton
                        text={chat.copy_coaching_message}
                        idleLabel="Copy Coaching Message"
                        className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/15"
                      />
                    ) : null}

                    <a
                      href={`/analysis/${chat.id}`}
                      className="text-sm font-semibold text-indigo-300 hover:text-indigo-200"
                    >
                      View Analysis →
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mb-10 rounded-3xl border border-white/10 bg-[#081225] p-8">
          <h2 className="mb-6 text-2xl font-semibold">{patternAnalyzerTitle}</h2>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-black/20 p-6">
              <h3 className="mb-4 text-lg font-semibold">
                {isSingleAgentView ? "Recurring Coaching Opportunities" : "Top Coaching Opportunities"}
              </h3>

              <ul className="space-y-2 text-gray-300">
                {topImprovementAreas.length === 0 ? (
                  <li>No data yet.</li>
                ) : (
                  topImprovementAreas.map(([item, count]) => (
                    <li key={item}>
                      • {item} — <span className="text-gray-500">{count} chats</span>
                    </li>
                  ))
                )}
              </ul>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/20 p-6">
              <h3 className="mb-4 text-lg font-semibold">
                {isSingleAgentView ? "Recurring Strengths" : "Top Team Strengths"}
              </h3>

              <ul className="space-y-2 text-gray-300">
                {topStrengths.length === 0 ? (
                  <li>No data yet.</li>
                ) : (
                  topStrengths.map(([item, count]) => (
                    <li key={item}>
                      • {item} — <span className="text-gray-500">{count} chats</span>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </div>

        <div className="mb-10 grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-[#081225] p-8">
            <h2 className="mb-4 text-2xl font-semibold">{coachingInsightsTitle}</h2>

            <ul className="space-y-2 text-gray-300">
              <li>Deleted Messages: {flagSummary.deletedMessages}</li>
              <li>Missed Confirmations: {flagSummary.missedConfirmations}</li>
              <li>Premature Closes: {flagSummary.prematureCloses}</li>
              <li>Product Limitation Chats: {flagSummary.productLimitationChats}</li>
              <li>Customer Frustration Signals: {flagSummary.customerFrustrationChats}</li>
              <li>Good Escalations: {flagSummary.escalationDoneWell}</li>
            </ul>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#081225] p-8">
            <h2 className="mb-4 text-2xl font-semibold">{focusCardTitle}</h2>

            {isSingleAgentView ? (
              <div className="space-y-3 text-gray-300">
                <p className="text-lg font-semibold">{selectedAgent}</p>
                <p>
                  This filtered view highlights the main coaching patterns, strengths,
                  and support risks currently visible for {selectedAgent}.
                </p>
                <p>
                  Recommended focus: use the summary, score trends, and recent chats below
                  to guide 1:1 coaching.
                </p>
              </div>
            ) : agentNeedingMostCoaching ? (
              <div className="space-y-3 text-gray-300">
                <p className="text-lg font-semibold">
                  {agentNeedingMostCoaching.agentName}
                </p>

                <p>
                  This agent currently shows the highest number of missed confirmations,
                  premature closes, and deleted message events across analyzed chats.
                </p>

                <p>
                  Recommended focus: reassurance, closing confirmation, and stronger
                  conversation ownership.
                </p>
              </div>
            ) : (
              <p className="text-gray-400">No data yet.</p>
            )}
          </div>
        </div>

        <div className="mb-10 grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-[#081225] p-8">
            <h2 className="mb-4 text-2xl font-semibold">{topChatTypesTitle}</h2>

            <ul className="space-y-2 text-gray-300">
              {topChatTypes.length === 0 ? (
                <li>No data yet.</li>
              ) : (
                topChatTypes.map(([theme, count]) => (
                  <li key={theme}>
                    • {theme} — {count}
                  </li>
                ))
              )}
            </ul>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#081225] p-8">
            <h2 className="mb-4 text-2xl font-semibold">{leaderboardTitle}</h2>

            <ul className="space-y-2 text-gray-300">
              {agentSummaries.length === 0 ? (
                <li>No data yet.</li>
              ) : (
                agentSummaries.map((agent) => (
                  <li key={agent.agentName}>
                    <a
                      href={`/dashboard/agent/${encodeURIComponent(agent.agentName)}`}
                      className="hover:text-white"
                    >
                      • {agent.agentName} — Empathy {agent.avgEmpathy}
                    </a>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>

        <div className="mb-10 rounded-3xl border border-white/10 bg-[#081225] p-8">
          <h2 className="mb-6 text-2xl font-semibold">{performanceSummaryTitle}</h2>

          <div className="grid gap-6 md:grid-cols-2">
            {agentSummaries.length === 0 ? (
              <p className="text-gray-400">No agent data yet.</p>
            ) : (
              agentSummaries.map((agent) => (
                <div
                  key={agent.agentName}
                  className="rounded-2xl border border-white/10 bg-black/20 p-6"
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h3 className="text-2xl font-bold">{agent.agentName}</h3>
                    <a
                      href={`/dashboard/agent/${encodeURIComponent(agent.agentName)}`}
                      className="text-sm text-indigo-300 hover:text-indigo-200"
                    >
                      View Agent →
                    </a>
                  </div>

                  <div className="mb-5 grid gap-3 text-sm text-gray-300">
                    <div className="flex justify-between">
                      <span>Chats Reviewed</span>
                      <span>{agent.chatsCount}</span>
                    </div>

                    <div className="flex justify-between">
                      <span>High Churn Risk</span>
                      <span>{agent.highChurnCount}</span>
                    </div>

                    <div className="flex justify-between">
                      <span>Deleted Messages</span>
                      <span>{agent.deletedMessageCount}</span>
                    </div>

                    <div className="flex justify-between">
                      <span>Missed Confirmations</span>
                      <span>{agent.missedConfirmationCount}</span>
                    </div>

                    <div className="flex justify-between">
                      <span>Premature Closes</span>
                      <span>{agent.prematureCloseCount}</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <ScoreBar label="Empathy" value={agent.avgEmpathy} />
                    <ScoreBar label="Clarity" value={agent.avgClarity} />
                    <ScoreBar label="Ownership" value={agent.avgOwnership} />
                    <ScoreBar label="Resolution Quality" value={agent.avgResolutionQuality} />
                    <ScoreBar label="Professionalism" value={agent.avgProfessionalism} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-[#081225] p-8">
          <h2 className="mb-6 text-2xl font-semibold">{recentChatsTitle}</h2>

          <div className="space-y-4">
            {recentChats.length === 0 ? (
              <p className="text-gray-400">No saved chat analyses yet.</p>
            ) : (
              recentChats.map((chat) => (
                <div
                  key={chat.id}
                  className="rounded-2xl border border-white/10 bg-black/20 p-5"
                >
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-white">
                        {isKnownAgentName(chat.agent_name) ? chat.agent_name : "Unknown Agent"} →{" "}
                        {chat.customer_name || "Unknown Customer"}
                      </p>
                      <p className="text-sm text-gray-400">{chat.file_name}</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <div
                        className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${getPriorityClasses(
                          chat.attention_priority
                        )}`}
                      >
                        {(chat.attention_priority || "low")} priority
                      </div>

                      <div
                        className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${getRiskClasses(
                          chat.churn_risk
                        )}`}
                      >
                        {(chat.churn_risk || "low")} churn risk
                      </div>
                    </div>
                  </div>

                  <p className="mb-2 text-sm text-gray-400">
                    {normalizeLabel(chat.chat_type)}
                  </p>

                  <p className="mb-3 text-gray-300">
                    {chat.quick_summary?.trim() || "No quick summary."}
                  </p>

                  <div className="mb-4 flex flex-wrap gap-4 text-sm text-gray-400">
                    <span>Empathy: {chat.empathy ?? "-"}</span>
                    <span>Clarity: {chat.clarity ?? "-"}</span>
                    <span>Ownership: {chat.ownership ?? "-"}</span>
                    <span>Resolution: {chat.resolution_quality ?? "-"}</span>
                    <span>Professionalism: {chat.professionalism ?? "-"}</span>
                  </div>

                  <a
                    href={`/analysis/${chat.id}`}
                    className="text-sm font-semibold text-indigo-300 hover:text-indigo-200"
                  >
                    View Analysis →
                  </a>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}