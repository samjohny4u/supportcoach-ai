// src/app/api/subscription-status/route.ts
// Returns the current org's subscription status and feature access

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentOrganization } from "@/lib/currentOrganization";
import { getOrgAccess } from "@/lib/planAccess";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET() {
  try {
    // Get authenticated user and org using existing helper
    let orgInfo;
    try {
      orgInfo = await getCurrentOrganization();
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = orgInfo.organizationId;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get organization
    const { data: org } = await supabase
      .from("organizations")
      .select("id, name, plan, trial_ends_at")
      .eq("id", orgId)
      .single();

    if (!org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Get active subscription (most recent)
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // Compute access
    const access = getOrgAccess(org, subscription || null);

    return NextResponse.json({
      organization_id: orgId,
      organization_name: org.name,
      ...access,
    });
  } catch (err) {
    console.error("Subscription status error:", err);
    return NextResponse.json(
      { error: "Failed to get subscription status" },
      { status: 500 }
    );
  }
}