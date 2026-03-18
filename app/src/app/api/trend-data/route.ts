import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServer } from "@/lib/supabaseServer";
import { getCurrentOrganization } from "@/lib/currentOrganization";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type TrendRow = {
  created_at: string | null;
  empathy: number | null;
  clarity: number | null;
  ownership: number | null;
  resolution_quality: number | null;
  professionalism: number | null;
};

function average(values: Array<number | null | undefined>) {
  const filtered = values.filter((value): value is number => typeof value === "number");
  if (filtered.length === 0) return 0;

  return Number(
    (filtered.reduce((sum, value) => sum + value, 0) / filtered.length).toFixed(2)
  );
}

function extractDateKey(value: string | null | undefined) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  const trimmed = value.trim();

  if (trimmed.includes("T")) {
    return trimmed.split("T")[0];
  }

  if (trimmed.includes(" ")) {
    return trimmed.split(" ")[0];
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().split("T")[0];
  }

  return null;
}

function isWithinRange(createdAt: string | null | undefined, range: string) {
  if (range === "all") {
    return true;
  }

  if (typeof createdAt !== "string" || createdAt.trim().length === 0) {
    return false;
  }

  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) {
    return false;
  }

  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (range === "7d") {
    return diffDays <= 7;
  }

  if (range === "30d") {
    return diffDays <= 30;
  }

  return true;
}

export async function GET(req: Request) {
  try {
    const supabase = await createSupabaseServer();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

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
    const range = searchParams.get("range") || "30d";

    const { data, error } = await supabaseAdmin
      .from("chat_analyses")
      .select(
        "created_at, empathy, clarity, ownership, resolution_quality, professionalism"
      )
      .eq("organization_id", organizationId)
      .neq("excluded", true)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[trend-data] Query error:", error);

      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rawRows = Array.isArray(data) ? (data as TrendRow[]) : [];

    const filteredRows = rawRows.filter((row) =>
      isWithinRange(row.created_at, range)
    );

    const grouped: Record<string, TrendRow[]> = {};

    for (const row of filteredRows) {
      const dateKey = extractDateKey(row.created_at);

      if (!dateKey) {
        continue;
      }

      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }

      grouped[dateKey].push(row);
    }

    const result = Object.entries(grouped).map(([date, rows]) => ({
      date,
      empathy: average(rows.map((row) => row.empathy)),
      clarity: average(rows.map((row) => row.clarity)),
      ownership: average(rows.map((row) => row.ownership)),
      resolution: average(rows.map((row) => row.resolution_quality)),
      professionalism: average(rows.map((row) => row.professionalism)),
    }));

    console.log("[trend-data] organization_id:", organizationId);
    console.log("[trend-data] range:", range);
    console.log("[trend-data] raw row count:", rawRows.length);
    console.log("[trend-data] filtered row count:", filteredRows.length);
    console.log("[trend-data] grouped day count:", result.length);

    return NextResponse.json({
      range,
      data: result,
    });
  } catch (error: any) {
    console.error("Trend data error:", error);

    return NextResponse.json(
      { error: error?.message || "Failed to load trend data" },
      { status: 500 }
    );
  }
}