import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function slugifyCompanyName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function buildUniqueSlug(base: string) {
  const fallback = "organization";
  const safeBase = base || fallback;
  const randomSuffix = Math.random().toString(36).slice(2, 8);
  return `${safeBase}-${randomSuffix}`;
}

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

    const body = await req.json();
    const companyName = String(body.companyName || "").trim();

    if (!companyName) {
      return NextResponse.json(
        { error: "Company name is required" },
        { status: 400 }
      );
    }

    const { data: existingMembership, error: membershipLookupError } =
      await supabaseAdmin
        .from("organization_memberships")
        .select("organization_id, role")
        .eq("user_id", user.id)
        .maybeSingle();

    if (membershipLookupError) {
      return NextResponse.json(
        { error: membershipLookupError.message },
        { status: 500 }
      );
    }

    if (existingMembership) {
      return NextResponse.json({
        success: true,
        organization_id: existingMembership.organization_id,
        already_onboarded: true,
      });
    }

    const baseSlug = slugifyCompanyName(companyName);
    const slug = buildUniqueSlug(baseSlug);

    const { data: organization, error: organizationError } = await supabaseAdmin
      .from("organizations")
      .insert({
        name: companyName,
        slug,
      })
      .select("id")
      .single();

    if (organizationError || !organization) {
      return NextResponse.json(
        { error: organizationError?.message || "Failed to create organization" },
        { status: 500 }
      );
    }

    const { error: membershipInsertError } = await supabaseAdmin
      .from("organization_memberships")
      .insert({
        organization_id: organization.id,
        user_id: user.id,
        role: "owner",
      });

    if (membershipInsertError) {
      return NextResponse.json(
        { error: membershipInsertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      organization_id: organization.id,
      already_onboarded: false,
    });
  } catch (error: any) {
    console.error("Onboarding error:", error);

    return NextResponse.json(
      { error: error?.message || "Failed to complete onboarding" },
      { status: 500 }
    );
  }
}