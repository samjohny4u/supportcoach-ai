import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabaseServer";
import { getCurrentOrganization } from "@/lib/currentOrganization";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
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

    // The analysis page form posts form data; ExcludeToggleButton posts JSON.
    const contentType = req.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");

    let analysisId: string | undefined;
    let excludedValue: string | undefined;
    let returnTo = "/dashboard";

    if (isJson) {
      const body = await req.json();
      analysisId =
        typeof body?.analysis_id === "string" ? body.analysis_id : undefined;
      excludedValue = String(body?.excluded);
    } else {
      const formData = await req.formData();
      analysisId = formData.get("analysis_id")?.toString();
      excludedValue = formData.get("excluded")?.toString();
      returnTo = formData.get("return_to")?.toString() || "/dashboard";
    }

    if (!analysisId) {
      return NextResponse.json(
        { error: "analysis_id is required." },
        { status: 400 }
      );
    }

    const excluded = excludedValue === "true";

    const { data, error } = await supabase
      .from("chat_analyses")
      .update({ excluded })
      .eq("id", analysisId)
      .eq("organization_id", organizationId)
      .select("id");

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: "Analysis not found." },
        { status: 404 }
      );
    }

    if (isJson) {
      return NextResponse.json({ success: true });
    }

    // Only allow same-origin relative redirect targets.
    const safeReturnTo =
      returnTo.startsWith("/") && !returnTo.startsWith("//")
        ? returnTo
        : "/dashboard";

    return NextResponse.redirect(new URL(safeReturnTo, req.url));
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Server error" },
      { status: 500 }
    );
  }
}
