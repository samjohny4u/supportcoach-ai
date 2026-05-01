// src/lib/planAccess.ts
// Plan access helper — checks what features an org can access

import { PLAN_HIERARCHY } from "./paddle";

export type PlanStatus =
  | "trialing"        // Active trial, all features unlocked
  | "active"          // Paid subscription active
  | "past_due"        // Payment failed, grace period
  | "canceled"        // Subscription canceled, period ended
  | "expired"         // Trial expired, no subscription
  | "none";           // No trial, no subscription (shouldn't happen)

export interface OrgAccess {
  status: PlanStatus;
  plan: string;                   // 'trial', 'starter', 'professional', 'enterprise'
  isLocked: boolean;              // If true, redirect to /select-plan
  trialDaysRemaining: number | null;
  canAccessTopics: boolean;       // Professional+
  canAccessCoachingInsights: boolean; // Professional+
  canAccessPatternCards: boolean;  // Professional+
  canAccessFaqAi: boolean;        // Enterprise only
  canAccessIntegrations: boolean;  // Enterprise only
  seats: number;
  billingInterval: string | null;
}

/**
 * Determine an org's access level from their plan, trial, and subscription data.
 *
 * @param org - The organization record (plan, trial_ends_at)
 * @param subscription - The active subscription record (or null)
 */
export function getOrgAccess(
  org: {
    plan?: string | null;
    trial_ends_at?: string | null;
  },
  subscription: {
    plan?: string | null;
    status?: string | null;
    seats?: number | null;
    billing_interval?: string | null;
    trial_end?: string | null;
    current_period_end?: string | null;
    cancel_at?: string | null;
  } | null
): OrgAccess {
  const orgPlan = typeof org.plan === "string" && org.plan.trim().length > 0
    ? org.plan.trim()
    : "trial";

  // ---- Active subscription ----
  if (subscription && subscription.status) {
    const subStatus = subscription.status.trim();
    const subPlan = typeof subscription.plan === "string" && subscription.plan.trim().length > 0
      ? subscription.plan.trim()
      : "starter";
    const seats = typeof subscription.seats === "number" ? subscription.seats : 1;
    const billingInterval = typeof subscription.billing_interval === "string"
      ? subscription.billing_interval.trim()
      : null;

    // Trialing via Paddle subscription
    if (subStatus === "trialing") {
      const trialEnd = subscription.trial_end ? new Date(subscription.trial_end) : null;
      const now = new Date();
      const trialDaysRemaining = trialEnd
        ? Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
        : null;

      return {
        status: "trialing",
        plan: subPlan,
        isLocked: false,
        trialDaysRemaining,
        canAccessTopics: true,         // All features during trial
        canAccessCoachingInsights: true,
        canAccessPatternCards: true,
        canAccessFaqAi: true,
        canAccessIntegrations: true,
        seats,
        billingInterval,
      };
    }

    // Active paid subscription
    if (subStatus === "active") {
      return {
        status: "active",
        plan: subPlan,
        isLocked: false,
        trialDaysRemaining: null,
        ...getFeatureAccess(subPlan),
        seats,
        billingInterval,
      };
    }

    // Past due — payment failed but still in grace period
    if (subStatus === "past_due") {
      return {
        status: "past_due",
        plan: subPlan,
        isLocked: true,
        trialDaysRemaining: null,
        ...getFeatureAccess(subPlan),
        seats,
        billingInterval,
      };
    }

    // Canceled — check if the period has ended
    if (subStatus === "canceled" || subStatus === "paused") {
      const periodEnd = subscription.current_period_end
        ? new Date(subscription.current_period_end)
        : null;
      const cancelAt = subscription.cancel_at
        ? new Date(subscription.cancel_at)
        : null;
      const now = new Date();
      const effectiveEnd = cancelAt || periodEnd;

      // Still within paid period
      if (effectiveEnd && effectiveEnd > now) {
        return {
          status: "active",
          plan: subPlan,
          isLocked: false,
          trialDaysRemaining: null,
          ...getFeatureAccess(subPlan),
          seats,
          billingInterval,
        };
      }

      // Period ended — lock the app
      return {
        status: "canceled",
        plan: subPlan,
        isLocked: true,
        trialDaysRemaining: null,
        canAccessTopics: false,
        canAccessCoachingInsights: false,
        canAccessPatternCards: false,
        canAccessFaqAi: false,
        canAccessIntegrations: false,
        seats,
        billingInterval,
      };
    }
  }

  // ---- No subscription — check org-level trial ----
  if (orgPlan === "trial") {
    const trialEnd = org.trial_ends_at ? new Date(org.trial_ends_at) : null;
    const now = new Date();

    if (trialEnd && trialEnd > now) {
      const trialDaysRemaining = Math.max(
        0,
        Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      );
      return {
        status: "trialing",
        plan: "trial",
        isLocked: false,
        trialDaysRemaining,
        canAccessTopics: true,         // All features during trial
        canAccessCoachingInsights: true,
        canAccessPatternCards: true,
        canAccessFaqAi: true,
        canAccessIntegrations: true,
        seats: 1,
        billingInterval: null,
      };
    }

    // Trial expired, no subscription
    return {
      status: "expired",
      plan: "trial",
      isLocked: true,
      trialDaysRemaining: 0,
      canAccessTopics: false,
      canAccessCoachingInsights: false,
      canAccessPatternCards: false,
      canAccessFaqAi: false,
      canAccessIntegrations: false,
      seats: 1,
      billingInterval: null,
    };
  }

  // ---- Fallback — no trial, no subscription ----
  return {
    status: "none",
    plan: orgPlan,
    isLocked: true,
    trialDaysRemaining: null,
    canAccessTopics: false,
    canAccessCoachingInsights: false,
    canAccessPatternCards: false,
    canAccessFaqAi: false,
    canAccessIntegrations: false,
    seats: 1,
    billingInterval: null,
  };
}

/**
 * Get feature access flags for a given plan tier.
 */
function getFeatureAccess(plan: string) {
  const level = PLAN_HIERARCHY[plan] ?? 0;

  return {
    canAccessTopics: level >= 2,           // Professional+
    canAccessCoachingInsights: level >= 2,  // Professional+
    canAccessPatternCards: level >= 2,      // Professional+
    canAccessFaqAi: level >= 3,            // Enterprise
    canAccessIntegrations: level >= 3,      // Enterprise
  };
}

/**
 * Check if a plan upgrade is valid (new plan must be higher than current).
 */
export function isUpgrade(currentPlan: string, newPlan: string): boolean {
  const currentLevel = PLAN_HIERARCHY[currentPlan] ?? 0;
  const newLevel = PLAN_HIERARCHY[newPlan] ?? 0;
  return newLevel > currentLevel;
}

export const COACHING_FOLLOWTHROUGH_WINDOW_DAYS = {
  starter: 30,
  professional: 90,
  enterprise: 365,
} as const;

export const COACHING_FOLLOWTHROUGH_LIMIT = 15;

export function getFollowthroughWindowDays(plan: string | null | undefined): number {
  const normalized = (plan || "").toLowerCase().trim();
  if (normalized === "professional") return 90;
  if (normalized === "enterprise") return 365;
  return 30; // starter, trial, or unknown
}
