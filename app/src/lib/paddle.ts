// src/lib/paddle.ts
// Server-side Paddle helpers — webhook verification and API calls

import crypto from "crypto";

// Price ID mapping — maps Paddle price IDs to plan names and billing intervals
export const PADDLE_PRICE_MAP: Record<
  string,
  { plan: string; interval: string }
> = {
  // Starter
  pri_01kmgk5hbmswg70dxfzadg5xyk: {
    plan: "starter",
    interval: "monthly",
  },
  pri_01kmgk7dkdy22h8ch6apnmt00s: {
    plan: "starter",
    interval: "annual",
  },
  // Professional
  pri_01kmgkayak16n1z82bz57mcx38: {
    plan: "professional",
    interval: "monthly",
  },
  pri_01kmgkc479yxfyspryg2fdnvgj: {
    plan: "professional",
    interval: "annual",
  },
  // Enterprise
  pri_01kmgkd6shsfkx821ap74fhrjk: {
    plan: "enterprise",
    interval: "monthly",
  },
  pri_01kmgke6tqaz7zaqt7jdpp309s: {
    plan: "enterprise",
    interval: "annual",
  },
};

// Plan hierarchy for upgrade/downgrade checks
export const PLAN_HIERARCHY: Record<string, number> = {
  trial: 0,
  starter: 1,
  professional: 2,
  enterprise: 3,
};

// Price IDs grouped by plan for the select-plan page
export const PLAN_PRICES = {
  starter: {
    monthly: "pri_01kmgk5hbmswg70dxfzadg5xyk",
    annual: "pri_01kmgk7dkdy22h8ch6apnmt00s",
  },
  professional: {
    monthly: "pri_01kmgkayak16n1z82bz57mcx38",
    annual: "pri_01kmgkc479yxfyspryg2fdnvgj",
  },
  enterprise: {
    monthly: "pri_01kmgkd6shsfkx821ap74fhrjk",
    annual: "pri_01kmgke6tqaz7zaqt7jdpp309s",
  },
};

/**
 * Verify Paddle webhook signature.
 * Paddle sends an h1= HMAC-SHA256 signature in the Paddle-Signature header.
 */
export function verifyPaddleWebhook(
  rawBody: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature) return false;

  try {
    // Paddle signature format: ts=timestamp;h1=hash
    const parts: Record<string, string> = {};
    for (const part of signature.split(";")) {
      const [key, value] = part.split("=");
      if (key && value) {
        parts[key] = value;
      }
    }

    const ts = parts["ts"];
    const h1 = parts["h1"];
    if (!ts || !h1) return false;

    // Build the signed payload: timestamp:rawBody
    const signedPayload = `${ts}:${rawBody}`;
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(signedPayload)
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(h1),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}

/**
 * Extract plan and interval from a Paddle price ID.
 * Returns null if the price ID is not recognized.
 */
export function getPlanFromPriceId(
  priceId: string
): { plan: string; interval: string } | null {
  return PADDLE_PRICE_MAP[priceId] || null;
}