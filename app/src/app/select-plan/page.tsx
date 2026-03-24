// src/app/select-plan/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Paddle?: any;
  }
}

const PLAN_PRICES = {
  starter: {
    monthly: {
      priceId: "pri_01kmgk5hbmswg70dxfzadg5xyk",
      amount: 29,
    },
    annual: {
      priceId: "pri_01kmgk7dkdy22h8ch6apnmt00s",
      amount: 290,
      perMonth: 24.17,
    },
  },
  professional: {
    monthly: {
      priceId: "pri_01kmgkayak16n1z82bz57mcx38",
      amount: 59,
    },
    annual: {
      priceId: "pri_01kmgkc479yxfyspryg2fdnvgj",
      amount: 590,
      perMonth: 49.17,
    },
  },
  enterprise: {
    monthly: {
      priceId: "pri_01kmgkd6shsfkx821ap74fhrjk",
      amount: 99,
    },
    annual: {
      priceId: "pri_01kmgke6tqaz7zaqt7jdpp309s",
      amount: 990,
      perMonth: 82.50,
    },
  },
};

const PLAN_FEATURES: Record<string, string[]> = {
  starter: [
    "AI coaching analysis",
    "Manager dashboard & reports",
    "PDF upload & export",
    "Agent leaderboard",
    "Company coaching context",
    "Per-chat re-analyze",
  ],
  professional: [
    "Everything in Starter, plus:",
    "Topic Intelligence Dashboard",
    "Coaching Insights by Topic",
    "Pattern Cards with recommendations",
    "Advanced date range filters",
    "Chats Needing Attention view",
  ],
  enterprise: [
    "Everything in Professional, plus:",
    "AI-Generated FAQ Suggestions",
    "Helpdesk integrations (coming soon)",
    "API access (coming soon)",
    "SSO (coming soon)",
    "Priority support",
  ],
};

export default function SelectPlanPage() {
  const router = useRouter();
  const [billingInterval, setBillingInterval] = useState<"monthly" | "annual">(
    "monthly"
  );
  const [seats, setSeats] = useState(1);
  const [loading, setLoading] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [paddleReady, setPaddleReady] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const [pageLoading, setPageLoading] = useState(true);

  // Load org info directly from Supabase browser client
  useEffect(() => {
    async function loadOrgInfo() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setPageLoading(false);
          return;
        }

        // Get org membership
        const { data: membership } = await supabase
          .from("organization_memberships")
          .select("organization_id")
          .eq("user_id", user.id)
          .single();

        if (!membership) {
          setPageLoading(false);
          return;
        }

        setOrgId(membership.organization_id);

        // Get org plan info
        const { data: org } = await supabase
          .from("organizations")
          .select("plan")
          .eq("id", membership.organization_id)
          .single();

        if (org) {
          setCurrentPlan(org.plan || "trial");
        }

        // Check for active subscription
        const { data: subscription } = await supabase
          .from("subscriptions")
          .select("status, plan")
          .eq("organization_id", membership.organization_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (
          subscription &&
          subscription.status === "active" &&
          subscription.plan !== "trial"
        ) {
          router.push("/dashboard");
          return;
        }
      } catch {
        // Ignore — user may not be fully onboarded yet
      } finally {
        setPageLoading(false);
      }
    }
    loadOrgInfo();
  }, [router]);

  // Initialize Paddle.js
  const initPaddle = useCallback(() => {
    if (window.Paddle) {
      window.Paddle.Initialize({
        token: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN,
      });
      setPaddleReady(true);
    }
  }, []);

  useEffect(() => {
    // Load Paddle.js script
    if (document.querySelector('script[src*="paddle.js"]')) {
      initPaddle();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
    script.async = true;
    script.onload = initPaddle;
    document.head.appendChild(script);
  }, [initPaddle]);

  const handleSelectPlan = (planKey: string) => {
    if (!paddleReady || !window.Paddle) {
      alert("Payment system is loading. Please try again in a moment.");
      return;
    }

    if (!orgId) {
      alert("Could not identify your organization. Please refresh and try again.");
      return;
    }

    setLoading(true);

    const planPrices = PLAN_PRICES[planKey as keyof typeof PLAN_PRICES];
    const priceInfo = planPrices[billingInterval];

    console.log("Paddle checkout attempt:", {
      priceId: priceInfo.priceId,
      quantity: seats,
      paddleReady,
      paddleExists: !!window.Paddle,
    });

    try {
      window.Paddle.Checkout.open({
        items: [
          {
            priceId: priceInfo.priceId,
            quantity: seats,
          },
        ],
      });
    } catch (err) {
      console.error("Paddle checkout error:", err);
      alert("Could not open checkout. Please try again.");
    }
    setLoading(false);
  };

  const savingsPercent = 17; // ~2 months free on annual

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold mb-3">
            {currentPlan === "trial"
              ? "Choose Your Plan to Start Your Free Trial"
              : "Choose Your Plan"}
          </h1>
          <p className="text-gray-400 text-lg">
            14-day free trial with full access to all features. Cancel anytime.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4 mb-10">
          <span
            className={
              billingInterval === "monthly"
                ? "text-white font-medium"
                : "text-gray-500"
            }
          >
            Monthly
          </span>
          <button
            onClick={() =>
              setBillingInterval(
                billingInterval === "monthly" ? "annual" : "monthly"
              )
            }
            className={`relative w-14 h-7 rounded-full transition-colors ${
              billingInterval === "annual" ? "bg-blue-600" : "bg-gray-700"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full transition-transform ${
                billingInterval === "annual" ? "translate-x-7" : ""
              }`}
            />
          </button>
          <span
            className={
              billingInterval === "annual"
                ? "text-white font-medium"
                : "text-gray-500"
            }
          >
            Annual
          </span>
          {billingInterval === "annual" && (
            <span className="bg-green-900/50 text-green-400 text-sm px-3 py-1 rounded-full">
              Save {savingsPercent}%
            </span>
          )}
        </div>

        {/* Seat Picker */}
        <div className="flex items-center justify-center gap-4 mb-10">
          <span className="text-gray-400">Number of agents:</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSeats(Math.max(1, seats - 1))}
              className="w-8 h-8 rounded bg-gray-800 hover:bg-gray-700 text-white font-bold flex items-center justify-center"
              disabled={seats <= 1}
            >
              −
            </button>
            <input
              type="number"
              min={1}
              max={999}
              value={seats}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val) && val >= 1) setSeats(val);
              }}
              className="w-16 text-center bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white"
            />
            <button
              onClick={() => setSeats(seats + 1)}
              className="w-8 h-8 rounded bg-gray-800 hover:bg-gray-700 text-white font-bold flex items-center justify-center"
            >
              +
            </button>
          </div>
          <span className="text-gray-500 text-sm">
            {seats === 1 ? "agent" : "agents"}
          </span>
        </div>

        {/* Plan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {(["starter", "professional", "enterprise"] as const).map(
            (planKey) => {
              const prices = PLAN_PRICES[planKey];
              const price = prices[billingInterval];
              const isPopular = planKey === "professional";

              const displayPrice =
                billingInterval === "monthly"
                  ? price.amount
                  : (price as { perMonth: number }).perMonth;
              const totalPrice = price.amount * seats;

              return (
                <div
                  key={planKey}
                  className={`relative rounded-xl border p-6 flex flex-col ${
                    isPopular
                      ? "border-blue-500 bg-gray-900/80"
                      : "border-gray-800 bg-gray-900/50"
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-semibold px-4 py-1 rounded-full">
                      Most Popular
                    </div>
                  )}

                  <h2 className="text-xl font-bold capitalize mb-1">
                    {planKey}
                  </h2>
                  <p className="text-gray-400 text-sm mb-4">
                    {planKey === "starter" &&
                      "For small support teams getting started with AI coaching"}
                    {planKey === "professional" &&
                      "For teams that need strategic visibility into support operations"}
                    {planKey === "enterprise" &&
                      "For larger organizations with advanced needs"}
                  </p>

                  {/* Price Display */}
                  <div className="mb-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold">
                        ${displayPrice.toFixed(2)}
                      </span>
                      <span className="text-gray-400">/agent/month</span>
                    </div>
                    {billingInterval === "annual" && (
                      <p className="text-gray-500 text-sm mt-1">
                        ${price.amount}/agent/year — billed annually
                      </p>
                    )}
                    {seats > 1 && (
                      <p className="text-blue-400 text-sm mt-2">
                        {seats} {seats === 1 ? "agent" : "agents"} × $
                        {billingInterval === "monthly"
                          ? price.amount
                          : price.amount}
                        /{billingInterval === "monthly" ? "mo" : "yr"} = $
                        {totalPrice.toLocaleString()}
                        /{billingInterval === "monthly" ? "mo" : "yr"}
                      </p>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="flex-1 space-y-2 mb-6">
                    {PLAN_FEATURES[planKey].map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        {feature.endsWith(":") ? (
                          <span className="text-gray-300 font-medium">
                            {feature}
                          </span>
                        ) : (
                          <>
                            <span className="text-green-400 mt-0.5">✓</span>
                            <span className="text-gray-300">{feature}</span>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  <button
                    onClick={() => handleSelectPlan(planKey)}
                    disabled={loading}
                    className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
                      isPopular
                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                        : "bg-gray-800 hover:bg-gray-700 text-white"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {loading ? "Loading..." : "Start 14-Day Free Trial"}
                  </button>
                </div>
              );
            }
          )}
        </div>

        {/* Footer notes */}
        <div className="text-center text-gray-500 text-sm space-y-1">
          <p>All plans include a 14-day free trial with full feature access.</p>
          <p>
            No charge until your trial ends. Cancel anytime during the trial.
          </p>
          <p>
            Prices shown are per agent.{" "}
            {seats > 1 &&
              `Your total for ${seats} agents will be calculated at checkout.`}
          </p>
        </div>
      </div>
    </div>
  );
}