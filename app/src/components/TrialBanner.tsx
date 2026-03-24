// src/components/TrialBanner.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface BannerInfo {
  status: string;
  plan: string;
  trialDaysRemaining: number | null;
}

export default function TrialBanner() {
  const [info, setInfo] = useState<BannerInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    async function loadStatus() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        // Get org membership
        const { data: membership } = await supabase
          .from("organization_memberships")
          .select("organization_id")
          .eq("user_id", user.id)
          .single();

        if (!membership) return;

        const orgId = membership.organization_id;

        // Get org plan info
        const { data: org } = await supabase
          .from("organizations")
          .select("plan, trial_ends_at")
          .eq("id", orgId)
          .single();

        if (!org) return;

        // Check for active subscription
        const { data: subscription } = await supabase
          .from("subscriptions")
          .select("status, plan, trial_end, current_period_end, cancel_at")
          .eq("organization_id", orgId)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (subscription) {
          const subStatus = subscription.status;
          const subPlan =
            typeof subscription.plan === "string" && subscription.plan.trim().length > 0
              ? subscription.plan.trim()
              : "starter";

          if (subStatus === "trialing") {
            const trialEnd = subscription.trial_end
              ? new Date(subscription.trial_end)
              : null;
            const now = new Date();
            const trialDaysRemaining = trialEnd
              ? Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
              : null;

            setInfo({ status: "trialing", plan: subPlan, trialDaysRemaining });
            return;
          }

          if (subStatus === "active") {
            setInfo({ status: "active", plan: subPlan, trialDaysRemaining: null });
            return;
          }

          if (subStatus === "past_due") {
            setInfo({ status: "past_due", plan: subPlan, trialDaysRemaining: null });
            return;
          }

          if (subStatus === "canceled" || subStatus === "paused") {
            const periodEnd = subscription.current_period_end
              ? new Date(subscription.current_period_end)
              : null;
            const cancelAt = subscription.cancel_at
              ? new Date(subscription.cancel_at)
              : null;
            const effectiveEnd = cancelAt || periodEnd;
            const now = new Date();

            if (effectiveEnd && effectiveEnd > now) {
              setInfo({ status: "active", plan: subPlan, trialDaysRemaining: null });
            } else {
              setInfo({ status: "canceled", plan: subPlan, trialDaysRemaining: null });
            }
            return;
          }
        }

        // No subscription — check org-level trial
        const orgPlan = org.plan || "trial";
        if (orgPlan === "trial" && org.trial_ends_at) {
          const trialEnd = new Date(org.trial_ends_at);
          const now = new Date();
          if (trialEnd > now) {
            const trialDaysRemaining = Math.max(
              0,
              Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
            );
            setInfo({ status: "trialing", plan: "trial", trialDaysRemaining });
          } else {
            setInfo({ status: "expired", plan: "trial", trialDaysRemaining: 0 });
          }
        }
      } catch {
        // Silently fail — banner is non-critical
      }
    }
    loadStatus();
  }, []);

  if (!info || dismissed) return null;

  // Active paid subscription — no banner needed
  if (info.status === "active" && info.plan !== "trial") return null;

  // Trialing — show countdown
  if (info.status === "trialing") {
    const days = info.trialDaysRemaining ?? 0;
    const urgent = days <= 3;

    return (
      <div
        className={`px-4 py-2.5 text-sm flex items-center justify-between ${
          urgent
            ? "bg-amber-900/60 border-b border-amber-800 text-amber-200"
            : "bg-blue-900/40 border-b border-blue-800/50 text-blue-200"
        }`}
      >
        <div className="flex items-center gap-2">
          {urgent ? (
            <span>⚠️</span>
          ) : (
            <span>🎉</span>
          )}
          <span>
            {days === 0
              ? "Your trial ends today."
              : `Free trial: ${days} ${days === 1 ? "day" : "days"} remaining.`}
            {" "}
            {info.plan === "trial"
              ? "Choose a plan to continue after your trial."
              : `You're on the ${info.plan.charAt(0).toUpperCase() + info.plan.slice(1)} plan.`}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {info.plan === "trial" && (
            <Link
              href="/select-plan"
              className={`px-3 py-1 rounded text-xs font-semibold ${
                urgent
                  ? "bg-amber-600 hover:bg-amber-700 text-white"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              Choose Plan
            </Link>
          )}
          <button
            onClick={() => setDismissed(true)}
            className="text-gray-400 hover:text-gray-300 text-xs"
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  // Past due — payment failed
  if (info.status === "past_due") {
    return (
      <div className="px-4 py-2.5 text-sm flex items-center justify-between bg-red-900/60 border-b border-red-800 text-red-200">
        <div className="flex items-center gap-2">
          <span>⚠️</span>
          <span>
            Payment failed. Please update your payment method to continue using
            SupportCoach AI.
          </span>
        </div>
        <Link
          href="/dashboard/billing"
          className="px-3 py-1 rounded text-xs font-semibold bg-red-600 hover:bg-red-700 text-white"
        >
          Update Payment
        </Link>
      </div>
    );
  }

  // Expired or canceled — app should be locked, but show banner as backup
  if (info.status === "expired" || info.status === "canceled") {
    return (
      <div className="px-4 py-2.5 text-sm flex items-center justify-between bg-red-900/60 border-b border-red-800 text-red-200">
        <div className="flex items-center gap-2">
          <span>🔒</span>
          <span>
            {info.status === "expired"
              ? "Your trial has expired."
              : "Your subscription has been canceled."}
            {" "}Choose a plan to continue using SupportCoach AI.
          </span>
        </div>
        <Link
          href="/select-plan"
          className="px-3 py-1 rounded text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white"
        >
          Choose Plan
        </Link>
      </div>
    );
  }

  return null;
}