import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabaseServer";
import { getCurrentOrganization } from "@/lib/currentOrganization";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ALLOWED_OVERRIDES = new Set([
  "followed_through",
  "repeated",
  "no_opportunity",
]);

export async function POST(req: Request) {
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
      return NextResponse.json({ error: "Organization not found" }, { status: 400 });
    }

    const body = await req.json();
    const followthroughId =
      typeof body?.followthrough_id === "string" ? body.followthrough_id.trim() : "";
    const override = body?.override;

    if (!followthroughId) {
      return NextResponse.json(
        { error: "followthrough_id is required" },
        { status: 400 }
      );
    }

    let normalizedOverride: string | null = null;

    if (override === null) {
      normalizedOverride = null;
    } else if (typeof override === "string" && ALLOWED_OVERRIDES.has(override.toLowerCase())) {
      normalizedOverride = override.toLowerCase();
    } else {
      return NextResponse.json({ error: "Invalid override value" }, { status: 400 });
    }

    const { error: updateError } = await supabaseAdmin
      .from("coaching_followthrough")
      .update({ manager_override: normalizedOverride })
      .eq("id", followthroughId)
      .eq("organization_id", organizationId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Update followthrough override error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update override" },
      { status: 500 }
    );
  }
}
