import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getCurrentOrganization } from "@/lib/currentOrganization";
import { createSupabaseServer } from "@/lib/supabaseServer";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type RequestBody = {
  analysis_id?: unknown;
  delivered?: unknown;
  notes?: unknown;
  source?: unknown;
};

function cleanString(value: unknown): string {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : "";
}

export async function POST(req: Request) {
  let body: RequestBody;

  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const analysisId = cleanString(body.analysis_id);
  const source = cleanString(body.source);

  if (!analysisId) {
    return NextResponse.json({ error: "analysis_id is required." }, { status: 400 });
  }

  if (typeof body.delivered !== "boolean") {
    return NextResponse.json({ error: "delivered must be a boolean." }, { status: 400 });
  }

  if (source !== "auto" && source !== "manual") {
    return NextResponse.json(
      { error: "source must be auto or manual." },
      { status: 400 }
    );
  }

  try {
    const supabaseAuth = await createSupabaseServer();
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let organizationId: string;

  try {
    const organization = await getCurrentOrganization();
    organizationId = organization.organizationId;
  } catch {
    return NextResponse.json(
      { error: "User is not assigned to an organization." },
      { status: 403 }
    );
  }

  try {
    const { data: analysis, error: analysisError } = await supabaseAdmin
      .from("chat_analyses")
      .select("id")
      .eq("id", analysisId)
      .eq("organization_id", organizationId)
      .eq("excluded", false)
      .maybeSingle();

    if (analysisError) {
      return NextResponse.json({ error: analysisError.message }, { status: 500 });
    }

    if (!analysis) {
      return NextResponse.json({ error: "Analysis not found." }, { status: 404 });
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to verify analysis." },
      { status: 500 }
    );
  }

  if (source === "auto") {
    try {
      const { data: organization, error: organizationError } = await supabaseAdmin
        .from("organizations")
        .select("auto_mark_coaching_delivered")
        .eq("id", organizationId)
        .maybeSingle();

      if (organizationError) {
        return NextResponse.json({ error: organizationError.message }, { status: 500 });
      }

      if (organization?.auto_mark_coaching_delivered === false) {
        return NextResponse.json({ success: true, skipped: true });
      }
    } catch (error: any) {
      return NextResponse.json(
        { error: error?.message || "Failed to verify organization settings." },
        { status: 500 }
      );
    }
  }

  const updatePayload: {
    coaching_delivered: boolean;
    coaching_delivered_at: string | null;
    coaching_notes?: string;
  } = {
    coaching_delivered: body.delivered,
    coaching_delivered_at: body.delivered ? new Date().toISOString() : null,
  };

  if (typeof body.notes === "string") {
    updatePayload.coaching_notes = cleanString(body.notes);
  }

  try {
    const { error: updateError } = await supabaseAdmin
      .from("chat_analyses")
      .update(updatePayload)
      .eq("id", analysisId)
      .eq("organization_id", organizationId)
      .eq("excluded", false);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to update coaching delivery." },
      { status: 500 }
    );
  }
}
