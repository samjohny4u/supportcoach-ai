import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabaseServer";
import { getCurrentOrganization } from "@/lib/currentOrganization";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

export async function GET(req: Request) {
  try {
    const supabaseAuth = await createSupabaseServer();

    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { organizationId } = await getCurrentOrganization();

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);
    const selectedRange = searchParams.get("range") || "all";
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

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

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

    return NextResponse.json({
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
    });
  } catch (error: any) {
    console.error("Topic stats error:", error);

    return NextResponse.json(
      { error: error?.message || "Failed to load topic stats" },
      { status: 500 }
    );
  }
}