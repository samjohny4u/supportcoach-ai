// src/components/TrialBanner.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface SubscriptionInfo {
  status: string;
  plan: string;
  isLocked: boolean;
  trialDaysRemaining: number | null;
  seats: number;
  billingInterval: string | null;
}

export default function TrialBanner() {
  const [info, setInfo] = useState<SubscriptionInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    async function loadStatus() {
      try {
        const res = await fetch("/api/subscription-status");
        if (res.ok) {
          const data = await res.json();
          setInfo(data);
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