// src/app/jobs/[id]/page.tsx
import { createClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "../../../lib/supabaseServer";
import { getCurrentOrganization } from "../../../lib/currentOrganization";
import WorkerTriggerButton from "../../../components/WorkerTriggerButton";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type Job = {
  id: string;
  status: string;
  total_files: number;
  processed_files: number;
  created_at: string;
};

type JobItem = {
  id: string;
  file_name: string;
  status: string;
  created_at: string;
  analysis_id?: string | null;
};

function getProgressPercent(processed: number, total: number) {
  if (!total || total <= 0) return 0;
  return Math.min(100, Math.round((processed / total) * 100));
}

function formatJobDisplayName(createdAt: string) {
  const formatted = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(createdAt));

  return `Upload — ${formatted}`;
}

function getStatusClasses(status: string) {
  if (status === "completed") {
    return "border border-emerald-500/20 bg-emerald-500/15 text-emerald-300";
  }

  if (status === "processing") {
    return "border border-yellow-500/20 bg-yellow-500/15 text-yellow-300";
  }

  if (status === "pending") {
    return "border border-blue-500/20 bg-blue-500/15 text-blue-300";
  }

  return "border border-red-500/20 bg-red-500/15 text-red-300";
}

export default async function JobDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
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

  const { data: job } = await supabase
    .from("analysis_jobs")
    .select("id, status, total_files, processed_files, created_at")
    .eq("id", id)
    .eq("organization_id", organizationId)
    .maybeSingle();

  const { data: items } = await supabase
    .from("analysis_job_items")
    .select("id, file_name, status, created_at, analysis_id")
    .eq("job_id", id)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true });

  const progress = job
    ? getProgressPercent(job.processed_files || 0, job.total_files || 0)
    : 0;

  return (
    <main className="px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <div className="mb-6 flex flex-wrap items-center gap-4 text-sm">
            <a href="/upload" className="text-gray-400 hover:text-white">
               ← Back to Upload
            </a>

            <a href="/jobs" className="text-gray-400 hover:text-white">
              View All Jobs
            </a>
          </div>

          <div className="mb-3 inline-flex items-center rounded-full border border-blue-400/20 bg-blue-400/10 px-3 py-1 text-xs font-medium text-blue-300">
            Job Details
          </div>

          <h1 className="mb-3 text-4xl font-bold tracking-tight">
            {job ? formatJobDisplayName(job.created_at) : "Analysis Job"}
          </h1>

          <p className="text-gray-400">
            Detailed status view for one transcript processing batch.
          </p>
        </div>

        {!job ? (
          <div className="rounded-3xl border border-white/10 bg-[#081225] p-8 text-gray-400">
            Job not found.
          </div>
        ) : (
          <>
            <div className="mb-8 rounded-3xl border border-white/10 bg-[#081225] p-6">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="mb-2 text-white">
                    <span className="font-semibold">Job:</span>{" "}
                    {formatJobDisplayName(job.created_at)}
                  </div>
                  <div className="mb-2 text-gray-300">Total Files: {job.total_files}</div>
                  <div className="mb-2 text-gray-300">
                    Processed Files: {job.processed_files}
                  </div>
                  <div className="text-gray-400">
                    Created: {new Date(job.created_at).toLocaleString()}
                  </div>
                </div>

                <div
                  className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${getStatusClasses(
                    job.status
                  )}`}
                >
                  {job.status}
                </div>
              </div>

              <div className="mb-3 flex items-center justify-between text-sm text-gray-300">
                <span>Progress</span>
                <span>{progress}%</span>
              </div>

              <div className="h-3 rounded-full bg-white/10">
                <div
                  className="h-3 rounded-full bg-blue-400"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <WorkerTriggerButton
                  label="Process Now"
                  className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 px-4 py-2 text-sm font-semibold text-yellow-300 hover:bg-yellow-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                />

                <a
                  href="/upload"
                  className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-gray-300 hover:bg-white/5 hover:text-white"
                >
                  Back to Upload
                </a>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#081225] p-6">
              <h2 className="mb-4 text-2xl font-semibold text-white">
                Job Items
              </h2>

              <div className="space-y-3">
                {!items || items.length === 0 ? (
                  <p className="text-gray-400">No items found.</p>
                ) : (
                  items.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-white/10 bg-black/20 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-white">
                            {item.file_name}
                          </p>
                          <p className="text-sm text-gray-400">
                            {new Date(item.created_at).toLocaleString()}
                          </p>
                        </div>

                        <div
                          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${getStatusClasses(
                            item.status
                          )}`}
                        >
                          {item.status}
                        </div>
                      </div>

                      {item.analysis_id ? (
                        <div className="mt-3">
                          <a
                            href={`/analysis/${item.analysis_id}`}
                            className="text-sm font-semibold text-indigo-300 hover:text-indigo-200"
                          >
                            View Analysis 
                          </a>
                        </div>
                      ) : item.status === "completed" ? (
                        <div className="mt-3 text-sm text-gray-500">
                          Analysis link not available for older processed items.
                        </div>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}