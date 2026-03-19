import Link from "next/link";

const features = [
  {
    name: "AI Coaching Analysis",
    description:
      "Turn support transcripts into clear coaching feedback, scorecards, churn risk signals, and chat-level action items for every agent.",
  },
  {
    name: "Topic Intelligence",
    description:
      "Spot the product areas driving support volume, coaching trends, and team-wide issue patterns before they become recurring problems.",
  },
  {
    name: "Manager Reports",
    description:
      "Generate polished summaries for leadership with AI-written reports, exports, and performance snapshots built for fast review.",
  },
];

const tiers = [
  {
    name: "Starter",
    price: "$29",
    audience: "For small support teams that need fast AI-powered QA.",
    features: [
      "PDF upload and transcript analysis",
      "Quick summary, coaching message, and attention priority",
      "Analysis detail view for individual chat review",
      "Manager dashboard with team averages, trends, and score charts",
      "Agent leaderboard and single-agent views",
      "AI manager reports, PDF export, CSV export, and job management",
    ],
  },
  {
    name: "Professional",
    price: "$59",
    audience: "For support managers who need operational visibility by topic.",
    features: [
      "Everything in Starter",
      "Topic Intelligence Dashboard with volume, scores, flags, and agent breakdowns",
      "Coaching Insights by Topic and team-wide coaching pattern detection",
      "\"This Month\" and \"Last Month\" date range options",
      "\"Chats Needing Attention\" filtered view",
    ],
  },
  {
    name: "Enterprise",
    price: "$99",
    audience: "For larger organizations scaling support insights across systems.",
    features: [
      "Everything in Professional",
      "AI-generated FAQ suggestions from chat data",
      "Helpdesk integrations for platforms like Zendesk and Intercom",
      "Topic normalization and managed taxonomies",
      "API access, SSO, and priority support",
    ],
  },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-black text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.14),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(99,102,241,0.16),_transparent_30%),linear-gradient(180deg,_#04070d_0%,_#050816_45%,_#000000_100%)]" />

      <div className="relative">
        <section className="px-6 pb-20 pt-24 sm:px-8 lg:px-12">
          <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div>
              <div className="mb-6 inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300">
                Support QA Intelligence
              </div>

              <h1 className="max-w-4xl text-5xl font-semibold tracking-tight text-white sm:text-6xl lg:text-7xl">
                SupportCoach AI
              </h1>

              <p className="mt-6 max-w-2xl text-lg leading-8 text-gray-300 sm:text-xl">
                AI coaching and support intelligence for teams that want sharper
                agent feedback, cleaner management reporting, and clearer visibility
                into what customers are struggling with.
              </p>

              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center rounded-xl bg-emerald-400 px-6 py-3 text-sm font-semibold text-black transition hover:bg-emerald-300"
                >
                  Get Started
                </Link>

                <div className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm text-gray-300">
                  Built for modern support managers
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-[#081225]/90 p-6 shadow-[0_0_80px_rgba(8,18,37,0.7)] sm:p-8">
              <div className="rounded-[1.5rem] border border-white/10 bg-black/30 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Platform focus</p>
                    <p className="mt-1 text-2xl font-semibold text-white">
                      Coaching that scales
                    </p>
                  </div>
                  <div className="rounded-full border border-indigo-400/20 bg-indigo-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-300">
                    Live QA
                  </div>
                </div>

                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-sm text-gray-400">Coaching output</p>
                    <p className="mt-2 text-3xl font-semibold text-white">1 chat</p>
                    <p className="mt-2 text-sm text-gray-300">
                      One transcript becomes a full analysis, score breakdown, and
                      manager-ready coaching message.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-sm text-gray-400">Team visibility</p>
                    <p className="mt-2 text-3xl font-semibold text-white">3 layers</p>
                    <p className="mt-2 text-sm text-gray-300">
                      Chat-level review, topic trends, and manager reporting in one
                      workflow.
                    </p>
                  </div>
                </div>

                <div className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
                  <p className="text-sm font-semibold text-emerald-300">
                    Designed to separate product friction from agent performance.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="px-6 py-20 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-6xl">
            <div className="mb-10 max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-300">
                Core Features
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Built for coaching quality, operational clarity, and manager speed
              </h2>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {features.map((feature, index) => (
                <div
                  key={feature.name}
                  className="rounded-3xl border border-white/10 bg-[#081225] p-8"
                >
                  <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-sm font-semibold text-emerald-300">
                    0{index + 1}
                  </div>
                  <h3 className="text-2xl font-semibold text-white">{feature.name}</h3>
                  <p className="mt-4 leading-7 text-gray-300">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 pb-24 pt-8 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-6xl rounded-[2rem] border border-white/10 bg-[#050b18] p-8 sm:p-10 lg:p-12">
            <div className="mb-10 max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-300">
                Pricing
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Plans for every stage of support team growth
              </h2>
              <p className="mt-4 text-gray-300">
                All pricing is billed per agent, per month.
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {tiers.map((tier) => (
                <div
                  key={tier.name}
                  className="flex h-full flex-col rounded-3xl border border-white/10 bg-black/30 p-8"
                >
                  <div className="mb-6">
                    <h3 className="text-2xl font-semibold text-white">{tier.name}</h3>
                    <p className="mt-4 text-4xl font-semibold text-white">
                      {tier.price}
                      <span className="text-base font-medium text-gray-400">
                        /agent/month
                      </span>
                    </p>
                    <p className="mt-4 text-sm leading-6 text-gray-300">
                      {tier.audience}
                    </p>
                  </div>

                  <ul className="space-y-3 text-sm leading-6 text-gray-300">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex gap-3">
                        <span className="mt-1 h-2 w-2 rounded-full bg-indigo-400" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-8">
                    <Link
                      href="/signup"
                      className="inline-flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:border-emerald-400/40 hover:bg-emerald-400/10"
                    >
                      Get Started
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
