// src/lib/aiCostControls.ts
// Task 34: per-organization AI cost controls.
//
// Three controls, all evaluated against the CURRENT CALENDAR MONTH (UTC):
//   1. Fair-use allowance per seat  - ingested chats and full analyses per month.
//   2. Monthly AI spend ceiling     - soft warning at 70%, hard stop at 100%.
//   3. Reserved constants for the connector build (full-analysis-for-all plan
//      gate, backfill days per plan). Nothing consumes them yet.
//
// Design rules:
//   - Every query filters by organization_id (rules.md 14).
//   - FAIL OPEN on infrastructure errors (rules.md 37 spirit): a missing
//     ai_usage table, a failed count, or a thrown error must never block a
//     paying customer's upload. Limits are enforced only from data we could
//     actually read. Spend defaults to $0 when the usage table is unreadable.
//   - Cost figures are ESTIMATES from token counts at the rates below, not
//     OpenAI invoice amounts. Verify rates at the OpenAI pricing page.
//   - Server-only: uses the service-role key. Never import from client code.

import { createClient } from "@supabase/supabase-js";
import { getOrgAccess } from "./planAccess";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ---------------------------------------------------------------------------
// Constants (single definition site - do not copy these elsewhere)
// ---------------------------------------------------------------------------

/** USD per million tokens. Third-party listed gpt-5.4 rates as of Oct 11, 2026. */
export const AI_MODEL_PRICING_USD_PER_MILLION: Record<
  string,
  { input: number; cachedInput: number; output: number }
> = {
  "gpt-5.4": { input: 2.5, cachedInput: 0.25, output: 15 },
};

/** Rate used when the model id is not in the table above (worst-case assumption). */
const AI_FALLBACK_PRICING = AI_MODEL_PRICING_USD_PER_MILLION["gpt-5.4"];

/** Fair-use allowance per paid seat per calendar month. Trial orgs count as 1 seat. */
export const FAIR_USE_PER_SEAT = {
  ingestedChatsPerMonth: 400,
  fullAnalysesPerMonth: 60,
} as const;

/**
 * Monthly AI spend ceiling in USD = max(floor[plan], perSeat[plan] * seats).
 * Trial is a flat floor (perSeat 0). organizations.ai_spend_ceiling_usd, when
 * set, overrides the computed value for that org.
 *
 * Consistency rule: perSeat must exceed FAIR_USE_PER_SEAT.fullAnalysesPerMonth
 * times the cost of one full analysis (about $0.07 at gpt-5.4 rates, so about
 * $4.20) plus a share of reports, or the money ceiling trips before the
 * analysis allowance does. Starter 5 / 7 / 10 keeps worst-case AI cost at
 * roughly 17% / 12% / 10% of the $29 / $59 / $99 seat price.
 */
export const AI_SPEND_CEILING_USD = {
  perSeat: { trial: 0, starter: 5, professional: 7, enterprise: 10 } as Record<string, number>,
  floor: { trial: 10, starter: 10, professional: 15, enterprise: 25 } as Record<string, number>,
} as const;

/** Soft warning threshold as a ratio of any limit (0.7 = 70%). */
export const AI_SOFT_WARN_RATIO = 0.7;

/**
 * Reserved for the helpdesk-ingestion build (master doc Section 10c). Not
 * consumed by any code path today - recorded here so the connector inherits
 * them instead of inventing new ones.
 *   - FULL_ANALYSIS_FOR_ALL_MIN_PLAN_LEVEL: the "analyse every chat in full"
 *     setting is Professional (level 2) and above, still subject to the
 *     per-seat allowance.
 *   - BACKFILL_DAYS_BY_PLAN: how far back a new connector pulls history.
 */
export const FULL_ANALYSIS_FOR_ALL_MIN_PLAN_LEVEL = 2;
export const BACKFILL_DAYS_BY_PLAN: Record<string, number> = {
  trial: 7,
  starter: 14,
  professional: 30,
  enterprise: 30,
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AiUsageTokens = {
  prompt_tokens?: number | null;
  completion_tokens?: number | null;
  prompt_tokens_details?: { cached_tokens?: number | null } | null;
};

export type OrgUsageSnapshot = {
  organizationId: string;
  plan: string;
  status: string;
  /** Seats used for allowance math (subscription seats, trial = 1, or the org override). */
  effectiveSeats: number;
  monthStartIso: string;
  ingestedChats: number;
  fullAnalyses: number;
  spendUsd: number;
  /** True when ai_usage could not be read; spend is then 0 and the ceiling is not enforced. */
  spendUnavailable: boolean;
  limits: {
    ingestedChats: number;
    fullAnalyses: number;
    spendUsd: number;
  };
};

export type BudgetDecision = {
  allowed: boolean;
  /** Machine-readable reason when blocked. */
  reason: "ingest_allowance" | "analysis_allowance" | "spend_ceiling" | null;
  /** Human-readable message for the UI when blocked (null when allowed). */
  message: string | null;
  /** Human-readable soft warning when any limit is at or above AI_SOFT_WARN_RATIO (null otherwise). */
  warning: string | null;
};

// ---------------------------------------------------------------------------
// Cost estimation and usage recording
// ---------------------------------------------------------------------------

function safeNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
}

/** Estimated USD cost of one completion from its token usage. */
export function estimateCompletionCostUsd(model: string, usage: AiUsageTokens | null | undefined): number {
  if (!usage) return 0;
  const rates = AI_MODEL_PRICING_USD_PER_MILLION[model] || AI_FALLBACK_PRICING;
  const promptTokens = safeNumber(usage.prompt_tokens);
  const cachedTokens = Math.min(promptTokens, safeNumber(usage.prompt_tokens_details?.cached_tokens));
  const uncachedPrompt = promptTokens - cachedTokens;
  const completionTokens = safeNumber(usage.completion_tokens);

  const cost =
    (uncachedPrompt * rates.input + cachedTokens * rates.cachedInput + completionTokens * rates.output) /
    1_000_000;

  return Math.round(cost * 1_000_000) / 1_000_000;
}

/**
 * Record one OpenAI call in ai_usage. Best effort: never throws, never blocks
 * the caller. If the table does not exist yet (SQL not run), the insert
 * silently fails and spend stays unrecorded.
 */
export async function recordAiUsage(input: {
  organizationId: string;
  source: string;
  model: string;
  usage: AiUsageTokens | null | undefined;
  analysisId?: string | null;
}): Promise<void> {
  try {
    const costUsd = estimateCompletionCostUsd(input.model, input.usage);
    await supabaseAdmin.from("ai_usage").insert({
      organization_id: input.organizationId,
      source: input.source,
      model: input.model,
      prompt_tokens: safeNumber(input.usage?.prompt_tokens),
      completion_tokens: safeNumber(input.usage?.completion_tokens),
      cached_tokens: safeNumber(input.usage?.prompt_tokens_details?.cached_tokens),
      cost_usd: costUsd,
      analysis_id: input.analysisId || null,
    });
  } catch {
    // Usage accounting is supplementary; never block analysis on it.
  }
}

// ---------------------------------------------------------------------------
// Snapshot
// ---------------------------------------------------------------------------

function monthStartUtcIso(now = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

function computeSpendCeilingUsd(plan: string, seats: number, override: number | null): number {
  if (typeof override === "number" && Number.isFinite(override) && override >= 0) {
    return override;
  }
  const normalized = (plan || "").toLowerCase().trim();
  const perSeat = AI_SPEND_CEILING_USD.perSeat[normalized] ?? AI_SPEND_CEILING_USD.perSeat.starter;
  const floor = AI_SPEND_CEILING_USD.floor[normalized] ?? AI_SPEND_CEILING_USD.floor.starter;
  return Math.max(floor, perSeat * Math.max(1, seats));
}

/**
 * Read this month's usage and limits for one organization. Fails open: on any
 * unexpected error it returns null and callers must treat null as "allowed".
 */
export async function getOrgUsageSnapshot(organizationId: string): Promise<OrgUsageSnapshot | null> {
  try {
    const monthStartIso = monthStartUtcIso();

    const { data: org } = await supabaseAdmin
      .from("organizations")
      .select("plan, trial_ends_at, ai_spend_ceiling_usd, fair_use_seats_override")
      .eq("id", organizationId)
      .maybeSingle();

    // Column may not exist yet (SQL not run): re-read the two guaranteed columns.
    let orgRow: {
      plan?: string | null;
      trial_ends_at?: string | null;
      ai_spend_ceiling_usd?: number | null;
      fair_use_seats_override?: number | null;
    } | null = org;

    if (!orgRow) {
      const { data: fallbackOrg } = await supabaseAdmin
        .from("organizations")
        .select("plan, trial_ends_at")
        .eq("id", organizationId)
        .maybeSingle();
      orgRow = fallbackOrg;
    }

    if (!orgRow) return null;

    const { data: subscription } = await supabaseAdmin
      .from("subscriptions")
      .select("plan, status, seats, billing_interval, trial_end, current_period_end, cancel_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const access = getOrgAccess(orgRow, subscription || null);

    const seatsOverride =
      typeof orgRow.fair_use_seats_override === "number" && orgRow.fair_use_seats_override > 0
        ? Math.floor(orgRow.fair_use_seats_override)
        : null;
    const effectiveSeats = seatsOverride ?? Math.max(1, access.seats || 1);

    const { count: ingestedCount } = await supabaseAdmin
      .from("analysis_job_items")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .gte("created_at", monthStartIso);

    // Counts every analysis created this month, excluded or not: the cost was
    // incurred either way. This is cost accounting, not a stats query, so the
    // excluded filter (rules.md 15) deliberately does not apply here.
    const { count: analysesCount } = await supabaseAdmin
      .from("chat_analyses")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .gte("created_at", monthStartIso);

    let spendUsd = 0;
    let spendUnavailable = false;
    const { data: usageRows, error: usageError } = await supabaseAdmin
      .from("ai_usage")
      .select("cost_usd")
      .eq("organization_id", organizationId)
      .gte("created_at", monthStartIso);

    if (usageError) {
      spendUnavailable = true;
    } else if (Array.isArray(usageRows)) {
      spendUsd = usageRows.reduce((sum, row) => sum + safeNumber((row as { cost_usd?: unknown }).cost_usd), 0);
    }

    const ceilingOverride =
      typeof orgRow.ai_spend_ceiling_usd === "number" ? orgRow.ai_spend_ceiling_usd : null;

    return {
      organizationId,
      plan: access.plan,
      status: access.status,
      effectiveSeats,
      monthStartIso,
      ingestedChats: typeof ingestedCount === "number" ? ingestedCount : 0,
      fullAnalyses: typeof analysesCount === "number" ? analysesCount : 0,
      spendUsd: Math.round(spendUsd * 100) / 100,
      spendUnavailable,
      limits: {
        ingestedChats: FAIR_USE_PER_SEAT.ingestedChatsPerMonth * effectiveSeats,
        fullAnalyses: FAIR_USE_PER_SEAT.fullAnalysesPerMonth * effectiveSeats,
        spendUsd: computeSpendCeilingUsd(access.plan, effectiveSeats, ceilingOverride),
      },
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Decisions
// ---------------------------------------------------------------------------

function ratio(used: number, limit: number): number {
  if (!limit || limit <= 0) return 0;
  return used / limit;
}

function buildWarning(snapshot: OrgUsageSnapshot): string | null {
  const parts: string[] = [];
  const seatNote = `${snapshot.effectiveSeats} ${snapshot.effectiveSeats === 1 ? "seat" : "seats"}`;

  if (ratio(snapshot.ingestedChats, snapshot.limits.ingestedChats) >= AI_SOFT_WARN_RATIO) {
    parts.push(
      `${snapshot.ingestedChats} of ${snapshot.limits.ingestedChats} chats uploaded this month (${seatNote})`
    );
  }
  if (ratio(snapshot.fullAnalyses, snapshot.limits.fullAnalyses) >= AI_SOFT_WARN_RATIO) {
    parts.push(
      `${snapshot.fullAnalyses} of ${snapshot.limits.fullAnalyses} analyses used this month (${seatNote})`
    );
  }
  if (!snapshot.spendUnavailable && ratio(snapshot.spendUsd, snapshot.limits.spendUsd) >= AI_SOFT_WARN_RATIO) {
    parts.push(
      `$${snapshot.spendUsd.toFixed(2)} of the $${snapshot.limits.spendUsd.toFixed(2)} monthly AI budget used`
    );
  }

  if (parts.length === 0) return null;
  return `Heads up: ${parts.join("; ")}. Limits reset on the 1st. Add seats to raise them.`;
}

/**
 * Can this org queue `newChats` more uploads right now?
 * Null snapshot (infrastructure error) = allowed, no warning.
 */
export function checkIngestAllowance(snapshot: OrgUsageSnapshot | null, newChats: number): BudgetDecision {
  if (!snapshot) return { allowed: true, reason: null, message: null, warning: null };

  const projected = snapshot.ingestedChats + Math.max(0, newChats);
  if (projected > snapshot.limits.ingestedChats) {
    const remaining = Math.max(0, snapshot.limits.ingestedChats - snapshot.ingestedChats);
    return {
      allowed: false,
      reason: "ingest_allowance",
      message:
        `Monthly upload allowance reached: ${snapshot.ingestedChats} of ${snapshot.limits.ingestedChats} chats used ` +
        `(${FAIR_USE_PER_SEAT.ingestedChatsPerMonth} per seat, ${snapshot.effectiveSeats} ${snapshot.effectiveSeats === 1 ? "seat" : "seats"}). ` +
        `${remaining === 0 ? "No uploads remain" : `${remaining} ${remaining === 1 ? "upload remains" : "uploads remain"}`} this month. ` +
        `Add seats to raise the allowance, or try again on the 1st.`,
      warning: null,
    };
  }

  return { allowed: true, reason: null, message: null, warning: buildWarning(snapshot) };
}

/**
 * Can this org run one more full analysis right now?
 * Null snapshot (infrastructure error) = allowed, no warning.
 */
export function checkAnalysisBudget(snapshot: OrgUsageSnapshot | null): BudgetDecision {
  if (!snapshot) return { allowed: true, reason: null, message: null, warning: null };

  if (snapshot.fullAnalyses >= snapshot.limits.fullAnalyses) {
    return {
      allowed: false,
      reason: "analysis_allowance",
      message:
        `Monthly analysis allowance reached: ${snapshot.fullAnalyses} of ${snapshot.limits.fullAnalyses} analyses used ` +
        `(${FAIR_USE_PER_SEAT.fullAnalysesPerMonth} per seat, ${snapshot.effectiveSeats} ${snapshot.effectiveSeats === 1 ? "seat" : "seats"}). ` +
        `Add seats to raise the allowance, or try again on the 1st.`,
      warning: null,
    };
  }

  if (!snapshot.spendUnavailable && snapshot.spendUsd >= snapshot.limits.spendUsd) {
    return {
      allowed: false,
      reason: "spend_ceiling",
      message:
        `Monthly AI budget reached: $${snapshot.spendUsd.toFixed(2)} of $${snapshot.limits.spendUsd.toFixed(2)} used. ` +
        `Analysis resumes on the 1st, or contact support to raise the budget.`,
      warning: null,
    };
  }

  return { allowed: true, reason: null, message: null, warning: buildWarning(snapshot) };
}

/** Short label stored on a job item when the worker skips it. Keep ASCII, no PII. */
export function failureReasonForDecision(decision: BudgetDecision): string {
  if (decision.reason === "analysis_allowance") return "Skipped: monthly analysis allowance reached";
  if (decision.reason === "spend_ceiling") return "Skipped: monthly AI budget reached";
  if (decision.reason === "ingest_allowance") return "Skipped: monthly upload allowance reached";
  return "Skipped: budget limit";
}
