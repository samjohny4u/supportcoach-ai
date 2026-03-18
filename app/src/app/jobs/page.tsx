// src/app/jobs/page.tsx
import { createClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "../../lib/supabaseServer";
import { getCurrentOrganization } from "../../lib/currentOrganization";

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

export default async function JobsPage() {
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

  const { data, error } = await supabase
    .from("analysis_jobs")
    .select("id, status, total_files, processed_files, created_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  const jobs = (data || []) as Job[];

  return (
    <main className="px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <a
            href="/upload"
            className="mb-6 inline-block text-sm text-gray-400 hover:text-white"
          >
            â† Back to Upload
          </a>

          <div className="mb-3 inline-flex items-center rounded-full border border-blue-400/20 bg-blue-400/10 px-3 py-1 text-xs font-medium text-blue-300">
            Analysis Job Queue
          </div>

          <h1 className="mb-3 text-4xl font-bold tracking-tight">
            Processing Jobs
          </h1>

          <p className="text-gray-400">
            Track transcript analysis jobs, progress, and completion status.
          </p>
        </div>

        {error ? (
          <div className="rounded-3xl border border-white/10 bg-[#081225] p-8 text-gray-400">
            Failed to load jobs.
            <pre className="mt-4 text-sm text-gray-500">{error.message}</pre>
          </div>
        ) : (
          <div className="space-y-5">
            {jobs.length === 0 ? (
              <div className="rounded-3xl border border-white/10 bg-[#081225] p-8 text-gray-400">
                No jobs found yet.
              </div>
            ) : (
              jobs.map((job) => {
                const progress = getProgressPercent(
                  job.processed_files || 0,
                  job.total_files || 0
                );

                return (
                  <div
                    key={job.id}
                    className="rounded-3xl border border-white/10 bg-[#081225] p-6"
                  >
                    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold text-white">
                          {formatJobDisplayName(job.created_at)}
                        </p>
                        <p className="text-sm text-gray-400">
                          Created {new Date(job.created_at).toLocaleString()}
                        </p>
                      </div>

                      <div
                        className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${getStatusClasses(
                          job.status
                        )}`}
                      >
                        {job.status}
                      </div>
                    </div>

                    <div className="mb-3 grid gap-2 text-sm text-gray-300 md:grid-cols-3">
                      <div>Total Files: {job.total_files}</div>
                      <div>Processed: {job.processed_files}</div>
                      <div>Progress: {progress}%</div>
                    </div>

                    <div className="h-3 rounded-full bg-white/10">
                      <div
                        className="h-3 rounded-full bg-blue-400"
                        style={{ width: `${progress}%` }}
                      />
                    </div>

                    <div className="mt-4">
                      <a
                        href={`/jobs/${job.id}`}
                        className="text-sm text-indigo-300 hover:text-indigo-200"
                      >
                        View Job Details â†’
                      </a>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </main>
  );
}