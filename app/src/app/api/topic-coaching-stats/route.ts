import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createSupabaseServer } from "../../../lib/supabaseServer";
import { getCurrentOrganization } from "../../../lib/currentOrganization";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type TopicCoachingRow = {
  chat_type: string | null;
  agent_name: string | null;
  improvement_areas: string[] | null;
  summary_improvements: string[] | null;
  summary_strengths: string[] | null;
  what_you_did_well: string[] | null;
  empathy: number | null;
  clarity: number | null;
  ownership: number | null;
  resolution_quality: number | null;
  professionalism: number | null;
  missed_confirmation: boolean | null;
  premature_close: boolean | null;
  deleted_message: boolean | null;
  customer_frustration_present: boolean | null;
  escalation_done_well: boolean | null;
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

function countPhrases(
  rows: TopicCoachingRow[],
  fields: Array<
    | "improvement_areas"
    | "summary_improvements"
    | "summary_strengths"
    | "what_you_did_well"
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

export async function GET(req: Request) {
  try {
    const supabaseAuth = await createSupabaseServer();
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
        return NextResponse.json({ error: "Organization not found" }, { status: 403 });
      }

      throw error;
    }

    const { searchParams } = new URL(req.url);
    const topicParam = searchParams.get("topic");
    const range = searchParams.get("range") || "all";
    const { start, end } = getDateRange(range);

    let query = supabase
      .from("chat_analyses")
      .select(
        [
          "chat_type",
          "agent_name",
          "improvement_areas",
          "summary_improvements",
          "summary_strengths",
          "what_you_did_well",
          "empathy",
          "clarity",
          "ownership",
          "resolution_quality",
          "professionalism",
          "missed_confirmation",
          "premature_close",
          "deleted_message",
          "customer_frustration_present",
          "escalation_done_well",
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

    if (topicParam && topicParam.trim()) {
      query = query.eq("chat_type", topicParam.trim());
    }

    const { data, error } = await query;

    if (error) {
      console.error("Topic coaching stats error:", error);
      return NextResponse.json(
        { error: error.message || "Failed to fetch topic coaching stats." },
        { status: 500 }
      );
    }

    const rawRows = Array.isArray(data) ? (data as unknown[]) : [];

    const rows: TopicCoachingRow[] = rawRows.map((raw) => {
      const row = raw as Record<string, unknown>;

      return {
        chat_type: typeof row["chat_type"] === "string" ? row["chat_type"] : null,
        agent_name: typeof row["agent_name"] === "string" ? row["agent_name"] : null,
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
        empathy: typeof row["empathy"] === "number" ? row["empathy"] : null,
        clarity: typeof row["clarity"] === "number" ? row["clarity"] : null,
        ownership: typeof row["ownership"] === "number" ? row["ownership"] : null,
        resolution_quality:
          typeof row["resolution_quality"] === "number" ? row["resolution_quality"] : null,
        professionalism:
          typeof row["professionalism"] === "number" ? row["professionalism"] : null,
        missed_confirmation:
          typeof row["missed_confirmation"] === "boolean"
            ? row["missed_confirmation"]
            : null,
        premature_close:
          typeof row["premature_close"] === "boolean" ? row["premature_close"] : null,
        deleted_message:
          typeof row["deleted_message"] === "boolean" ? row["deleted_message"] : null,
        customer_frustration_present:
          typeof row["customer_frustration_present"] === "boolean"
            ? row["customer_frustration_present"]
            : null,
        escalation_done_well:
          typeof row["escalation_done_well"] === "boolean"
            ? row["escalation_done_well"]
            : null,
        created_at: String(row["created_at"] ?? ""),
      };
    });

    const orgAverages = {
      empathy: avg(rows.map((row) => row.empathy)),
      clarity: avg(rows.map((row) => row.clarity)),
      ownership: avg(rows.map((row) => row.ownership)),
      resolution_quality: avg(rows.map((row) => row.resolution_quality)),
      professionalism: avg(rows.map((row) => row.professionalism)),
      missed_confirmation_rate: percent(
        rows.filter((row) => row.missed_confirmation === true).length,
        rows.length
      ),
      premature_close_rate: percent(
        rows.filter((row) => row.premature_close === true).length,
        rows.length
      ),
      deleted_message_rate: percent(
        rows.filter((row) => row.deleted_message === true).length,
        rows.length
      ),
      customer_frustration_rate: percent(
        rows.filter((row) => row.customer_frustration_present === true).length,
        rows.length
      ),
      escalation_done_well_rate: percent(
        rows.filter((row) => row.escalation_done_well === true).length,
        rows.length
      ),
    };

    const grouped = new Map<string, TopicCoachingRow[]>();

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

        const average_scores = {
          empathy: avg(topicRows.map((row) => row.empathy)),
          clarity: avg(topicRows.map((row) => row.clarity)),
          ownership: avg(topicRows.map((row) => row.ownership)),
          resolution_quality: avg(topicRows.map((row) => row.resolution_quality)),
          professionalism: avg(topicRows.map((row) => row.professionalism)),
        };

        const rates = {
          missed_confirmation_rate: percent(
            topicRows.filter((row) => row.missed_confirmation === true).length,
            total
          ),
          premature_close_rate: percent(
            topicRows.filter((row) => row.premature_close === true).length,
            total
          ),
          deleted_message_rate: percent(
            topicRows.filter((row) => row.deleted_message === true).length,
            total
          ),
          customer_frustration_rate: percent(
            topicRows.filter((row) => row.customer_frustration_present === true).length,
            total
          ),
          escalation_done_well_rate: percent(
            topicRows.filter((row) => row.escalation_done_well === true).length,
            total
          ),
        };

        const top_improvement_areas = countPhrases(topicRows, [
          "improvement_areas",
          "summary_improvements",
        ]).slice(0, 8);

        const top_strengths = countPhrases(topicRows, [
          "summary_strengths",
          "what_you_did_well",
        ]).slice(0, 8);

        const coaching_patterns: string[] = [];

        if (rates.missed_confirmation_rate > orgAverages.missed_confirmation_rate * 1.5) {
          coaching_patterns.push("Missed confirmation rate is above the org average.");
        }

        if (rates.premature_close_rate > orgAverages.premature_close_rate * 1.5) {
          coaching_patterns.push("Premature close rate is high versus the org average.");
        }

        if (rates.deleted_message_rate > orgAverages.deleted_message_rate * 1.5) {
          coaching_patterns.push("Deleted message rate is above the org average.");
        }

        if (
          average_scores.empathy > 0 &&
          average_scores.empathy <= orgAverages.empathy - 1
        ) {
          coaching_patterns.push("Empathy scores are consistently below the org average.");
        }

        if (
          average_scores.ownership > 0 &&
          average_scores.ownership <= orgAverages.ownership - 1
        ) {
          coaching_patterns.push("Ownership scores drop below the org average in this topic.");
        }

        if (
          average_scores.resolution_quality > 0 &&
          average_scores.resolution_quality <= orgAverages.resolution_quality - 1
        ) {
          coaching_patterns.push(
            "Resolution quality is below the org average for this topic."
          );
        }

        if (
          rates.escalation_done_well_rate < orgAverages.escalation_done_well_rate - 15
        ) {
          coaching_patterns.push(
            "Escalation handling appears weaker than the org average."
          );
        }

        const agentMap = new Map<string, TopicCoachingRow[]>();

        for (const row of topicRows) {
          const agentName =
            typeof row.agent_name === "string" && row.agent_name.trim().length > 0
              ? row.agent_name.trim()
              : "Unknown";

          if (!agentMap.has(agentName)) {
            agentMap.set(agentName, []);
          }

          agentMap.get(agentName)!.push(row);
        }

        const agent_breakdown = Array.from(agentMap.entries())
          .map(([agent_name, agentRows]) => {
            const agentTotal = agentRows.length;

            const agentAverageScores = {
              empathy: avg(agentRows.map((row) => row.empathy)),
              clarity: avg(agentRows.map((row) => row.clarity)),
              ownership: avg(agentRows.map((row) => row.ownership)),
              resolution_quality: avg(agentRows.map((row) => row.resolution_quality)),
              professionalism: avg(agentRows.map((row) => row.professionalism)),
            };

            const below_topic_average_flags: string[] = [];

            if (
              agentAverageScores.empathy > 0 &&
              agentAverageScores.empathy < average_scores.empathy
            ) {
              below_topic_average_flags.push("Empathy below topic average");
            }

            if (
              agentAverageScores.ownership > 0 &&
              agentAverageScores.ownership < average_scores.ownership
            ) {
              below_topic_average_flags.push("Ownership below topic average");
            }

            if (
              agentAverageScores.resolution_quality > 0 &&
              agentAverageScores.resolution_quality < average_scores.resolution_quality
            ) {
              below_topic_average_flags.push("Resolution quality below topic average");
            }

            return {
              agent_name,
              total_chats: agentTotal,
              average_scores: agentAverageScores,
              top_improvements: countPhrases(agentRows, [
                "improvement_areas",
                "summary_improvements",
              ]).slice(0, 5),
              has_limited_data: agentTotal < 5,
              below_topic_average_flags,
            };
          })
          .sort((a, b) => b.total_chats - a.total_chats);

        return {
          topic,
          total_chats: total,
          has_limited_data: total < 5,
          average_scores,
          rates,
          top_improvement_areas,
          top_strengths,
          coaching_patterns,
          agent_breakdown,
        };
      })
      .sort((a, b) => b.total_chats - a.total_chats);

    const cross_topic_improvement_areas = countPhrases(rows, [
      "improvement_areas",
      "summary_improvements",
    ]).slice(0, 10);

    return NextResponse.json({
      range,
      selected_topic: topicParam?.trim() || null,
      total_chats_analyzed: rows.length,
      org_averages: orgAverages,
      cross_topic_improvement_areas,
      topics,
    });
  } catch (error: any) {
    console.error("Topic coaching stats crash:", error);
    return NextResponse.json(
      { error: error?.message || "Server error while building topic coaching stats." },
      { status: 500 }
    );
  }
}