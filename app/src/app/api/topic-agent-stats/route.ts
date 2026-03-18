import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createSupabaseServer } from "../../../lib/supabaseServer";
import { getCurrentOrganization } from "../../../lib/currentOrganization";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
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
    const topic = searchParams.get("topic");

    if (!topic || !topic.trim()) {
      return NextResponse.json(
        { error: "Topic parameter is required." },
        { status: 400 }
      );
    }

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
        ].join(", ")
      )
      .eq("organization_id", organizationId)
      .eq("chat_type", topic)
      .neq("excluded", true);

    if (error) {
      console.error("Topic agent stats error:", error);
      return NextResponse.json(
        { error: error.message || "Failed to fetch topic agent stats." },
        { status: 500 }
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

    const agents = Array.from(grouped.entries())
      .map(([agent_name, agentRows]) => {
        const total = agentRows.length;

        return {
          agent_name,
          total_chats: total,
          average_scores: {
            empathy: avg(agentRows.map((row) => row.empathy)),
            clarity: avg(agentRows.map((row) => row.clarity)),
            ownership: avg(agentRows.map((row) => row.ownership)),
            resolution_quality: avg(agentRows.map((row) => row.resolution_quality)),
            professionalism: avg(agentRows.map((row) => row.professionalism)),
          },
          customer_frustration_rate: percent(
            agentRows.filter((row) => row.customer_frustration_present === true).length,
            total
          ),
          escalation_rate: percent(
            agentRows.filter((row) => row.escalation_done_well === true).length,
            total
          ),
          premature_close_rate: percent(
            agentRows.filter((row) => row.premature_close === true).length,
            total
          ),
          product_limitation_rate: percent(
            agentRows.filter((row) => row.product_limitation_chat === true).length,
            total
          ),
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
          has_limited_data: total < 5,
        };
      })
      .sort((a, b) => b.total_chats - a.total_chats);

    return NextResponse.json({
      topic,
      total_chats: rows.length,
      agents,
    });
  } catch (error: any) {
    console.error("Topic agent stats crash:", error);
    return NextResponse.json(
      { error: error?.message || "Server error while building topic agent stats." },
      { status: 500 }
    );
  }
}