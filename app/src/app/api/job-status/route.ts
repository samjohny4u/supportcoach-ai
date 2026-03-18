import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabaseServer";
import { getCurrentOrganization } from "@/lib/currentOrganization";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
    const jobId = searchParams.get("jobId");

    if (jobId) {
      const { data: job, error: jobError } = await supabase
        .from("analysis_jobs")
        .select("*")
        .eq("id", jobId)
        .eq("organization_id", organizationId)
        .single();

      if (jobError) {
        return NextResponse.json({ error: jobError.message }, { status: 500 });
      }

      const { data: items, error: itemsError } = await supabase
        .from("analysis_job_items")
        .select("id, file_name, status, created_at, analysis_id, organization_id")
        .eq("job_id", jobId)
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: true });

      if (itemsError) {
        return NextResponse.json({ error: itemsError.message }, { status: 500 });
      }

      return NextResponse.json({
        job,
        items: items || [],
      });
    }

    const { data: jobs, error } = await supabase
      .from("analysis_jobs")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      jobs: jobs || [],
    });
  } catch (error: any) {
    console.error("Job status route error:", error);

    return NextResponse.json(
      { error: error?.message || "Failed to fetch job status" },
      { status: 500 }
    );
  }
}