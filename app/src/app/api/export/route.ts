import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabaseServer";
import { getCurrentOrganization } from "@/lib/currentOrganization";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function escapeCsv(value: unknown) {
  if (value === null || value === undefined) return "";
  const stringValue = String(value).replace(/"/g, '""');
  return `"${stringValue}"`;
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

    const url = new URL(req.url);
    const agent = url.searchParams.get("agent") || "all";
    const range = url.searchParams.get("range") || "all";

    let query = supabase
      .from("chat_analyses")
      .select("*")
      .eq("organization_id", organizationId)
      .neq("excluded", true)
      .order("created_at", { ascending: false });

    if (range === "7d") {
      const date = new Date();
      date.setDate(date.getDate() - 7);
      query = query.gte("created_at", date.toISOString());
    }

    if (range === "30d") {
      const date = new Date();
      date.setDate(date.getDate() - 30);
      query = query.gte("created_at", date.toISOString());
    }

    if (agent !== "all") {
      query = query.eq("agent_name", agent);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const headers = [
      "file_name",
      "agent_name",
      "customer_name",
      "chat_type",
      "issue_summary",
      "empathy",
      "clarity",
      "ownership",
      "resolution_quality",
      "professionalism",
      "churn_risk",
      "deleted_message",
      "missed_confirmation",
      "premature_close",
      "product_limitation_chat",
      "customer_frustration_present",
      "escalation_done_well",
      "created_at",
    ];

    const rows = (data || []).map((row) =>
      [
        row.file_name,
        row.agent_name,
        row.customer_name,
        row.chat_type,
        row.issue_summary,
        row.empathy,
        row.clarity,
        row.ownership,
        row.resolution_quality,
        row.professionalism,
        row.churn_risk,
        row.deleted_message,
        row.missed_confirmation,
        row.premature_close,
        row.product_limitation_chat,
        row.customer_frustration_present,
        row.escalation_done_well,
        row.created_at,
      ]
        .map(escapeCsv)
        .join(",")
    );

    const csv = [headers.join(","), ...rows].join("\n");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="supportcoach-export.csv"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Export failed" },
      { status: 500 }
    );
  }
}