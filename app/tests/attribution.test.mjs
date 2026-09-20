// node --test — zero dependencies, relies on Node's native TypeScript type-stripping
// (same pattern as the extension repo's packages/shared suite). Run: npm run test.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ATTRIBUTION_TTL_MS,
  decorateUrl,
  isExpired,
  mergeFirstTouch,
  parseAttribution,
  referrerDomainOf,
  sanitizeValue,
} from "../src/lib/attribution.ts";

test("sanitizeValue rejects rather than repairs", () => {
  assert.equal(sanitizeValue("google"), "google");
  assert.equal(sanitizeValue("  cpc  "), "cpc");
  assert.equal(sanitizeValue("bad<script>"), null);
  assert.equal(sanitizeValue("a".repeat(101)), null);
  assert.equal(sanitizeValue(""), null);
  assert.equal(sanitizeValue(42), null);
  assert.equal(sanitizeValue("a=b&c=d"), null);
});

test("parseAttribution keeps allowlisted params, landing path, and referrer DOMAIN only", () => {
  const parsed = parseAttribution(
    "?utm_source=smoketest&utm_campaign=x&gclid=abc-123&irrelevant=drop&email=pii@example.com",
    "https://www.google.com/search?q=private+query+string",
    "/extension",
  );
  assert.deepEqual(parsed, {
    utm_source: "smoketest",
    utm_campaign: "x",
    gclid: "abc-123",
    landing_path: "/extension",
    referrer_domain: "www.google.com",
  });
  // The full referrer URL (and its query string) must never survive anywhere.
  assert.equal(JSON.stringify(parsed).includes("private"), false);
  assert.equal(JSON.stringify(parsed).includes("q="), false);
});

test("own-domain referrers are not an acquisition source", () => {
  assert.equal(referrerDomainOf("https://www.supportcoach.io/blog/some-post"), null);
  assert.equal(referrerDomainOf("https://supportcoach.io/"), null);
  assert.equal(referrerDomainOf("https://admin.supportcoach.io/login"), null);
  assert.equal(referrerDomainOf("not a url"), null);
  assert.equal(referrerDomainOf("https://news.ycombinator.com/item"), "news.ycombinator.com");
});

test("first touch wins until expiry", () => {
  const now = 1_000_000;
  const stored = { captured_at: now, params: { utm_source: "google" } };
  const fresh = { utm_source: "bing" };

  assert.deepEqual(mergeFirstTouch(stored, fresh, now + 1000), stored);

  const later = now + ATTRIBUTION_TTL_MS + 1;
  assert.equal(isExpired(stored.captured_at, later), true);
  assert.deepEqual(mergeFirstTouch(stored, fresh, later), { captured_at: later, params: fresh });

  assert.deepEqual(mergeFirstTouch(null, {}, now), null);
});

test("decorateUrl carries the stored params onto the signup link (the cross-domain handoff)", () => {
  const decorated = decorateUrl("https://admin.supportcoach.io/signup", {
    utm_source: "smoketest",
    utm_campaign: "x",
    landing_path: "/extension",
  });
  const url = new URL(decorated);
  assert.equal(url.origin + url.pathname, "https://admin.supportcoach.io/signup");
  assert.equal(url.searchParams.get("utm_source"), "smoketest");
  assert.equal(url.searchParams.get("utm_campaign"), "x");
  assert.equal(url.searchParams.get("landing_path"), "/extension");

  assert.equal(decorateUrl("https://admin.supportcoach.io/signup", {}), "https://admin.supportcoach.io/signup");
});
