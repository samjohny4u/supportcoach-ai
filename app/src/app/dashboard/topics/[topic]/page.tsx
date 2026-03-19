// src/app/dashboard/topics/[topic]/page.tsx
import { createClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "../../../../lib/supabaseServer";
import { getCurrentOrganization } from "../../../../lib/currentOrganization";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type TopicAgentRow = {
  agent_name: string | null;
  empathy: number | null;
  clarity: number | null;
  ownership: number | null;
  resolution_quality: number | null;
  professionalism: number | null;
  churn_risk: string | null;
  attention_priority: string | null;
  customer_frustration_present: boolean | null;
  escalation_done_well: boolean | null;
  premature_close: boolean | null;
  product_limitation_chat: boolean | null;
  improvement_areas: string[] | null;
  summary_improvements: string[] | null;
  summary_strengths: string[] | null;
  what_you_did_well: string[] | null;
  missed_confirmation: boolean | null;
  deleted_message: boolean | null;
};

type PatternSignalKey =
  | "customer_frustration_present"
  | "premature_close"
  | "resolution_quality"
  | "empathy"
  | "missed_confirmation"
  | "ownership";

type PatternConfidence = "High" | "Medium" | "Low";

type PatternSignal = {
  key: PatternSignalKey;
  label: string;
  narrative: string;
  recommendation: string;
  detail: string;
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

function formatTopicLabel(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .map((word) => {
      if (!word) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
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

function getPatternConfidence(totalChats: number): PatternConfidence {
  if (totalChats >= 7) return "High";
  if (totalChats >= 5) return "Medium";
  return "Low";
}

function getPatternConfidenceClasses(confidence: PatternConfidence) {
  if (confidence === "High") {
    return "border border-red-500/20 bg-red-500/15 text-red-300";
  }

  if (confidence === "Medium") {
    return "border border-yellow-500/20 bg-yellow-500/15 text-yellow-300";
  }

  return "border border-sky-500/20 bg-sky-500/15 text-sky-300";
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

function countPhrases(
  rows: TopicAgentRow[],
  fields: Array<
    "improvement_areas" | "summary_improvements" | "summary_strengths" | "what_you_did_well"
  >
) {
  const counts = new Map<string, number>();

  for (const row of rows) {
    for (const field of fields) {
      const values = row[field];
      if (!Array.isArray(values)) continue;

      for (const value of values) {
        const cleaned = String(value || "").trim();
        if (!cleaned) continue;
        counts.set(cleaned, (counts.get(cleaned) || 0) + 1);
      }
    }
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count }));
}

export default async function TopicDetailPage({
  params,
}: {
  params: Promise<{ topic: string }>;
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

  const { topic: encodedTopic } = await params;
  const topic = decodeURIComponent(encodedTopic);
  const displayTopic = formatTopicLabel(topic);

  const { data, error } = await supabase
    .from("chat_analyses")
    .select(
      [
        "agent_name",
        "empathy",
        "clarity",
        "ownership",
        "resolution_quality",
        "professionalism",
        "churn_risk",
        "attention_priority",
        "customer_frustration_present",
        "escalation_done_well",
        "premature_close",
        "product_limitation_chat",
        "improvement_areas",
        "summary_improvements",
        "summary_strengths",
        "what_you_did_well",
        "missed_confirmation",
        "deleted_message",
      ].join(", ")
    )
    .eq("organization_id", organizationId)
    .eq("chat_type", topic);

  if (error) {
    return (
      <main className="px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <a href="/dashboard/topics" className="text-gray-400 hover:text-white">
            ← Back to Topics
          </a>
          <div className="mt-6 rounded-3xl border border-white/10 bg-[#081225] p-8 text-gray-400">
            {error.message}
          </div>
        </div>
      </main>
    );
  }

  const rawRows = Array.isArray(data) ? (data as unknown[]) : [];
  const rows: TopicAgentRow[] = rawRows.map((raw) => {
    const row = raw as Record<string, unknown>;

    return {
      agent_name: typeof row["agent_name"] === "string" ? row["agent_name"] : null,
      empathy: typeof row["empathy"] === "number" ? row["empathy"] : null,
      clarity: typeof row["clarity"] === "number" ? row["clarity"] : null,
      ownership: typeof row["ownership"] === "number" ? row["ownership"] : null,
      resolution_quality:
        typeof row["resolution_quality"] === "number" ? row["resolution_quality"] : null,
      professionalism:
        typeof row["professionalism"] === "number" ? row["professionalism"] : null,
      churn_risk: typeof row["churn_risk"] === "string" ? row["churn_risk"] : null,
      attention_priority:
        typeof row["attention_priority"] === "string" ? row["attention_priority"] : null,
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
      improvement_areas: Array.isArray(row["improvement_areas"])
        ? (row["improvement_areas"] as string[])
        : null,
      summary_improvements: Array.isArray(row["summary_improvements"])
        ? (row["summary_improvements"] as string[])
        : null,
      summary_strengths: Array.isArray(row["summary_strengths"])
        ? (row["summary_strengths"] as string[])
        : null,
      what_you_did_well: Array.isArray(row["what_you_did_well"])
        ? (row["what_you_did_well"] as string[])
        : null,
      missed_confirmation:
        typeof row["missed_confirmation"] === "boolean"
          ? row["missed_confirmation"]
          : null,
      deleted_message:
        typeof row["deleted_message"] === "boolean" ? row["deleted_message"] : null,
    };
  });

  const grouped = new Map<string, TopicAgentRow[]>();

  for (const row of rows) {
    const agentName =
      typeof row.agent_name === "string" && row.agent_name.trim().length > 0
        ? row.agent_name.trim()
        : "Unknown";

    if (!grouped.has(agentName)) {
      grouped.set(agentName, []);
    }

    grouped.get(agentName)!.push(row);
  }

  const overall = {
    total_chats: rows.length,
    total_agents: grouped.size,
    average_scores: {
      empathy: avg(rows.map((row) => row.empathy)),
      clarity: avg(rows.map((row) => row.clarity)),
      ownership: avg(rows.map((row) => row.ownership)),
      resolution_quality: avg(rows.map((row) => row.resolution_quality)),
      professionalism: avg(rows.map((row) => row.professionalism)),
    },
    customer_frustration_rate: percent(
      rows.filter((row) => row.customer_frustration_present === true).length,
      rows.length
    ),
    escalation_rate: percent(
      rows.filter((row) => row.escalation_done_well === true).length,
      rows.length
    ),
    premature_close_rate: percent(
      rows.filter((row) => row.premature_close === true).length,
      rows.length
    ),
    product_limitation_rate: percent(
      rows.filter((row) => row.product_limitation_chat === true).length,
      rows.length
    ),
    missed_confirmation_rate: percent(
      rows.filter((row) => row.missed_confirmation === true).length,
      rows.length
    ),
    deleted_message_rate: percent(
      rows.filter((row) => row.deleted_message === true).length,
      rows.length
    ),
  };

  const topImprovementAreas = countPhrases(rows, [
    "improvement_areas",
    "summary_improvements",
  ]).slice(0, 8);

  const topStrengths = countPhrases(rows, [
    "summary_strengths",
    "what_you_did_well",
  ]).slice(0, 8);

  const coachingPatterns: string[] = [];

  if (overall.missed_confirmation_rate >= 75) {
    coachingPatterns.push("Missed confirmation is a recurring weakness in this topic.");
  }

  if (overall.customer_frustration_rate >= 60) {
    coachingPatterns.push("Customers in this topic frequently show frustration.");
  }

  if (overall.premature_close_rate >= 30) {
    coachingPatterns.push("Premature chat closure appears repeatedly in this topic.");
  }

  if (overall.average_scores.empathy > 0 && overall.average_scores.empathy <= 5) {
    coachingPatterns.push("Empathy is consistently soft in this topic.");
  }

  if (
    overall.average_scores.resolution_quality > 0 &&
    overall.average_scores.resolution_quality <= 5
  ) {
    coachingPatterns.push("Resolution quality is weak for this topic.");
  }

  if (
    overall.average_scores.ownership > 0 &&
    overall.average_scores.ownership <= 5
  ) {
    coachingPatterns.push("Ownership tends to drop in this topic.");
  }

  if (overall.escalation_rate <= 10 && overall.customer_frustration_rate >= 60) {
    coachingPatterns.push(
      "High frustration with very low escalation suggests delayed or missing escalation decisions."
    );
  }

  const agents = Array.from(grouped.entries())
    .map(([agentName, agentRows]) => {
      const total = agentRows.length;
      const customerFrustrationCount = agentRows.filter(
        (row) => row.customer_frustration_present === true
      ).length;
      const escalationCount = agentRows.filter(
        (row) => row.escalation_done_well === true
      ).length;
      const prematureCloseCount = agentRows.filter(
        (row) => row.premature_close === true
      ).length;
      const productLimitationCount = agentRows.filter(
        (row) => row.product_limitation_chat === true
      ).length;
      const missedConfirmationCount = agentRows.filter(
        (row) => row.missed_confirmation === true
      ).length;
      const average_scores = {
        empathy: avg(agentRows.map((row) => row.empathy)),
        clarity: avg(agentRows.map((row) => row.clarity)),
        ownership: avg(agentRows.map((row) => row.ownership)),
        resolution_quality: avg(agentRows.map((row) => row.resolution_quality)),
        professionalism: avg(agentRows.map((row) => row.professionalism)),
      };

      const below_topic_average_flags: string[] = [];

      if (
        average_scores.empathy > 0 &&
        average_scores.empathy < overall.average_scores.empathy
      ) {
        below_topic_average_flags.push("Empathy below topic average");
      }

      if (
        average_scores.ownership > 0 &&
        average_scores.ownership < overall.average_scores.ownership
      ) {
        below_topic_average_flags.push("Ownership below topic average");
      }

      if (
        average_scores.resolution_quality > 0 &&
        average_scores.resolution_quality < overall.average_scores.resolution_quality
      ) {
        below_topic_average_flags.push("Resolution quality below topic average");
      }

      return {
        agent_name: agentName,
        total_chats: total,
        average_scores,
        customer_frustration_count: customerFrustrationCount,
        customer_frustration_rate: percent(customerFrustrationCount, total),
        escalation_rate: percent(escalationCount, total),
        premature_close_count: prematureCloseCount,
        premature_close_rate: percent(prematureCloseCount, total),
        product_limitation_rate: percent(productLimitationCount, total),
        missed_confirmation_count: missedConfirmationCount,
        missed_confirmation_rate: percent(missedConfirmationCount, total),
        top_improvements: countPhrases(agentRows, [
          "improvement_areas",
          "summary_improvements",
        ]).slice(0, 5),
        churn_risk_distribution: {
          low: agentRows.filter((row) => normalizeRisk(row.churn_risk) === "low").length,
          medium: agentRows.filter((row) => normalizeRisk(row.churn_risk) === "medium").length,
          high: agentRows.filter((row) => normalizeRisk(row.churn_risk) === "high").length,
        },
        attention_priority_distribution: {
          low: agentRows.filter(
            (row) => normalizePriority(row.attention_priority) === "low"
          ).length,
          medium: agentRows.filter(
            (row) => normalizePriority(row.attention_priority) === "medium"
          ).length,
          high: agentRows.filter(
            (row) => normalizePriority(row.attention_priority) === "high"
          ).length,
        },
        below_topic_average_flags,
        has_limited_data: total < 5,
      };
    })
    .sort((a, b) => b.total_chats - a.total_chats);

  const patternSignalPriority: PatternSignalKey[] = [
    "customer_frustration_present",
    "premature_close",
    "resolution_quality",
    "empathy",
    "missed_confirmation",
    "ownership",
  ];

  const patternConfidenceRank: Record<PatternConfidence, number> = {
    High: 3,
    Medium: 2,
    Low: 1,
  };

  const patternCards = agents
    .map((agent) => {
      if (agent.total_chats < 3) {
        return null;
      }

      const detectedSignals: PatternSignal[] = [];

      if (
        overall.customer_frustration_rate > 0 &&
        agent.customer_frustration_rate > overall.customer_frustration_rate * 1.5
      ) {
        detectedSignals.push({
          key: "customer_frustration_present",
          label: "Customer frustration present",
          detail: `Customer frustration present in ${agent.customer_frustration_count} of ${agent.total_chats} ${agent.total_chats === 1 ? "chat" : "chats"} vs ${overall.customer_frustration_rate}% org average`,
          narrative: `Customer frustration is frequently present in ${agent.agent_name}'s ${displayTopic} conversations (${agent.customer_frustration_count} of ${agent.total_chats} ${agent.total_chats === 1 ? "chat" : "chats"}).`,
          recommendation: `When handling ${displayTopic} issues, acknowledge the customer's frustration early with empathy statements before moving to resolution.`,
        });
      }

      if (
        overall.premature_close_rate > 0 &&
        agent.premature_close_rate > overall.premature_close_rate * 1.5
      ) {
        detectedSignals.push({
          key: "premature_close",
          label: "Premature close",
          detail: `Premature close in ${agent.premature_close_count} of ${agent.total_chats} ${agent.total_chats === 1 ? "chat" : "chats"} vs ${overall.premature_close_rate}% org average`,
          narrative: `${agent.agent_name} frequently closes ${displayTopic} conversations before confirming resolution (${agent.premature_close_count} of ${agent.total_chats} ${agent.total_chats === 1 ? "chat" : "chats"}).`,
          recommendation: `Before closing ${displayTopic} chats, confirm resolution by asking: 'Does that resolve the issue for you, or would you like me to check anything else?'`,
        });
      }

      if (
        overall.average_scores.resolution_quality > 0 &&
        agent.average_scores.resolution_quality > 0 &&
        agent.average_scores.resolution_quality <=
          overall.average_scores.resolution_quality - 1
      ) {
        const diff = Number(
          (
            overall.average_scores.resolution_quality -
            agent.average_scores.resolution_quality
          ).toFixed(1)
        );

        detectedSignals.push({
          key: "resolution_quality",
          label: "Low resolution quality",
          detail: `Resolution quality avg ${agent.average_scores.resolution_quality} vs ${overall.average_scores.resolution_quality} org average`,
          narrative: `${agent.agent_name}'s resolution quality in ${displayTopic} conversations averages ${agent.average_scores.resolution_quality} out of 10, which is ${diff} points below the team average.`,
          recommendation: `Focus on providing complete resolutions in ${displayTopic} chats - ensure all aspects of the customer's issue are addressed before closing.`,
        });
      }

      if (
        overall.average_scores.empathy > 0 &&
        agent.average_scores.empathy > 0 &&
        agent.average_scores.empathy <= overall.average_scores.empathy - 1
      ) {
        const diff = Number(
          (overall.average_scores.empathy - agent.average_scores.empathy).toFixed(1)
        );

        detectedSignals.push({
          key: "empathy",
          label: "Low empathy",
          detail: `Empathy avg ${agent.average_scores.empathy} vs ${overall.average_scores.empathy} org average`,
          narrative: `Empathy levels in ${agent.agent_name}'s ${displayTopic} conversations average ${agent.average_scores.empathy} out of 10, which is ${diff} points below the team average.`,
          recommendation: `Practice acknowledging the customer's situation before jumping to solutions - phrases like 'I understand how frustrating this must be' can significantly improve the interaction.`,
        });
      }

      if (
        overall.missed_confirmation_rate > 0 &&
        agent.missed_confirmation_rate > overall.missed_confirmation_rate * 1.5
      ) {
        detectedSignals.push({
          key: "missed_confirmation",
          label: "Missed confirmation",
          detail: `Missed confirmation in ${agent.missed_confirmation_count} of ${agent.total_chats} ${agent.total_chats === 1 ? "chat" : "chats"} vs ${overall.missed_confirmation_rate}% org average`,
          narrative: `${agent.agent_name} frequently misses confirming resolution in ${displayTopic} conversations (${agent.missed_confirmation_count} of ${agent.total_chats} ${agent.total_chats === 1 ? "chat" : "chats"}).`,
          recommendation: "Build a habit of confirming resolution before closing - ask the customer to confirm the issue is fully resolved.",
        });
      }

      if (
        overall.average_scores.ownership > 0 &&
        agent.average_scores.ownership > 0 &&
        agent.average_scores.ownership <= overall.average_scores.ownership - 1
      ) {
        detectedSignals.push({
          key: "ownership",
          label: "Low ownership",
          detail: `Ownership avg ${agent.average_scores.ownership} vs ${overall.average_scores.ownership} org average`,
          narrative: `${agent.agent_name} shows low ownership in ${displayTopic} conversations, averaging ${agent.average_scores.ownership} out of 10.`,
          recommendation: `Encourage taking ownership in ${displayTopic} chats by using phrases like 'I'll take care of this for you' and following through on commitments.`,
        });
      }

      if (detectedSignals.length === 0) {
        return null;
      }

      const sortedSignals = [...detectedSignals].sort(
        (a, b) =>
          patternSignalPriority.indexOf(a.key) - patternSignalPriority.indexOf(b.key)
      );
      const [primarySignal, ...additionalSignals] = sortedSignals;
      const confidence = getPatternConfidence(agent.total_chats);

      return {
        agent_name: agent.agent_name,
        topic: displayTopic,
        total_chats: agent.total_chats,
        confidence,
        detected_signals: sortedSignals,
        primary_signal: primarySignal,
        additional_signals: additionalSignals,
      };
    })
    .filter((card): card is NonNullable<typeof card> => card !== null)
    .sort((a, b) => {
      const severityDifference =
        patternSignalPriority.indexOf(a.primary_signal.key) -
        patternSignalPriority.indexOf(b.primary_signal.key);

      if (severityDifference !== 0) {
        return severityDifference;
      }

      const confidenceDifference =
        patternConfidenceRank[b.confidence] - patternConfidenceRank[a.confidence];

      if (confidenceDifference !== 0) {
        return confidenceDifference;
      }

      if (b.total_chats !== a.total_chats) {
        return b.total_chats - a.total_chats;
      }

      return a.agent_name.localeCompare(b.agent_name);
    });


  return (
    <main className="px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10">
          <a
            href="/dashboard/topics"
            className="mb-6 inline-block text-sm text-gray-400 hover:text-white"
          >
            ← Back to Topics
          </a>

          <div className="mb-3 inline-flex items-center rounded-full border border-indigo-400/20 bg-indigo-400/10 px-3 py-1 text-xs font-medium text-indigo-300">
            Topic Drill-Down
          </div>

          <h1 className="mb-3 text-4xl font-bold tracking-tight">{displayTopic}</h1>

          <p className="max-w-4xl text-gray-300">
            Agent-level performance and coaching signals for this topic inside the analyzed
            coaching dataset.
          </p>
        </div>

        <div className="mb-10 grid gap-6 md:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-[#081225] p-6">
            <p className="mb-2 text-sm text-gray-400">Chats In Topic</p>
            <p className="text-3xl font-bold">{overall.total_chats}</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#081225] p-6">
            <p className="mb-2 text-sm text-gray-400">Agents Handling Topic</p>
            <p className="text-3xl font-bold">{overall.total_agents}</p>
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
          <h2 className="mb-6 text-2xl font-semibold">Topic Health Snapshot</h2>

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

          <div className="mt-8 grid gap-4 md:grid-cols-3 lg:grid-cols-6">
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <div className="mb-1 text-xs uppercase tracking-wide text-gray-500">
                Customer Frustration
              </div>
              <div
                className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold uppercase ${getRiskClasses(
                  getRiskLevel(overall.customer_frustration_rate)
                )}`}
              >
                {overall.customer_frustration_rate}%
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <div className="mb-1 text-xs uppercase tracking-wide text-gray-500">
                Escalation Rate
              </div>
              <div
                className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold uppercase ${getRiskClasses(
                  getRiskLevel(overall.escalation_rate)
                )}`}
              >
                {overall.escalation_rate}%
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <div className="mb-1 text-xs uppercase tracking-wide text-gray-500">
                Premature Close
              </div>
              <div
                className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold uppercase ${getRiskClasses(
                  getRiskLevel(overall.premature_close_rate)
                )}`}
              >
                {overall.premature_close_rate}%
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <div className="mb-1 text-xs uppercase tracking-wide text-gray-500">
                Product Limitation
              </div>
              <div
                className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold uppercase ${getRiskClasses(
                  getRiskLevel(overall.product_limitation_rate)
                )}`}
              >
                {overall.product_limitation_rate}%
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <div className="mb-1 text-xs uppercase tracking-wide text-gray-500">
                Missed Confirmation
              </div>
              <div
                className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold uppercase ${getRiskClasses(
                  getRiskLevel(overall.missed_confirmation_rate)
                )}`}
              >
                {overall.missed_confirmation_rate}%
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <div className="mb-1 text-xs uppercase tracking-wide text-gray-500">
                Deleted Message
              </div>
              <div
                className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold uppercase ${getRiskClasses(
                  getRiskLevel(overall.deleted_message_rate)
                )}`}
              >
                {overall.deleted_message_rate}%
              </div>
            </div>
          </div>
        </div>

        <div className="mb-10 grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-[#081225] p-8">
            <h2 className="mb-6 text-2xl font-semibold">Top Improvement Areas</h2>

            {topImprovementAreas.length === 0 ? (
              <p className="text-gray-400">No recurring improvement areas yet.</p>
            ) : (
              <ul className="space-y-3 text-gray-300">
                {topImprovementAreas.map((item) => (
                  <li key={item.label}>
                    • {item.label} <span className="text-gray-500">({item.count} mentions)</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#081225] p-8">
            <h2 className="mb-6 text-2xl font-semibold">Top Strengths</h2>

            {topStrengths.length === 0 ? (
              <p className="text-gray-400">No recurring strengths yet.</p>
            ) : (
              <ul className="space-y-3 text-gray-300">
                {topStrengths.map((item) => (
                  <li key={item.label}>
                    • {item.label} <span className="text-gray-500">({item.count} mentions)</span>
                  </li>
                ))}
              </ul>
            )}
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
          <h2 className="mb-6 text-2xl font-semibold">Coaching Pattern Cards</h2>

          {patternCards.length === 0 ? (
            <p className="text-gray-400">No coaching pattern cards detected for this topic yet.</p>
          ) : (
            <div className="space-y-4">
              {patternCards.map((card) => (
                <div
                  key={`${card.agent_name}-${card.topic}`}
                  className="rounded-2xl border border-white/10 bg-black/20 p-6"
                >
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-2xl font-bold text-white">{card.agent_name}</h3>
                      <p className="text-sm text-gray-400">
                        {card.topic} - {card.total_chats} {card.total_chats === 1 ? "chat" : "chats"}
                      </p>
                    </div>

                    <div
                      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${getPatternConfidenceClasses(
                        card.confidence
                      )}`}
                    >
                      {card.confidence} confidence
                    </div>
                  </div>

                  <div className="mb-4 flex flex-wrap gap-2 text-sm">
                    <span className="rounded-full border border-indigo-400/20 bg-indigo-400/10 px-3 py-1 text-indigo-300">
                      Primary signal: {card.primary_signal.label}
                    </span>
                    {card.additional_signals.map((signal) => (
                      <span
                        key={`${card.agent_name}-${signal.key}`}
                        className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-gray-300"
                      >
                        {signal.label}
                      </span>
                    ))}
                  </div>

                  <div className="mb-4 rounded-2xl border border-white/10 bg-[#081225] p-4">
                    <p className="mb-2 text-xs uppercase tracking-wide text-gray-500">
                      Detected Signals
                    </p>
                    <ul className="space-y-2 text-sm text-gray-300">
                      {card.detected_signals.map((signal) => (
                        <li key={`${card.agent_name}-${signal.key}`}>- {signal.detail}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-[#081225] p-4">
                      <p className="mb-2 text-xs uppercase tracking-wide text-gray-500">
                        Narrative
                      </p>
                      <p className="text-sm text-gray-300">{card.primary_signal.narrative}</p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-[#081225] p-4">
                      <p className="mb-2 text-xs uppercase tracking-wide text-gray-500">
                        Recommendation
                      </p>
                      <p className="text-sm text-gray-300">
                        {card.primary_signal.recommendation}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-3xl border border-white/10 bg-[#081225] p-8">
          <h2 className="mb-6 text-2xl font-semibold">Agents Handling This Topic</h2>

          <div className="space-y-4">
            {agents.length === 0 ? (
              <p className="text-gray-400">No agent data found for this topic.</p>
            ) : (
              agents.map((agent) => (
                <div
                  key={agent.agent_name}
                  className="rounded-2xl border border-white/10 bg-black/20 p-6"
                >
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-2xl font-bold text-white">{agent.agent_name}</h3>
                      <p className="text-sm text-gray-400">
                        {agent.total_chats} {agent.total_chats === 1 ? "chat" : "chats"} in this topic
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {agent.has_limited_data ? (
                        <div className="rounded-full border border-yellow-500/20 bg-yellow-500/15 px-3 py-1 text-xs font-semibold uppercase text-yellow-300">
                          Limited data
                        </div>
                      ) : null}

                      {agent.below_topic_average_flags.length > 0 ? (
                        <div className="rounded-full border border-red-500/20 bg-red-500/15 px-3 py-1 text-xs font-semibold uppercase text-red-300">
                          Below topic average
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="mb-6 grid gap-4 text-sm text-gray-300 md:grid-cols-4">
                    <div>Frustration: {agent.customer_frustration_rate}%</div>
                    <div>Escalation: {agent.escalation_rate}%</div>
                    <div>Premature Close: {agent.premature_close_rate}%</div>
                    <div>Product Limitation: {agent.product_limitation_rate}%</div>
                  </div>

                  {agent.below_topic_average_flags.length > 0 ? (
                    <div className="mb-6 rounded-2xl border border-white/10 bg-[#081225] p-4">
                      <p className="mb-2 text-xs uppercase tracking-wide text-gray-500">
                        Coaching Flags
                      </p>
                      <div className="flex flex-wrap gap-2 text-sm text-yellow-300">
                        {agent.below_topic_average_flags.map((flag) => (
                          <span
                            key={flag}
                            className="rounded-full border border-yellow-500/20 bg-yellow-500/10 px-3 py-1"
                          >
                            {flag}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="mb-6 space-y-4">
                    <ScoreBar label="Empathy" value={agent.average_scores.empathy} />
                    <ScoreBar label="Clarity" value={agent.average_scores.clarity} />
                    <ScoreBar label="Ownership" value={agent.average_scores.ownership} />
                    <ScoreBar
                      label="Resolution Quality"
                      value={agent.average_scores.resolution_quality}
                    />
                    <ScoreBar
                      label="Professionalism"
                      value={agent.average_scores.professionalism}
                    />
                  </div>

                  <div className="mb-6 rounded-2xl border border-white/10 bg-[#081225] p-4">
                    <p className="mb-3 text-xs uppercase tracking-wide text-gray-500">
                      Top Improvement Areas For This Agent In This Topic
                    </p>

                    {agent.top_improvements.length === 0 ? (
                      <p className="text-sm text-gray-400">No recurring improvements yet.</p>
                    ) : (
                      <ul className="space-y-2 text-sm text-gray-300">
                        {agent.top_improvements.map((item) => (
                          <li key={item.label}>
                            • {item.label} <span className="text-gray-500">({item.count})</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-[#081225] p-4">
                      <p className="mb-2 text-xs uppercase tracking-wide text-gray-500">
                        Churn Risk Distribution
                      </p>
                      <div className="flex flex-wrap gap-3 text-sm">
                        <span className="text-emerald-300">
                          Low: {agent.churn_risk_distribution.low}
                        </span>
                        <span className="text-yellow-300">
                          Medium: {agent.churn_risk_distribution.medium}
                        </span>
                        <span className="text-red-300">
                          High: {agent.churn_risk_distribution.high}
                        </span>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-[#081225] p-4">
                      <p className="mb-2 text-xs uppercase tracking-wide text-gray-500">
                        Attention Priority Distribution
                      </p>
                      <div className="flex flex-wrap gap-3 text-sm">
                        <span className="text-emerald-300">
                          Low: {agent.attention_priority_distribution.low}
                        </span>
                        <span className="text-yellow-300">
                          Medium: {agent.attention_priority_distribution.medium}
                        </span>
                        <span className="text-red-300">
                          High: {agent.attention_priority_distribution.high}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

