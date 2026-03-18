import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "../../../../lib/supabaseServer";
import { getCurrentOrganization } from "../../../../lib/currentOrganization";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type ChatAnalysisRow = {
  id: string;
  file_name: string | null;
  customer_name: string | null;
  issue_summary: string | null;
  empathy: number | null;
  clarity: number | null;
  ownership: number | null;
  resolution_quality: number | null;
  professionalism: number | null;
  churn_risk: string | null;
  deleted_message: boolean | null;
  missed_confirmation: boolean | null;
  premature_close: boolean | null;
};

function average(values: Array<number | null>) {
  const valid = values.filter((v): v is number => typeof v === "number");
  if (valid.length === 0) return 0;
  return Number(
    (valid.reduce((sum, value) => sum + value, 0) / valid.length).toFixed(1)
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const width = `${Math.max(0, Math.min(100, value * 10))}%`;

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-gray-300">{label}</span>
        <span className="font-semibold text-white">{value}</span>
      </div>

      <div className="h-2 rounded-full bg-white/10">
        <div className="h-2 rounded-full bg-indigo-400" style={{ width }} />
      </div>
    </div>
  );
}

export default async function AgentPage({
  params,
}: {
  params: Promise<{ name: string }>;
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

  const { name } = await params;
  const agentName = decodeURIComponent(name);

  const { data, error } = await supabase
    .from("chat_analyses")
    .select(
      "id, file_name, customer_name, issue_summary, empathy, clarity, ownership, resolution_quality, professionalism, churn_risk, deleted_message, missed_confirmation, premature_close"
    )
    .eq("organization_id", organizationId)
    .eq("agent_name", agentName)
    .neq("excluded", true)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main className="px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <Link
            href="/dashboard"
            className="mb-6 inline-block text-sm text-gray-400 hover:text-white"
          >
            ← Back to Dashboard
          </Link>

          <p className="text-red-400">Failed to load agent data.</p>
          <pre className="mt-4 text-sm text-gray-400">{error.message}</pre>
        </div>
      </main>
    );
  }

  const chats = ((data ?? []) as unknown as ChatAnalysisRow[]) || [];

  const totalChats = chats.length;
  const highChurn = chats.filter(
    (c) => (c.churn_risk || "").toLowerCase() === "high"
  ).length;
  const deletedMessages = chats.filter((c) => c.deleted_message).length;
  const missedConfirmations = chats.filter((c) => c.missed_confirmation).length;
  const prematureClose = chats.filter((c) => c.premature_close).length;

  const avgScores = {
    empathy: average(chats.map((c) => c.empathy)),
    clarity: average(chats.map((c) => c.clarity)),
    ownership: average(chats.map((c) => c.ownership)),
    resolution: average(chats.map((c) => c.resolution_quality)),
    professionalism: average(chats.map((c) => c.professionalism)),
  };

  const recentChats = chats.slice(0, 10);

  return (
    <main className="px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/dashboard"
          className="mb-6 inline-block text-sm text-gray-400 hover:text-white"
        >
          ← Back to Dashboard
        </Link>

        <h1 className="mb-3 text-4xl font-bold">{agentName}</h1>

        <p className="mb-10 text-gray-400">
          Individual performance insights based on analyzed support chats.
        </p>

        <div className="mb-10 grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-[#081225] p-6">
            <p className="text-sm text-gray-400">Chats Reviewed</p>
            <p className="text-3xl font-bold">{totalChats}</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#081225] p-6">
            <p className="text-sm text-gray-400">High Churn Risk</p>
            <p className="text-3xl font-bold text-red-400">{highChurn}</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#081225] p-6">
            <p className="text-sm text-gray-400">Deleted Messages</p>
            <p className="text-3xl font-bold">{deletedMessages}</p>
          </div>
        </div>

        <div className="mb-10 rounded-3xl border border-white/10 bg-[#081225] p-8">
          <h2 className="mb-6 text-2xl font-semibold">Performance Scores</h2>

          <div className="grid gap-6 md:grid-cols-2">
            <ScoreBar label="Empathy" value={avgScores.empathy} />
            <ScoreBar label="Clarity" value={avgScores.clarity} />
            <ScoreBar label="Ownership" value={avgScores.ownership} />
            <ScoreBar label="Resolution Quality" value={avgScores.resolution} />
            <ScoreBar
              label="Professionalism"
              value={avgScores.professionalism}
            />
          </div>
        </div>

        <div className="mb-10 grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-[#081225] p-8">
            <h2 className="mb-4 text-2xl font-semibold">Coaching Signals</h2>

            <ul className="space-y-2 text-gray-300">
              <li>Missed Confirmations: {missedConfirmations}</li>
              <li>Premature Close: {prematureClose}</li>
              <li>Deleted Messages: {deletedMessages}</li>
            </ul>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#081225] p-8">
            <h2 className="mb-4 text-2xl font-semibold">Churn Risk Chats</h2>

            <p className="text-gray-300">
              {highChurn} conversations contained signals indicating potential
              customer churn risk.
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-[#081225] p-8">
          <h2 className="mb-6 text-2xl font-semibold">Recent Chats</h2>

          <div className="space-y-4">
            {recentChats.length === 0 ? (
              <p className="text-gray-400">No chats found.</p>
            ) : (
              recentChats.map((chat) => (
                <div
                  key={chat.id}
                  className="rounded-xl border border-white/10 bg-black/20 p-5"
                >
                  <p className="font-semibold text-white">
                    {chat.customer_name || "Unknown Customer"}
                  </p>

                  <p className="text-sm text-gray-400">
                    {chat.file_name || "Unknown File"}
                  </p>

                  <p className="mt-2 text-gray-300">
                    {chat.issue_summary || "No issue summary."}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}