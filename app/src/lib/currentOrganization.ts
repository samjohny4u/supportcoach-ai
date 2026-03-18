import { createSupabaseServer } from "./supabaseServer";

export async function getCurrentOrganization() {
  const supabase = await createSupabaseServer();

  // Get logged-in user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  // Find membership for this user
  const { data: membership, error } = await supabase
    .from("organization_memberships")
    .select("organization_id, role")
    .eq("user_id", user.id)
    .single();

  if (error || !membership) {
    throw new Error("User is not assigned to an organization");
  }

  return {
    user,
    organizationId: membership.organization_id,
    role: membership.role,
  };
}