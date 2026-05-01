import { createClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "../../lib/supabaseServer";
import { getCurrentOrganization } from "../../lib/currentOrganization";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function SettingsPage({
  searchParams,
}: {
  searchParams?: Promise<{ saved?: string; error?: string }>;
}) {
  async function saveCompanyCoachingContext(formData: FormData) {
    "use server";

    try {
      const { organizationId } = await getCurrentOrganization();
      const coachingContextValue = formData.get("coaching_context");
      const coachingContext =
        typeof coachingContextValue === "string" ? coachingContextValue.trim() : "";

      const { error } = await supabaseAdmin
        .from("organizations")
        .update({ coaching_context: coachingContext || null })
        .eq("id", organizationId);

      if (error) {
        redirect(`/settings?error=${encodeURIComponent(error.message)}`);
      }

      revalidatePath("/settings");
      redirect("/settings?saved=1");
    } catch (error: any) {
      redirect(
        `/settings?error=${encodeURIComponent(
          error?.message || "Failed to save company coaching context."
        )}`
      );
    }
  }

  async function saveAutoMarkSetting(formData: FormData) {
    "use server";

    try {
      const { organizationId } = await getCurrentOrganization();
      const autoMarkEnabled = formData.get("auto_mark") === "on";

      const { error } = await supabaseAdmin
        .from("organizations")
        .update({ auto_mark_coaching_delivered: autoMarkEnabled })
        .eq("id", organizationId);

      if (error) {
        redirect(`/settings?error=${encodeURIComponent(error.message)}`);
      }

      revalidatePath("/settings");
      redirect("/settings?saved=1");
    } catch (error: any) {
      redirect(
        `/settings?error=${encodeURIComponent(
          error?.message || "Failed to save coaching delivery tracking preference."
        )}`
      );
    }
  }

  const supabaseAuth = await createSupabaseServer();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let organizationId: string;

  try {
    const organization = await getCurrentOrganization();
    organizationId = organization.organizationId;
  } catch (error: any) {
    const message = error?.message || "";

    if (
      message.includes("User is not assigned to an organization") ||
      message.includes("User not authenticated")
    ) {
      redirect("/onboarding");
    }

    throw error;
  }

  const resolvedSearchParams = (await searchParams) || {};
  const saved = resolvedSearchParams.saved === "1";
  const errorMessage =
    typeof resolvedSearchParams.error === "string" &&
    resolvedSearchParams.error.trim().length > 0
      ? resolvedSearchParams.error.trim()
      : "";

  const { data: organization, error } = await supabaseAdmin
    .from("organizations")
    .select("name, coaching_context, auto_mark_coaching_delivered")
    .eq("id", organizationId)
    .single();

  if (error || !organization) {
    return (
      <main className="px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-3xl border border-white/10 bg-[#081225] p-8 text-gray-300">
            Failed to load settings.
          </div>
        </div>
      </main>
    );
  }

  const companyName =
    typeof organization.name === "string" && organization.name.trim().length > 0
      ? organization.name.trim()
      : "Your company";
  const coachingContext =
    typeof organization.coaching_context === "string" &&
    organization.coaching_context.trim().length > 0
      ? organization.coaching_context.trim()
      : "";
  const autoMarkEnabled =
    typeof organization.auto_mark_coaching_delivered === "boolean"
      ? organization.auto_mark_coaching_delivered
      : true;

  return (
    <main className="px-6 py-16">
      <div className="mx-auto max-w-4xl">
        <div className="mb-10">
          <div className="mb-3 inline-flex items-center rounded-full border border-indigo-400/20 bg-indigo-400/10 px-3 py-1 text-xs font-medium text-indigo-300">
            Settings
          </div>

          <h1 className="mb-3 text-4xl font-bold tracking-tight">Company Coaching Context</h1>

          <p className="max-w-3xl text-gray-300">
            Add company-specific process knowledge, product rules, and coaching expectations for{" "}
            {companyName}. New analyses and manual re-analyses will use this context when the AI
            scores chats and writes coaching feedback.
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-[#081225] p-8">
          <div className="mb-6 rounded-2xl border border-white/10 bg-black/20 p-5 text-sm text-gray-300">
            <p className="mb-2 font-semibold text-white">What belongs here</p>
            <ul className="space-y-2">
              <li>- Product workflows the team should explain consistently</li>
              <li>- Known limitations or expected behaviors that often confuse customers</li>
              <li>- Coaching standards specific to your support operation</li>
              <li>- Company terminology the AI should recognize during analysis</li>
            </ul>
          </div>

          <form action={saveCompanyCoachingContext} className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-300">
                Company coaching context
              </span>
              <textarea
                name="coaching_context"
                defaultValue={coachingContext}
                rows={16}
                className="w-full rounded-2xl border border-white/10 bg-black px-4 py-4 text-sm leading-7 text-white"
                placeholder="Example: Customers often confuse archived projects with deleted data. Agents should explain that archived projects hide financial data until the project is unarchived, then confirm whether the customer wants step-by-step guidance."
              />
            </label>

            {saved ? (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                Settings saved.
              </div>
            ) : null}

            {errorMessage ? (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {errorMessage}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-gray-400">
                Leave this blank if you want the AI to use the standard coaching prompt only.
              </p>

              <button
                type="submit"
                className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-5 py-3 text-sm font-semibold text-indigo-300 hover:bg-indigo-500/20"
              >
                Save Context
              </button>
            </div>
          </form>
        </div>

        <div className="mt-8 rounded-3xl border border-white/10 bg-[#081225] p-8">
          <h2 className="mb-3 text-2xl font-bold text-white">Coaching Delivery Tracking</h2>

          <p className="mb-6 text-sm leading-6 text-gray-300">
            When enabled, copying a coaching message automatically marks it as delivered.
            When disabled, managers must mark delivery manually from the analysis page.
          </p>

          <form action={saveAutoMarkSetting} className="space-y-5">
            <label className="flex items-center gap-3 text-sm text-gray-200">
              <input
                type="checkbox"
                name="auto_mark"
                defaultChecked={autoMarkEnabled}
                className="h-4 w-4 rounded border-white/20 bg-black"
              />
              <span className="font-medium">
                Automatically mark coaching as delivered when Copy is clicked
              </span>
            </label>

            <div className="flex justify-end">
              <button
                type="submit"
                className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-5 py-3 text-sm font-semibold text-indigo-300 hover:bg-indigo-500/20"
              >
                Save Preference
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
