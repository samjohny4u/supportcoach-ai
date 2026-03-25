"use client";

import Link from "next/link";
import { useState } from "react";

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
    monthlyPrice: "$29",
    annualPrice: "$290",
    annualMonthly: "$24",
    audience: "For small support teams that need fast AI-powered QA.",
    highlighted: false,
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
    monthlyPrice: "$59",
    annualPrice: "$590",
    annualMonthly: "$49",
    audience: "For support managers who need operational visibility by topic.",
    highlighted: true,
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
    monthlyPrice: "$99",
    annualPrice: "$990",
    annualMonthly: "$83",
    audience: "For larger organizations scaling support insights across systems.",
    highlighted: false,
    features: [
      "Everything in Professional",
      "AI-generated FAQ suggestions from chat data",
      "Helpdesk integrations for platforms like Zendesk and Intercom",
      "Topic normalization and managed taxonomies",
      "API access, SSO, and priority support",
    ],
  },
];

const faqs = [
  {
    question: "What file formats do you support?",
    answer:
      "Currently SupportCoach AI supports PDF transcripts exported from your helpdesk or chat platform. Support for additional formats including direct helpdesk integrations (Zendesk, Intercom, Zoho SalesIQ) is coming soon.",
  },
  {
    question: "Is there a free trial?",
    answer:
      "Yes — all plans include a 14-day free trial with full access to every feature. No credit card required to start. You will only be billed after the trial ends if you choose to continue.",
  },
  {
    question: "How does per-agent pricing work?",
    answer:
      "You pay per agent seat — one seat per support agent whose chats you want to analyze and coach. Managers and admins do not count as agent seats. You can add or remove seats at any time.",
  },
  {
    question: "How long does analysis take per chat?",
    answer:
      "Most transcripts are fully analyzed within 30–60 seconds of upload. You get a complete coaching breakdown, scorecard, churn risk signal, and manager-ready coaching message for every chat.",
  },
  {
    question: "Does it work with our helpdesk?",
    answer:
      "Today you can export PDF transcripts from any helpdesk and upload them directly. Native integrations with Zendesk, Intercom, Freshdesk, and Zoho SalesIQ are on the roadmap and coming to Enterprise plans.",
  },
  {
    question: "Is our chat data secure?",
    answer:
      "Yes. All data is encrypted in transit and at rest. Each organization's data is fully isolated — no data is shared between customers. Transcripts are processed securely and never used to train AI models.",
  },
  {
    question: "What happens when the trial ends?",
    answer:
      "If you choose a plan before the trial ends, your account continues without interruption. If the trial expires without a plan selection, your account is locked until you subscribe. Your data is never deleted.",
  },
  {
    question: "Can I cancel anytime?",
    answer:
      "Yes. You can cancel your subscription at any time from the billing page. Your access continues until the end of the current billing period. No cancellation fees.",
  },
  {
    question: "How accurate is the AI coaching?",
    answer:
      "SupportCoach AI uses a structured scoring rubric with explicit criteria for every score and flag. You can also add your company's specific processes, product rules, and coaching standards — the AI incorporates them into every analysis so feedback reflects how your team actually operates, not generic QA advice.",
  },
];

export default function Home() {
  const [annual, setAnnual] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <main className="min-h-screen overflow-hidden bg-black text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.14),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(99,102,241,0.16),_transparent_30%),linear-gradient(180deg,_#04070d_0%,_#050816_45%,_#000000_100%)]" />

      <div className="relative">

        {/* Hero */}
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
                    <p className="mt-1 text-2xl font-semibold text-white">Coaching that scales</p>
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
                      One transcript becomes a full analysis, score breakdown, and manager-ready coaching message.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-sm text-gray-400">Team visibility</p>
                    <p className="mt-2 text-3xl font-semibold text-white">3 layers</p>
                    <p className="mt-2 text-sm text-gray-300">
                      Chat-level review, topic trends, and manager reporting in one workflow.
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

        {/* Features */}
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

        {/* Pricing */}
        <section className="px-6 pb-24 pt-8 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-6xl rounded-[2rem] border border-white/10 bg-[#050b18] p-8 sm:p-10 lg:p-12">

            <div className="mb-10 max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-300">
                Pricing
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Plans for every stage of support team growth
              </h2>
              <p className="mt-4 text-gray-300">All pricing is billed per agent.</p>
            </div>

            {/* ROI Stats Bar */}
            <div className="mb-10 rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-6">
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
                The ROI case
              </p>
              <p className="mb-6 text-sm text-gray-300">
                Manual QA covers 5% of chats at <span className="text-white font-medium">$2,000–$4,000/mo</span>. SupportCoach AI covers 100% — in minutes.
              </p>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                  <p className="text-3xl font-semibold text-emerald-400">$40,000+</p>
                  <p className="mt-1 text-sm text-gray-300">per month equivalent value</p>
                  <p className="mt-2 text-xs text-gray-500">vs $2k–$4k manual QA coverage</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                  <p className="text-3xl font-semibold text-emerald-400">1,000+ hrs</p>
                  <p className="mt-1 text-sm text-gray-300">saved per month</p>
                  <p className="mt-2 text-xs text-gray-500">based on 4,000 chats/mo at 15 min/review</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                  <p className="text-3xl font-semibold text-emerald-400">40x ROI</p>
                  <p className="mt-1 text-sm text-gray-300">at $990/mo for 10 agents</p>
                  <p className="mt-2 text-xs text-gray-500">Enterprise plan — payback in days</p>
                </div>
              </div>
            </div>

            {/* Billing toggle */}
            <div className="mb-10 flex items-center gap-4">
              <span className={`text-sm font-medium ${!annual ? "text-white" : "text-gray-400"}`}>
                Monthly
              </span>
              <button
                onClick={() => setAnnual(!annual)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  annual ? "bg-emerald-400" : "bg-white/20"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    annual ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
              <span className={`text-sm font-medium ${annual ? "text-white" : "text-gray-400"}`}>
                Annual
              </span>
              {annual && (
                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                  2 months free
                </span>
              )}
            </div>

            {/* Plan cards */}
            <div className="grid gap-6 lg:grid-cols-3">
              {tiers.map((tier) => (
                <div
                  key={tier.name}
                  className={`flex h-full flex-col rounded-3xl border p-8 ${
                    tier.highlighted
                      ? "border-emerald-400/40 bg-emerald-400/5 shadow-[0_0_40px_rgba(52,211,153,0.08)]"
                      : "border-white/10 bg-black/30"
                  }`}
                >
                  <div className="mb-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-2xl font-semibold text-white">{tier.name}</h3>
                      {tier.highlighted && (
                        <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                          Most Popular
                        </span>
                      )}
                    </div>
                    <p className="mt-4 text-4xl font-semibold text-white">
                      {annual ? tier.annualMonthly : tier.monthlyPrice}
                      <span className="text-base font-medium text-gray-400">/agent/month</span>
                    </p>
                    {annual && (
                      <p className="mt-1 text-sm text-gray-400">
                        Billed {tier.annualPrice}/agent/year
                      </p>
                    )}
                    <p className="mt-4 text-sm leading-6 text-gray-300">{tier.audience}</p>
                  </div>

                  <ul className="space-y-3 text-sm leading-6 text-gray-300">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex gap-3">
                        <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-emerald-400" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-8">
                    <Link
                      href="/signup"
                      className={`inline-flex w-full items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold transition ${
                        tier.highlighted
                          ? "bg-emerald-400 text-black hover:bg-emerald-300"
                          : "border border-white/10 bg-white/5 text-white hover:border-emerald-400/40 hover:bg-emerald-400/10"
                      }`}
                    >
                      Get Started
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="px-6 pb-24 pt-4 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-3xl">
            <div className="mb-10">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-300">
                FAQ
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Common questions
              </h2>
            </div>

            <div className="divide-y divide-white/10">
              {faqs.map((faq, index) => (
                <div key={index} className="py-5">
                  <button
                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                    className="flex w-full items-center justify-between gap-4 text-left"
                  >
                    <span className="text-base font-medium text-white">{faq.question}</span>
                    <span className={`flex-shrink-0 text-emerald-400 text-xl font-light transition-transform ${openFaq === index ? "rotate-45" : ""}`}>
                      +
                    </span>
                  </button>
                  {openFaq === index && (
                    <p className="mt-4 text-sm leading-7 text-gray-300">{faq.answer}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/10 px-6 py-10 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-6xl flex flex-col items-center justify-between gap-6 sm:flex-row">
            <p className="text-sm text-gray-500">
              &copy; {new Date().getFullYear()} SupportCoach AI. All rights reserved.
            </p>
            <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-400">
              <Link href="/terms" className="hover:text-white transition">Terms of Service</Link>
              <Link href="/privacy" className="hover:text-white transition">Privacy Policy</Link>
              <Link href="/refund" className="hover:text-white transition">Refund Policy</Link>
              <Link href="/support" className="hover:text-white transition">Support</Link>
            </div>
          </div>
        </footer>

      </div>
    </main>
  );
}