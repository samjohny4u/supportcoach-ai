// src/app/dashboard/topics/page.tsx
import { createClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "../../../lib/supabaseServer";
import { getCurrentOrganization } from "../../../lib/currentOrganization";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type TopicStatsResponse = {
  range: string;
  organization_id: string;
  overall: {
    total_chats: number;
    topic_count: number;
    average_scores: {
      empathy: number;
      clarity: number;
      ownership: number;
      resolution_quality: number;
      professionalism: number;
    };
    customer_frustration_rate: number;
    escalation_rate: number;
    premature_close_rate: number;
    product_limitation_rate: number;
  };
  topics: Array<{
    topic: string;
    total_chats: number;
    support_volume_percentage: number;
    average_scores: {
      empathy: number;
      clarity: number;
      ownership: number;
      resolution_quality: number;
      professionalism: number;
    };
    customer_frustration_rate: number;
    escalation_rate: number;
    premature_close_rate: number;
    product_limitation_rate: number;
    churn_risk_distribution: {
      low: number;
      medium: number;
      high: number;
    };
    attention_priority_distribution: {
      low: number;
      medium: number;
      high: number;
    };
    has_limited_data: boolean;
  }>;
};

type ChatAnalysisRow = {
  id: string;
  organization_id: string;
  chat_type: string | null;
  attention_priority: string | null;
  churn_risk: string | null;
  empathy: number | null;
  clarity: number | null;
  ownership: number | null;
  resolution_quality: number | null;
  professionalism: number | null;
  customer_frustration_present: boolean | null;
  escalation_done_well: boolean | null;
  premature_close: boolean | null;
  product_limitation_chat: boolean | null;
  created_at: string;
};

function avg(values: Array<number | null | undefined>) {
  const filtered = values.filter((value): value is number => typeof value === "number");
  if (filtered.length === 0) return 0;

  return Number(
    (filtered.reduce((sum, value) => sum + value, 0) / filtered.length).toFixed(1)
  );
}

function percent(count: number, total: number) {
  if (!total) return 0;
  return Number(((count / total) * 100).toFixed(1));
}

function normalizeTopic(value: string | null | undefined) {
  const cleaned = String(value || "").trim();
  return cleaned || "Unknown";
}

function formatTopicLabel(value: string) {
  return value
    .trim()
    .replace(/_/g, " ")
    .split(/\s+/)
    .map((word) => {
      if (!word) return word;

      return word
        .split("/")
        .map((part) => {
          if (!part) return part;
          return part.charAt(0).toUpperCase() + part.slice(1);
        })
        .join("/");
    })
    .join(" ");
}

function normalizeRisk(value: string | null | undefined): "low" | "medium" | "high" {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  if (normalized === "high") return "high";
  if (normalized === "medium") return "medium";
  return "low";
}

function normalizePriority(value: string | null | undefined): "low" | "medium" | "high" {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  if (normalized === "high") return "high";
  if (normalized === "medium") return "medium";
  return "low";
}

function getDateRange(range: string) {
  const now = new Date();

  if (range === "7d") {
    const start = new Date(now);
    start.setDate(start.getDate() - 7);
    return {
      start: start.toISOString(),
      end: null as string | null,
    };
  }

  if (range === "30d") {
    const start = new Date(now);
    start.setDate(start.getDate() - 30);
    return {
      start: start.toISOString(),
      end: null as string | null,
    };
  }

  if (range === "this-month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      start: start.toISOString(),
      end: null as string | null,
    };
  }

  if (range === "last-month") {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 1);

    return {
      start: start.toISOString(),
      end: end.toISOString(),
    };
  }

  return {
    start: null as string | null,
    end: null as string | null,
  };
}

function getRiskLevel(value: number) {
  if (value >= 75) return "high";
  if (value >= 40) return "medium";
  return "low";
}

function getRiskClasses(level: "low" | "medium" | "high") {
  if (level === "high") {
    return "border border-red-500/20 bg-red-500/15 text-red-300";
  }

  if (level === "medium") {
    return "border border-yellow-500/20 bg-yellow-500/15 text-yellow-300";
  }

  return "border border-emerald-500/20 bg-emerald-500/15 text-emerald-300";
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

function RatePill({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  const level = getRiskLevel(value);

  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
      <div className="mb-1 text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div
        className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold uppercase ${getRiskClasses(
          level
        )}`}
      >
        {value}%
      </div>
    </div>
  );
}

export default async function TopicsDashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ range?: string }>;
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
  const selectedRange = resolvedSearchParams.range || "all";
  const { start, end } = getDateRange(selectedRange);

  let query = supabase
    .from("chat_analyses")
    .select(
      [
        "id",
        "organization_id",
        "chat_type",
        "attention_priority",
        "churn_risk",
        "empathy",
        "clarity",
        "ownership",
        "resolution_quality",
        "professionalism",
        "customer_frustration_present",
        "escalation_done_well",
        "premature_close",
        "product_limitation_chat",
        "created_at",
      ].join(", ")
    )
    .eq("organization_id", organizationId)
    .neq("excluded", true)
    .order("created_at", { ascending: false });

  if (start) {
    query = query.gte("created_at", start);
  }

  if (end) {
    query = query.lt("created_at", end);
  }

  const { data, error } = await query;

  let fetchError: string | null = null;
  let responseData: TopicStatsResponse | null = null;

  if (error) {
    fetchError = error.message;
  } else {
    const rawRows = Array.isArray(data) ? (data as unknown[]) : [];

    const rows: ChatAnalysisRow[] = rawRows.map((raw) => {
      const row = raw as Record<string, unknown>;

      return {
        id: String(row["id"] ?? ""),
        organization_id: String(row["organization_id"] ?? ""),
        chat_type: typeof row["chat_type"] === "string" ? row["chat_type"] : null,
        attention_priority:
          typeof row["attention_priority"] === "string" ? row["attention_priority"] : null,
        churn_risk: typeof row["churn_risk"] === "string" ? row["churn_risk"] : null,
        empathy: typeof row["empathy"] === "number" ? row["empathy"] : null,
        clarity: typeof row["clarity"] === "number" ? row["clarity"] : null,
        ownership: typeof row["ownership"] === "number" ? row["ownership"] : null,
        resolution_quality:
          typeof row["resolution_quality"] === "number" ? row["resolution_quality"] : null,
        professionalism:
          typeof row["professionalism"] === "number" ? row["professionalism"] : null,
        customer_frustration_present:
          typeof row["customer_frustration_present"] === "boolean"
            ? row["customer_frustration_present"]
            : null,
        escalation_done_well:
          typeof row["escalation_done_well"] === "boolean"
            ? row["escalation_done_well"]
            : null,
        premature_close:
          typeof row["premature_close"] === "boolean" ? row["premature_close"] : null,
        product_limitation_chat:
          typeof row["product_limitation_chat"] === "boolean"
            ? row["product_limitation_chat"]
            : null,
        created_at: String(row["created_at"] ?? ""),
      };
    });

    const totalChats = rows.length;
    const grouped = new Map<string, ChatAnalysisRow[]>();

    for (const row of rows) {
      const topic = normalizeTopic(row.chat_type);

      if (!grouped.has(topic)) {
        grouped.set(topic, []);
      }

      grouped.get(topic)!.push(row);
    }

    const topics = Array.from(grouped.entries())
      .map(([topic, topicRows]) => {
        const total = topicRows.length;

        const frustrationCount = topicRows.filter(
          (row) => row.customer_frustration_present === true
        ).length;

        const escalationCount = topicRows.filter(
          (row) => row.escalation_done_well === true
        ).length;

        const prematureCloseCount = topicRows.filter(
          (row) => row.premature_close === true
        ).length;

        const productLimitationCount = topicRows.filter(
          (row) => row.product_limitation_chat === true
        ).length;

        const churnRiskDistribution = {
          low: topicRows.filter((row) => normalizeRisk(row.churn_risk) === "low").length,
          medium: topicRows.filter((row) => normalizeRisk(row.churn_risk) === "medium").length,
          high: topicRows.filter((row) => normalizeRisk(row.churn_risk) === "high").length,
        };

        const attentionPriorityDistribution = {
          low: topicRows.filter(
            (row) => normalizePriority(row.attention_priority) === "low"
          ).length,
          medium: topicRows.filter(
            (row) => normalizePriority(row.attention_priority) === "medium"
          ).length,
          high: topicRows.filter(
            (row) => normalizePriority(row.attention_priority) === "high"
          ).length,
        };

        return {
          topic,
          total_chats: total,
          support_volume_percentage: percent(total, totalChats),
          average_scores: {
            empathy: avg(topicRows.map((row) => row.empathy)),
            clarity: avg(topicRows.map((row) => row.clarity)),
            ownership: avg(topicRows.map((row) => row.ownership)),
            resolution_quality: avg(topicRows.map((row) => row.resolution_quality)),
            professionalism: avg(topicRows.map((row) => row.professionalism)),
          },
          customer_frustration_rate: percent(frustrationCount, total),
          escalation_rate: percent(escalationCount, total),
          premature_close_rate: percent(prematureCloseCount, total),
          product_limitation_rate: percent(productLimitationCount, total),
          churn_risk_distribution: churnRiskDistribution,
          attention_priority_distribution: attentionPriorityDistribution,
          has_limited_data: total < 5,
        };
      })
      .sort((a, b) => b.total_chats - a.total_chats);

    responseData = {
      range: selectedRange,
      organization_id: organizationId,
      overall: {
        total_chats: totalChats,
        topic_count: topics.length,
        average_scores: {
          empathy: avg(rows.map((row) => row.empathy)),
          clarity: avg(rows.map((row) => row.clarity)),
          ownership: avg(rows.map((row) => row.ownership)),
          resolution_quality: avg(rows.map((row) => row.resolution_quality)),
          professionalism: avg(rows.map((row) => row.professionalism)),
        },
        customer_frustration_rate: percent(
          rows.filter((row) => row.customer_frustration_present === true).length,
          totalChats
        ),
        escalation_rate: percent(
          rows.filter((row) => row.escalation_done_well === true).length,
          totalChats
        ),
        premature_close_rate: percent(
          rows.filter((row) => row.premature_close === true).length,
          totalChats
        ),
        product_limitation_rate: percent(
          rows.filter((row) => row.product_limitation_chat === true).length,
          totalChats
        ),
      },
      topics,
    };
  }

  const topics = responseData?.topics || [];
  const overall = responseData?.overall || null;
  const topVolumeTopics = topics.slice(0, 10);
  const highFrictionTopics = [...topics]
    .sort((a, b) => b.customer_frustration_rate - a.customer_frustration_rate)
    .slice(0, 8);
  const lowResolutionTopics = [...topics]
    .sort((a, b) => a.average_scores.resolution_quality - b.average_scores.resolution_quality)
    .slice(0, 8);

  const coachingPatterns: string[] = [];

  if (overall) {
    if (overall.customer_frustration_rate >= 60) {
      coachingPatterns.push("Customers frequently show frustration across topics.");
    }

    if (overall.premature_close_rate >= 25) {
      coachingPatterns.push("Premature chat closure appears across multiple topics.");
    }

    if (overall.escalation_rate <= 10 && overall.customer_frustration_rate >= 50) {
      coachingPatterns.push(
        "Low escalation combined with high frustration suggests escalation decisions may be delayed."
      );
    }

    if (
      overall.average_scores.resolution_quality > 0 &&
      overall.average_scores.resolution_quality <= 5
    ) {
      coachingPatterns.push(
        "Resolution quality across topics is trending below expected levels."
      );
    }

    if (overall.average_scores.empathy > 0 && overall.average_scores.empathy <= 5) {
      coachingPatterns.push("Empathy appears consistently soft across multiple topics.");
    }
  }

  return (
    <main className="px-6 py-16">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10">
          <div className="mb-3 inline-flex items-center rounded-full border border-indigo-400/20 bg-indigo-400/10 px-3 py-1 text-xs font-medium text-indigo-300">
            Professional Tier Feature
          </div>

          <h1 className="mb-3 text-4xl font-bold tracking-tight">
            Topic Intelligence Dashboard
          </h1>

          <p className="max-w-4xl text-gray-300">
            Understand what customers contact support about most often, how those topics
            perform, and where coaching attention is needed across modules and issue types.
          </p>

          <p className="mt-3 max-w-4xl text-sm text-gray-500">
            These stats are based on analyzed chats in your coaching dataset, not necessarily
            your full support volume.
          </p>
        </div>

        <form className="mb-8 rounded-3xl border border-white/10 bg-[#081225] p-6">
          <div className="flex flex-wrap items-end gap-3">
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
                <option value="this-month">This Month</option>
                <option value="last-month">Last Month</option>
              </select>
            </div>

            <button
              type="submit"
              className="rounded-xl bg-white px-5 py-3 font-semibold text-black hover:bg-gray-200"
            >
              Apply Range
            </button>

            <a
              href="/dashboard"
              className="rounded-xl border border-white/10 px-5 py-3 font-semibold text-gray-300 hover:bg-white/5 hover:text-white"
            >
              Back to Dashboard
            </a>
          </div>
        </form>

        {fetchError || !responseData || !overall ? (
          <div className="rounded-3xl border border-white/10 bg-[#081225] p-8 text-gray-400">
            {fetchError || "Topic stats could not be loaded."}
          </div>
        ) : (
          <>
            <div className="mb-10 grid gap-6 md:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-[#081225] p-6">
                <p className="mb-2 text-sm text-gray-400">Total Chats</p>
                <p className="text-3xl font-bold">{overall.total_chats}</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#081225] p-6">
                <p className="mb-2 text-sm text-gray-400">Topics Detected</p>
                <p className="text-3xl font-bold">{overall.topic_count}</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#081225] p-6">
                <p className="mb-2 text-sm text-gray-400">Frustration Rate</p>
                <p className="text-3xl font-bold text-yellow-300">
                  {overall.customer_frustration_rate}%
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#081225] p-6">
                <p className="mb-2 text-sm text-gray-400">Premature Close Rate</p>
                <p className="text-3xl font-bold text-red-400">
                  {overall.premature_close_rate}%
                </p>
              </div>
            </div>

            <div className="mb-10 rounded-3xl border border-white/10 bg-[#081225] p-8">
              <h2 className="mb-6 text-2xl font-semibold">Overall Topic Health</h2>

              <div className="grid gap-6 md:grid-cols-2">
                <ScoreBar label="Empathy" value={overall.average_scores.empathy} />
                <ScoreBar label="Clarity" value={overall.average_scores.clarity} />
                <ScoreBar label="Ownership" value={overall.average_scores.ownership} />
                <ScoreBar
                  label="Resolution Quality"
                  value={overall.average_scores.resolution_quality}
                />
                <ScoreBar
                  label="Professionalism"
                  value={overall.average_scores.professionalism}
                />
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-4">
                <RatePill
                  label="Customer Frustration Rate"
                  value={overall.customer_frustration_rate}
                />
                <RatePill label="Escalation Rate" value={overall.escalation_rate} />
                <RatePill
                  label="Premature Close Rate"
                  value={overall.premature_close_rate}
                />
                <RatePill
                  label="Product Limitation Rate"
                  value={overall.product_limitation_rate}
                />
              </div>
            </div>

            <div className="mb-10 rounded-3xl border border-white/10 bg-[#081225] p-8">
              <h2 className="mb-6 text-2xl font-semibold">Coaching Patterns</h2>

              {coachingPatterns.length === 0 ? (
                <p className="text-gray-400">No strong coaching patterns detected yet.</p>
              ) : (
                <ul className="space-y-3 text-gray-300">
                  {coachingPatterns.map((pattern) => (
                    <li key={pattern}>• {pattern}</li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mb-10 rounded-3xl border border-white/10 bg-[#081225] p-8">
              <h2 className="mb-6 text-2xl font-semibold">Top Topics by Volume</h2>

              <div className="space-y-4">
                {topVolumeTopics.length === 0 ? (
                  <p className="text-gray-400">No topic data yet.</p>
                ) : (
                  topVolumeTopics.map((topic) => (
                    <a
                      key={topic.topic}
                      href={`/dashboard/topics/${encodeURIComponent(topic.topic)}`}
                      className="block rounded-2xl border border-white/10 bg-black/20 p-5 transition hover:border-indigo-400/30 hover:bg-black/30"
                    >
                      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-lg font-semibold text-white">
                            {formatTopicLabel(topic.topic)}
                          </p>
                          <p className="text-sm text-gray-400">
                            {topic.total_chats} {topic.total_chats === 1 ? "chat" : "chats"} • {topic.support_volume_percentage}% of
                            support volume
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <div
                            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${getRiskClasses(
                              getRiskLevel(topic.customer_frustration_rate)
                            )}`}
                          >
                            {topic.customer_frustration_rate}% frustration
                          </div>

                          <div
                            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${getRiskClasses(
                              getRiskLevel(topic.premature_close_rate)
                            )}`}
                          >
                            {topic.premature_close_rate}% premature close
                          </div>
                        </div>
                      </div>

                      {topic.has_limited_data ? (
                        <p className="mb-3 text-sm text-yellow-300">
                          Based on limited data ({topic.total_chats} {topic.total_chats === 1 ? "chat" : "chats"}).
                        </p>
                      ) : null}

                      <div className="grid gap-4 text-sm text-gray-300 md:grid-cols-5">
                        <div>Empathy: {topic.average_scores.empathy}</div>
                        <div>Clarity: {topic.average_scores.clarity}</div>
                        <div>Ownership: {topic.average_scores.ownership}</div>
                        <div>Resolution: {topic.average_scores.resolution_quality}</div>
                        <div>Professionalism: {topic.average_scores.professionalism}</div>
                      </div>

                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <div className="rounded-2xl border border-white/10 bg-[#081225] p-4">
                          <p className="mb-2 text-xs uppercase tracking-wide text-gray-500">
                            Churn Risk Distribution
                          </p>
                          <div className="flex flex-wrap gap-3 text-sm">
                            <span className="text-emerald-300">
                              Low: {topic.churn_risk_distribution.low}
                            </span>
                            <span className="text-yellow-300">
                              Medium: {topic.churn_risk_distribution.medium}
                            </span>
                            <span className="text-red-300">
                              High: {topic.churn_risk_distribution.high}
                            </span>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-[#081225] p-4">
                          <p className="mb-2 text-xs uppercase tracking-wide text-gray-500">
                            Attention Priority Distribution
                          </p>
                          <div className="flex flex-wrap gap-3 text-sm">
                            <span className="text-emerald-300">
                              Low: {topic.attention_priority_distribution.low}
                            </span>
                            <span className="text-yellow-300">
                              Medium: {topic.attention_priority_distribution.medium}
                            </span>
                            <span className="text-red-300">
                              High: {topic.attention_priority_distribution.high}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 text-sm font-semibold text-indigo-300">
                        View topic drill-down →
                      </div>
                    </a>
                  ))
                )}
              </div>
            </div>

            <div className="mb-10 grid gap-6 md:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-[#081225] p-8">
                <h2 className="mb-6 text-2xl font-semibold">Highest Friction Topics</h2>

                <div className="space-y-3">
                  {highFrictionTopics.length === 0 ? (
                    <p className="text-gray-400">No topic data yet.</p>
                  ) : (
                    highFrictionTopics.map((topic) => (
                      <a
                        key={topic.topic}
                        href={`/dashboard/topics/${encodeURIComponent(topic.topic)}`}
                        className="block rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:border-indigo-400/30 hover:bg-black/30"
                      >
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <p className="font-semibold text-white">
                            {formatTopicLabel(topic.topic)}
                          </p>
                          <div
                            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${getRiskClasses(
                              getRiskLevel(topic.customer_frustration_rate)
                            )}`}
                          >
                            {topic.customer_frustration_rate}% frustration
                          </div>
                        </div>
                        <p className="text-sm text-gray-400">
                          {topic.total_chats} {topic.total_chats === 1 ? "chat" : "chats"} • Resolution{" "}
                          {topic.average_scores.resolution_quality}
                        </p>
                      </a>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-[#081225] p-8">
                <h2 className="mb-6 text-2xl font-semibold">Lowest Resolution Topics</h2>

                <div className="space-y-3">
                  {lowResolutionTopics.length === 0 ? (
                    <p className="text-gray-400">No topic data yet.</p>
                  ) : (
                    lowResolutionTopics.map((topic) => (
                      <a
                        key={topic.topic}
                        href={`/dashboard/topics/${encodeURIComponent(topic.topic)}`}
                        className="block rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:border-indigo-400/30 hover:bg-black/30"
                      >
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <p className="font-semibold text-white">
                            {formatTopicLabel(topic.topic)}
                          </p>
                          <div
                            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${getRiskClasses(
                              getRiskLevel(topic.premature_close_rate)
                            )}`}
                          >
                            {topic.premature_close_rate}% premature close
                          </div>
                        </div>
                        <p className="text-sm text-gray-400">
                          Resolution {topic.average_scores.resolution_quality} • Ownership{" "}
                          {topic.average_scores.ownership}
                        </p>
                      </a>
                    ))
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}