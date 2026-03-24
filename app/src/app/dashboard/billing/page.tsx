// src/app/dashboard/billing/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Paddle?: any;
  }
}

interface SubscriptionInfo {
  status: string;
  plan: string;
  isLocked: boolean;
  trialDaysRemaining: number | null;
  seats: number;
  billingInterval: string | null;
  organization_name: string;
}

export default function BillingPage() {
  const [info, setInfo] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paddleReady, setPaddleReady] = useState(false);

  useEffect(() => {
    async function loadStatus() {
      try {
        const res = await fetch("/api/subscription-status");
        if (res.ok) {
          const data = await res.json();
          setInfo(data);
        } else {
          setError("Failed to load billing information.");
        }
      } catch {
        setError("Failed to load billing information.");
      } finally {
        setLoading(false);
      }
    }
    loadStatus();
  }, []);

  // Initialize Paddle for portal access
  const initPaddle = useCallback(() => {
    if (window.Paddle) {
      window.Paddle.Initialize({
        token: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN,
      });
      setPaddleReady(true);
    }
  }, []);

  useEffect(() => {
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center">
        <p className="text-gray-400">Loading billing information...</p>
      </div>
    );
  }

  if (error || !info) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || "Something went wrong."}</p>
          <Link
            href="/dashboard"
            className="text-blue-400 hover:text-blue-300 underline"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const planLabel =
    info.plan.charAt(0).toUpperCase() + info.plan.slice(1);
  const intervalLabel =
    info.billingInterval === "annual" ? "Annual" : "Monthly";
  const isTrialing = info.status === "trialing";
  const isActive = info.status === "active";
  const isPastDue = info.status === "past_due";
  const isCanceled = info.status === "canceled" || info.status === "expired";

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">Billing & Subscription</h1>
          <Link
            href="/dashboard"
            className="text-gray-400 hover:text-gray-300 text-sm"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {/* Current Plan Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold mb-1">Current Plan</h2>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold">{planLabel}</span>
                {info.plan !== "trial" && (
                  <span className="text-gray-400 text-sm">
                    ({intervalLabel})
                  </span>
                )}
                {/* Status Badge */}
                {isTrialing && (
                  <span className="bg-blue-900/50 text-blue-300 text-xs px-2 py-0.5 rounded-full">
                    Trial — {info.trialDaysRemaining}{" "}
                    {info.trialDaysRemaining === 1 ? "day" : "days"} left
                  </span>
                )}
                {isActive && info.plan !== "trial" && (
                  <span className="bg-green-900/50 text-green-300 text-xs px-2 py-0.5 rounded-full">
                    Active
                  </span>
                )}
                {isPastDue && (
                  <span className="bg-red-900/50 text-red-300 text-xs px-2 py-0.5 rounded-full">
                    Past Due
                  </span>
                )}
                {isCanceled && (
                  <span className="bg-gray-800 text-gray-400 text-xs px-2 py-0.5 rounded-full">
                    {info.status === "expired" ? "Expired" : "Canceled"}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Plan Details */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Seats</span>
              <p className="text-white font-medium">
                {info.seats} {info.seats === 1 ? "agent" : "agents"}
              </p>
            </div>
            <div>
              <span className="text-gray-400">Organization</span>
              <p className="text-white font-medium">{info.organization_name}</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-4">
          {/* Upgrade / Change Plan */}
          {(isTrialing || isActive) && (
            <Link
              href="/select-plan"
              className="block w-full bg-blue-600 hover:bg-blue-700 text-white text-center py-3 px-4 rounded-lg font-semibold transition-colors"
            >
              {info.plan === "trial"
                ? "Choose a Plan"
                : info.plan === "enterprise"
                ? "Manage Plan"
                : "Upgrade Plan"}
            </Link>
          )}

          {/* Resubscribe */}
          {isCanceled && (
            <Link
              href="/select-plan"
              className="block w-full bg-blue-600 hover:bg-blue-700 text-white text-center py-3 px-4 rounded-lg font-semibold transition-colors"
            >
              Resubscribe
            </Link>
          )}

          {/* Past Due — Update Payment */}
          {isPastDue && (
            <div className="bg-red-900/30 border border-red-800 rounded-xl p-4">
              <p className="text-red-300 text-sm mb-3">
                Your last payment failed. Please update your payment method to
                avoid service interruption.
              </p>
              <Link
                href="/select-plan"
                className="block w-full bg-red-600 hover:bg-red-700 text-white text-center py-3 px-4 rounded-lg font-semibold transition-colors"
              >
                Update Payment Method
              </Link>
            </div>
          )}

          {/* Manage via Paddle Portal info */}
          {(isActive || isTrialing) && info.plan !== "trial" && (
            <p className="text-gray-500 text-sm text-center mt-4">
              To update your payment method, download invoices, or cancel your
              subscription, check your email for Paddle receipts — they contain
              a link to manage your subscription.
            </p>
          )}
        </div>

        {/* Back link */}
        <div className="mt-8 text-center">
          <Link
            href="/dashboard"
            className="text-gray-400 hover:text-gray-300 text-sm"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}