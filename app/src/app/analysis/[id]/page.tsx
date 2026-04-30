import { createClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "../../../lib/supabaseServer";
import { getCurrentOrganization } from "../../../lib/currentOrganization";
import CopyButton from "../../../components/CopyButton";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type Analysis = {
  id: string;
  organization_id: string | null;
  file_name: string | null;
  agent_name: string | null;
  customer_name: string | null;
  chat_type: string | null;
  issue_summary: string | null;
  what_you_did_well: string[] | null;
  improvement_areas: string[] | null;
  what_this_chat_really_was: string | null;
  how_this_could_be_handled: string[] | null;
  summary_strengths: string[] | null;
  summary_improvements: string[] | null;
  quick_summary: string | null;
  copy_coaching_message: string | null;
  attention_priority: string | null;
  empathy: number | null;
  clarity: number | null;
  ownership: number | null;
  resolution_quality: number | null;
  professionalism: number | null;
  churn_risk: string | null;
  deleted_message: boolean | null;
  missed_confirmation: boolean | null;
  premature_close: boolean | null;
  product_limitation_chat: boolean | null;
  customer_frustration_present: boolean | null;
  escalation_done_well: boolean | null;
  excluded: boolean | null;
};

function ListSection({
  title,
  items,
}: {
  title: string;
  items: string[] | null | undefined;
}) {
  if (!items || items.length === 0) return null;

  return (
    <div className="rounded-3xl border border-white/10 bg-[#081225] p-6">
      <h2 className="mb-4 text-2xl font-semibold text-white">{title}</h2>
      <ul className="space-y-2 text-gray-300">
        {items.map((item, index) => (
          <li key={index}>• {item}</li>
        ))}
      </ul>
    </div>
  );
}

function getPriorityClasses(priority: string | null | undefined) {
  const normalized = (priority || "").toLowerCase();

  if (normalized === "high") {
    return "border border-red-500/20 bg-red-500/15 text-red-300";
  }

  if (normalized === "medium") {
    return "border border-yellow-500/20 bg-yellow-500/15 text-yellow-300";
  }

  return "border border-emerald-500/20 bg-emerald-500/15 text-emerald-300";
}

function getRiskClasses(risk: string | null | undefined) {
  const normalized = (risk || "").toLowerCase();

  if (normalized === "high") {
    return "border border-red-500/20 bg-red-500/15 text-red-300";
  }

  if (normalized === "medium") {
    return "border border-yellow-500/20 bg-yellow-500/15 text-yellow-300";
  }

  return "border border-emerald-500/20 bg-emerald-500/15 text-emerald-300";
}

function formatLabel(value: string | null | undefined) {
  if (!value) return "-";

  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeCoachingText(text: string) {
  return text
    .replace(/:white_check_mark:/g, "✅")
    .replace(/:warning:/g, "⚠️")
    .replace(/:brain:/g, "🧠")
    .replace(/:pushpin:/g, "📌")
    .replace(/:one:/g, "1.")
    .replace(/:two:/g, "2.")
    .replace(/:three:/g, "3.")
    .replace(/:four:/g, "4.");
}

function CoachingMessageSection({
  text,
  analysisId,
}: {
  text: string;
  analysisId: string;
}) {
  const normalized = normalizeCoachingText(text);
  const lines = normalized
    .split(/\r?\n/)
    .map((line) => line.trimEnd());

  return (
    <div className="rounded-3xl border border-white/10 bg-[#081225] p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold text-white">Copy Coaching Message</h2>

        {text.trim() ? (
          <CopyButton
            text={text}
            analysisId={String(analysisId)}
            idleLabel="Copy Message"
            className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-4 py-2 text-sm font-semibold text-indigo-300 hover:bg-indigo-500/20"
          />
        ) : null}
      </div>

      {!text.trim() ? (
        <p className="text-gray-400">No coaching message available.</p>
      ) : (
        <div className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-5 text-[15px] leading-7 text-gray-200">
          {lines.map((line, index) => {
            const trimmed = line.trim();

            if (!trimmed) {
              return <div key={index} className="h-2" />;
            }

            const isSectionHeader =
              trimmed.startsWith("✅") ||
              trimmed.startsWith("⚠️") ||
              trimmed.startsWith("🧠") ||
              trimmed.startsWith("📌");

            const isBullet = trimmed.startsWith("- ") || trimmed.startsWith("• ");
            const isNumbered = /^\d+\.\s/.test(trimmed);
            const isSubLabel =
              trimmed === "Strengths" || trimmed === "Key Improvement Areas";

            if (isSectionHeader) {
              return (
                <h3 key={index} className="pt-2 text-lg font-semibold text-white">
                  {trimmed}
                </h3>
              );
            }

            if (isSubLabel) {
              return (
                <h4
                  key={index}
                  className="pt-1 text-sm font-semibold uppercase tracking-wide text-gray-400"
                >
                  {trimmed}
                </h4>
              );
            }

            if (isBullet) {
              return (
                <div key={index} className="pl-4 text-gray-200">
                  • {trimmed.replace(/^[-•]\s*/, "")}
                </div>
              );
            }

            if (isNumbered) {
              return (
                <div key={index} className="pl-1 text-gray-200">
                  {trimmed}
                </div>
              );
            }

            return (
              <p key={index} className="text-gray-200">
                {trimmed}
              </p>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BooleanPill({
  label,
  value,
}: {
  label: string;
  value: boolean | null | undefined;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
      <div className="mb-1 text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className={value ? "font-semibold text-yellow-300" : "font-semibold text-gray-300"}>
        {value ? "Yes" : "No"}
      </div>
    </div>
  );
}

export default async function AnalysisDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ reanalyzed?: string; error?: string }>;
}) {
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

  const { id } = await params;
  const resolvedSearchParams = (await searchParams) || {};

  const { data, error } = await supabase
    .from("chat_analyses")
    .select("*")
    .eq("id", id)
    .eq("organization_id", organizationId)
    .single();

  if (error || !data) {
    return (
      <main className="px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <a href="/jobs" className="mb-6 inline-block text-sm text-gray-400 hover:text-white">
            ← Back to Jobs
          </a>
          <div className="rounded-3xl border border-white/10 bg-[#081225] p-8 text-gray-400">
            Analysis not found.
          </div>
        </div>
      </main>
    );
  }

  const analysis = data as Analysis;
  const coachingMessage = analysis.copy_coaching_message?.trim() || "";
  const quickSummary = analysis.quick_summary?.trim() || "";
  const isExcluded = analysis.excluded === true;
  const reanalyzed = resolvedSearchParams.reanalyzed === "1";
  const pageError =
    typeof resolvedSearchParams.error === "string" &&
    resolvedSearchParams.error.trim().length > 0
      ? resolvedSearchParams.error.trim()
      : "";

  return (
    <main className="px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <a
            href="/jobs"
            className="mb-6 inline-block text-sm text-gray-400 hover:text-white"
          >
            ← Back to Jobs
          </a>

          <div className="mb-3 inline-flex items-center rounded-full border border-indigo-400/20 bg-indigo-400/10 px-3 py-1 text-xs font-medium text-indigo-300">
            Analysis Detail
          </div>

          <h1 className="mb-3 text-4xl font-bold tracking-tight">
            {analysis.agent_name || "Unknown Agent"} →{" "}
            {analysis.customer_name || "Unknown Customer"}
          </h1>

          <p className="text-gray-400">{analysis.file_name || "Unknown File"}</p>
        </div>

        {reanalyzed ? (
          <div className="mb-8 rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-300">
            Chat re-analyzed successfully using the latest saved company coaching context.
          </div>
        ) : null}

        {pageError ? (
          <div className="mb-8 rounded-3xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            {pageError}
          </div>
        ) : null}

        <div className="mb-8 rounded-3xl border border-white/10 bg-[#081225] p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-semibold text-white">Report Visibility</h2>

              {isExcluded ? (
                <div className="rounded-full border border-red-500/20 bg-red-500/15 px-3 py-1 text-xs font-semibold uppercase text-red-300">
                  Excluded From Reports
                </div>
              ) : (
                <div className="rounded-full border border-emerald-500/20 bg-emerald-500/15 px-3 py-1 text-xs font-semibold uppercase text-emerald-300">
                  Included In Reports
                </div>
              )}
            </div>

            <form method="post" action="/api/toggle-exclude">
              <input type="hidden" name="analysis_id" value={analysis.id} />
              <input type="hidden" name="excluded" value={isExcluded ? "false" : "true"} />
              <input type="hidden" name="return_to" value={`/analysis/${analysis.id}`} />
              <button
                type="submit"
                className={
                  isExcluded
                    ? "rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/20"
                    : "rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/20"
                }
              >
                {isExcluded ? "Include In Reports" : "Exclude From Reports"}
              </button>
            </form>
          </div>

          <p className="text-sm text-gray-400">
            Excluded chats remain viewable here, but they are removed from dashboards,
            reports, exports, and topic intelligence until included again.
          </p>
        </div>

        <div className="mb-8 rounded-3xl border border-white/10 bg-[#081225] p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold text-white">Re-Analyze Chat</h2>
              <p className="mt-2 text-sm text-gray-400">
                Re-run this analysis against the stored transcript using the latest prompt and
                company coaching context from Settings.
              </p>
            </div>

            <form method="post" action="/api/reanalyze-analysis">
              <input type="hidden" name="analysis_id" value={analysis.id} />
              <input type="hidden" name="return_to" value={`/analysis/${analysis.id}`} />
              <button
                type="submit"
                className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-4 py-2 text-sm font-semibold text-indigo-300 hover:bg-indigo-500/20"
              >
                Re-Analyze Chat
              </button>
            </form>
          </div>
        </div>

        <div className="mb-8 rounded-3xl border border-white/10 bg-[#081225] p-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold text-white">10-Second Coaching Summary</h2>
            <div
              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${getPriorityClasses(
                analysis.attention_priority
              )}`}
            >
              {analysis.attention_priority || "low"} priority
            </div>
          </div>

          <p className="text-gray-300">
            {quickSummary || "No quick coaching summary available."}
          </p>
        </div>

        <div className="mb-8">
          <CoachingMessageSection text={coachingMessage} analysisId={String(analysis.id)} />
        </div>

        <div className="mb-8 rounded-3xl border border-white/10 bg-[#081225] p-6">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div
              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${getRiskClasses(
                analysis.churn_risk
              )}`}
            >
              {analysis.churn_risk || "low"} churn risk
            </div>

            <div
              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${getPriorityClasses(
                analysis.attention_priority
              )}`}
            >
              {analysis.attention_priority || "low"} attention priority
            </div>

            <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase text-gray-300">
              {formatLabel(analysis.chat_type)}
            </div>
          </div>

          <div className="grid gap-4 text-sm text-gray-300 md:grid-cols-3">
            <div>Empathy: {analysis.empathy ?? "-"}</div>
            <div>Clarity: {analysis.clarity ?? "-"}</div>
            <div>Ownership: {analysis.ownership ?? "-"}</div>
            <div>Resolution Quality: {analysis.resolution_quality ?? "-"}</div>
            <div>Professionalism: {analysis.professionalism ?? "-"}</div>
            <div>Agent: {analysis.agent_name || "-"}</div>
            <div>Customer: {analysis.customer_name || "-"}</div>
            <div>File: {analysis.file_name || "-"}</div>
            <div>Analysis ID: {analysis.id}</div>
          </div>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <BooleanPill label="Deleted Message" value={analysis.deleted_message} />
          <BooleanPill label="Missed Confirmation" value={analysis.missed_confirmation} />
          <BooleanPill label="Premature Close" value={analysis.premature_close} />
          <BooleanPill
            label="Product Limitation Chat"
            value={analysis.product_limitation_chat}
          />
          <BooleanPill
            label="Customer Frustration"
            value={analysis.customer_frustration_present}
          />
          <BooleanPill
            label="Escalation Done Well"
            value={analysis.escalation_done_well}
          />
        </div>

        <div className="mb-8 rounded-3xl border border-white/10 bg-[#081225] p-6">
          <h2 className="mb-4 text-2xl font-semibold text-white">Issue Summary</h2>
          <p className="text-gray-300">{analysis.issue_summary || "No summary."}</p>
        </div>

        {analysis.what_this_chat_really_was && (
          <div className="mb-8 rounded-3xl border border-white/10 bg-[#081225] p-6">
            <h2 className="mb-4 text-2xl font-semibold text-white">
              What This Chat Really Was
            </h2>
            <p className="text-gray-300">{analysis.what_this_chat_really_was}</p>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <ListSection title="What You Did Well" items={analysis.what_you_did_well} />
          <ListSection title="Improvement Areas" items={analysis.improvement_areas} />
          <ListSection
            title="How This Could Be Handled"
            items={analysis.how_this_could_be_handled}
          />
          <ListSection title="Summary Strengths" items={analysis.summary_strengths} />
          <ListSection
            title="Summary Improvements"
            items={analysis.summary_improvements}
          />
        </div>
      </div>
    </main>
  );
}
