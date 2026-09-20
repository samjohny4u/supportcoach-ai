// First-touch acquisition attribution for the marketing site (Sep 20, 2026).
//
// Captures utm_* / ref / gclid, the landing path, and the REFERRER DOMAIN ONLY (never a
// full referrer URL — those can carry other sites' query-string PII) on the visitor's
// first landing, persists them first-party in localStorage for ~90 days (first touch
// wins), and decorates signup CTA links with the stored params so they cross to
// admin.supportcoach.io, where the signup form forwards them to the backend.
//
// Values are sanitized by REJECTION, never repair: anything that does not look like a
// campaign parameter is dropped whole. This module loads no analytics, sets no cookie,
// and sends nothing anywhere — the stored params leave the browser only as part of the
// visitor's own signup. Pure functions are kept framework-free so tests/attribution.test.mjs
// can run them under node --test with zero dependencies.

export const ATTRIBUTION_QUERY_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "ref",
  "gclid",
] as const;

export const ATTRIBUTION_STORAGE_KEY = "sc_attribution";
export const ATTRIBUTION_TTL_MS = 90 * 24 * 60 * 60 * 1000;

const MAX_VALUE_LENGTH = 100;
const SAFE_VALUE = /^[A-Za-z0-9 _/.:-]+$/;

export type AttributionParams = Record<string, string>;

export type StoredAttribution = {
  captured_at: number;
  params: AttributionParams;
};

export function sanitizeValue(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_VALUE_LENGTH || !SAFE_VALUE.test(trimmed)) {
    return null;
  }
  return trimmed;
}

// Domain only, and never our own (an internal navigation is not an acquisition source).
export function referrerDomainOf(referrer: string): string | null {
  if (!referrer) {
    return null;
  }
  try {
    const hostname = new URL(referrer).hostname.toLowerCase();
    if (hostname === "supportcoach.io" || hostname.endsWith(".supportcoach.io")) {
      return null;
    }
    return sanitizeValue(hostname);
  } catch {
    return null;
  }
}

export function parseAttribution(search: string, referrer: string, pathname: string): AttributionParams {
  const out: AttributionParams = {};

  try {
    const params = new URLSearchParams(search);
    for (const key of ATTRIBUTION_QUERY_KEYS) {
      const value = sanitizeValue(params.get(key));
      if (value) {
        out[key] = value;
      }
    }
  } catch {
    // A malformed query string contributes nothing.
  }

  const landingPath = sanitizeValue(pathname);
  if (landingPath) {
    out.landing_path = landingPath;
  }

  const referrerDomain = referrerDomainOf(referrer);
  if (referrerDomain) {
    out.referrer_domain = referrerDomain;
  }

  return out;
}

export function isExpired(capturedAt: number, now: number): boolean {
  return !Number.isFinite(capturedAt) || now - capturedAt > ATTRIBUTION_TTL_MS;
}

// First touch wins: a stored, unexpired record is never overwritten.
export function mergeFirstTouch(
  stored: StoredAttribution | null,
  fresh: AttributionParams,
  now: number,
): StoredAttribution | null {
  if (stored && !isExpired(stored.captured_at, now) && Object.keys(stored.params).length > 0) {
    return stored;
  }
  if (Object.keys(fresh).length === 0) {
    return null;
  }
  return { captured_at: now, params: fresh };
}

export function decorateUrl(base: string, params: AttributionParams): string {
  const keys = Object.keys(params);
  if (keys.length === 0) {
    return base;
  }
  try {
    const url = new URL(base);
    for (const key of keys) {
      url.searchParams.set(key, params[key]);
    }
    return url.toString();
  } catch {
    return base;
  }
}

// ---- Browser-side wrappers (storage can throw in private windows etc.) ----

function readStored(now: number): StoredAttribution | null {
  try {
    const raw = window.localStorage.getItem(ATTRIBUTION_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as StoredAttribution;
    if (typeof parsed !== "object" || parsed === null || typeof parsed.captured_at !== "number" || typeof parsed.params !== "object" || parsed.params === null) {
      return null;
    }
    if (isExpired(parsed.captured_at, now)) {
      return null;
    }
    // Re-sanitize on the way out: storage is user-writable.
    const params: AttributionParams = {};
    for (const key of [...ATTRIBUTION_QUERY_KEYS, "landing_path", "referrer_domain"]) {
      const value = sanitizeValue((parsed.params as Record<string, unknown>)[key]);
      if (value) {
        params[key] = value;
      }
    }
    return Object.keys(params).length > 0 ? { captured_at: parsed.captured_at, params } : null;
  } catch {
    return null;
  }
}

export function storeFirstTouch(now: number = Date.now()): void {
  try {
    const fresh = parseAttribution(window.location.search, document.referrer, window.location.pathname);
    const next = mergeFirstTouch(readStored(now), fresh, now);
    if (next && next.captured_at === now) {
      window.localStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(next));
    }
  } catch {
    // Attribution is best-effort; never let it surface an error on the page.
  }
}

export function getStoredAttribution(now: number = Date.now()): AttributionParams {
  try {
    return readStored(now)?.params ?? {};
  } catch {
    return {};
  }
}
