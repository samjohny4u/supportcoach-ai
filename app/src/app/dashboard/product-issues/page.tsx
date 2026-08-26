import { createClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "../../../lib/supabaseServer";
import { getCurrentOrganization } from "../../../lib/currentOrganization";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type ProductIssueRow = {
  id: string;
  created_at: string | null;
  agent_name: string | null;
  customer_name: string | null;
  chat_type: string | null;
  issue_summary: string | null;
  churn_risk: string | null;
  attention_priority: string | null;
};

function formatLabel(value: string | null | undefined) {
  if (!value) return "Uncategorized";

  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
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

function formatDate(value: string | null) {
  if (!value) return "Unknown date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return date.toISOString().split("T")[0];
}

export default async function ProductIssuesPage({
  searchParams,
}: {
  searchParams?: Promise<{ range?: string }>;
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

  const resolvedSearchParams = (await searchParams) || {};
  const selectedRange =
    resolvedSearchParams.range === "30d" || resolvedSearchParams.range === "90d"
      ? resolvedSearchParams.range
      : "all";

  let query = supabase
    .from("chat_analyses")
    .select(
      "id, created_at, agent_name, customer_name, chat_type, issue_summary, churn_risk, attention_priority"
    )
    .eq("organization_id", organizationId)
    .eq("excluded", false)
    .eq("product_limitation_chat", true)
    .order("created_at", { ascending: false });

  if (selectedRange === "30d") {
    query = query.gte(
      "created_at",
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    );
  } else if (selectedRange === "90d") {
    query = query.gte(
      "created_at",
      new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
    );
  }

  let rows: ProductIssueRow[] = [];
  let loadError = "";

  try {
    const { data, error } = await query;
    if (error) {
      loadError = "Could not load product issues. Please try refreshing the page.";
    } else {
      rows = (data || []) as ProductIssueRow[];
    }
  } catch {
    loadError = "Could not load product issues. Please try refreshing the page.";
  }

  const groups = new Map<string, ProductIssueRow[]>();
  for (const row of rows) {
    const key = formatLabel(row.chat_type);
    const existing = groups.get(key);
    if (existing) {
      existing.push(row);
    } else {
      groups.set(key, [row]);
    }
  }

  const sortedGroups = Array.from(groups.entries()).sort(
    (a, b) => b[1].length - a[1].length
  );

  const rangeLabel =
    selectedRange === "30d"
      ? "last 30 days"
      : selectedRange === "90d"
        ? "last 90 days"
        : "all time";

  return (
    <main className="px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <a
            href="/dashboard"
            className="mb-6 inline-block text-sm text-gray-400 hover:text-white"
          >
            ← Back to Dashboard
          </a>

          <div className="mb-3 inline-flex items-center rounded-full border border-red-400/20 bg-red-400/10 px-3 py-1 text-xs font-medium text-red-300">
            Product Issues
          </div>

          <h1 className="mb-3 text-4xl font-bold tracking-tight">
            Product-Driven Frustration
          </h1>

          <p className="max-w-3xl text-gray-300">
            Chats where the blocker was the product itself — bugs, glitches, or missing
            features — not the agent. Grouped by topic for the product team.
          </p>
        </div>

        <div className="mb-8 flex flex-wrap items-center gap-3">
          {[
            { value: "30d", label: "Last 30 Days" },
            { value: "90d", label: "Last 90 Days" },
            { value: "all", label: "All Time" },
          ].map((option) => (
            <a
              key={option.value}
              href={`/dashboard/product-issues?range=${option.value}`}
              className={
                selectedRange === option.value
                  ? "rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black"
                  : "rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-gray-300 hover:bg-white/5 hover:text-white"
              }
            >
              {option.label}
            </a>
          ))}
        </div>

        {loadError ? (
          <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-8 text-red-300">
            {loadError}
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-[#081225] p-8 text-gray-400">
            No product-limitation chats found for {rangeLabel}.
          </div>
        ) : (
          <>
            <div className="mb-8 rounded-3xl border border-white/10 bg-[#081225] p-6">
              <p className="text-gray-300">
                {rows.length} {rows.length === 1 ? "chat" : "chats"} where the product was
                the blocker ({rangeLabel}), across {sortedGroups.length}{" "}
                {sortedGroups.length === 1 ? "topic" : "topics"}.
              </p>
            </div>

            <div className="space-y-8">
              {sortedGroups.map(([topic, topicRows]) => (
                <div
                  key={topic}
                  className="rounded-3xl border border-white/10 bg-[#081225] p-6"
                >
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-2xl font-semibold text-white">{topic}</h2>
                    <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase text-gray-300">
                      {topicRows.length} {topicRows.length === 1 ? "chat" : "chats"}
                    </div>
                  </div>

                  <div className="space-y-4">
                    {topicRows.map((row) => (
                      <div
                        key={row.id}
                        className="rounded-2xl border border-white/10 bg-black/20 p-5"
                      >
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                          <div className="text-sm text-gray-400">
                            {formatDate(row.created_at)} · Agent:{" "}
                            {row.agent_name || "Unknown"} · Customer:{" "}
                            {row.customer_name || "Unknown"}
                          </div>
                          <div
                            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${getRiskClasses(
                              row.churn_risk
                            )}`}
                          >
                            {row.churn_risk || "low"} churn risk
                          </div>
                        </div>

                        <p className="mb-3 text-sm text-gray-200">
                          {row.issue_summary || "No issue summary recorded."}
                        </p>

                        <a
                          href={`/analysis/${row.id}`}
                          className="text-xs font-semibold text-indigo-300 hover:text-indigo-200"
                        >
                          View analysis →
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
