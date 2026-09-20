import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

// ---- Website pageview analytics (Sep 20, 2026 funnel-attribution work) ----
//
// SERVER-SIDE ONLY, BY REQUIREMENT: /privacy §11 states that "no analytics script or
// analytics cookie is loaded on this site" — that sentence is public and must stay
// literally true, so pageviews are captured here at the edge and never in the browser.
// No cookie is set, no visitor IP is forwarded, referrer is reduced to its DOMAIN, and
// only allowlisted campaign params are read from the query string.
//
// The api_key below is PostHog's PUBLISHABLE project token (phc_*) — the same class of
// value every PostHog browser snippet embeds publicly, already documented in the
// extension repo's docs/INSTRUMENTATION.md. It can only WRITE events. It is not a secret
// (the CLAUDE.md "no API keys in code" rule covers secrets; this is deliberately exempt
// and journaled).
const POSTHOG_CAPTURE_URL = "https://us.i.posthog.com/capture/";
const POSTHOG_PROJECT_KEY = "phc_oPh8aXHJe2oXioQUg2LK9uGakG6ewbLiNRtqtkt9JMyS";

const PUBLIC_ANALYTICS_EXACT = new Set(["/", "/extension", "/privacy", "/security", "/terms", "/refund", "/support"]);
const PUBLIC_ANALYTICS_PREFIXES = ["/blog"];

const ATTRIBUTION_QUERY_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "ref", "gclid"];
const SAFE_VALUE = /^[A-Za-z0-9 _/.:-]{1,100}$/;
const BOT_UA = /bot|crawl|spider|slurp|headless|lighthouse|pingdom|monitor/i;

function isPublicAnalyticsPath(pathname: string): boolean {
  return PUBLIC_ANALYTICS_EXACT.has(pathname) || PUBLIC_ANALYTICS_PREFIXES.some((p) => pathname.startsWith(p));
}

function capturePageview(request: NextRequest, event: NextFetchEvent): void {
  try {
    // Count real document navigations only: skip Next.js prefetches and RSC data
    // requests, and the obvious bots (paid tests must not count crawler hits).
    const secFetchDest = request.headers.get("sec-fetch-dest");
    if (secFetchDest !== null && secFetchDest !== "document") {
      return;
    }
    if (
      request.headers.get("next-router-prefetch") !== null ||
      request.headers.get("x-middleware-prefetch") !== null ||
      request.headers.get("purpose") === "prefetch" ||
      request.headers.get("rsc") !== null ||
      request.nextUrl.searchParams.has("_rsc")
    ) {
      return;
    }
    const userAgent = request.headers.get("user-agent") ?? "";
    if (BOT_UA.test(userAgent)) {
      return;
    }

    const properties: Record<string, unknown> = {
      path: request.nextUrl.pathname,
      source: "website",
      // Server-sent: PostHog would geolocate the edge node, not the visitor. Same
      // posture as the extension repo's backend forwarder.
      $geoip_disable: true,
      // Anonymous, no person profile: visits join the funnel via the attribution params
      // carried into org_signed_up, not via identity.
      $process_person_profile: false,
    };

    for (const key of ATTRIBUTION_QUERY_KEYS) {
      const value = request.nextUrl.searchParams.get(key);
      if (value && SAFE_VALUE.test(value.trim())) {
        properties[key] = value.trim();
      }
    }

    const referrer = request.headers.get("referer");
    if (referrer) {
      try {
        const hostname = new URL(referrer).hostname.toLowerCase();
        if (hostname !== "supportcoach.io" && !hostname.endsWith(".supportcoach.io") && SAFE_VALUE.test(hostname)) {
          properties.referrer_domain = hostname;
        }
      } catch {
        // Unparseable referrer contributes nothing.
      }
    }

    event.waitUntil(
      fetch(POSTHOG_CAPTURE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: POSTHOG_PROJECT_KEY,
          event: "website_pageview",
          distinct_id: `web_${crypto.randomUUID()}`,
          timestamp: new Date().toISOString(),
          properties,
        }),
      }).catch(() => {
        // Analytics must never affect a page load.
      }),
    );
  } catch {
    // Never let analytics break the site.
  }
}

export async function middleware(request: NextRequest, event: NextFetchEvent) {
  // Public marketing pages: record the pageview and get out of the way — none of the
  // auth/subscription machinery below applies to them (they were not in the matcher
  // before this work, so returning next() preserves their previous behavior exactly).
  if (isPublicAnalyticsPath(request.nextUrl.pathname)) {
    capturePageview(request, event);
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // If not authenticated: send protected PAGE requests to /login. Server-
  // rendered pages redirect themselves, but client-rendered pages (/upload)
  // otherwise render without a session and dead-end on the first API 401.
  // API paths are deliberately left alone — they must keep returning JSON
  // errors, never HTML redirects.
  if (!user) {
    const protectedPagePaths = ["/dashboard", "/upload", "/jobs", "/analysis"];
    if (protectedPagePaths.some((p) => pathname.startsWith(p))) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return response;
  }

  // Skip subscription check for these paths — they must always be accessible
  const skipPaths = [
    "/select-plan",
    "/onboarding",
    "/api/paddle-webhook",
    "/api/subscription-status",
    "/api/onboarding",
    "/api/signup",
    "/api/logout",
    "/login",
    "/signup",
    "/terms",
    "/privacy",
    "/refund",
    "/support",
  ];

  if (skipPaths.some((p) => pathname.startsWith(p))) {
    return response;
  }

  // For protected routes, check subscription status
  const protectedPaths = ["/dashboard", "/upload", "/jobs", "/analysis"];
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));

  if (isProtected) {
    try {
      // Use service role to check org and subscription
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      // Get user's org
      const { data: membership } = await supabaseAdmin
        .from("organization_memberships")
        .select("organization_id")
        .eq("user_id", user.id)
        .single();

      if (!membership) {
        // No org — redirect to onboarding
        return NextResponse.redirect(new URL("/onboarding", request.url));
      }

      const orgId = membership.organization_id;

      // Get org plan info
      const { data: org } = await supabaseAdmin
        .from("organizations")
        .select("plan, trial_ends_at")
        .eq("id", orgId)
        .single();

      if (!org) {
        return response;
      }

      // Check for active subscription
      const { data: subscription } = await supabaseAdmin
        .from("subscriptions")
        .select("status, current_period_end, cancel_at, trial_end")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      let isLocked = false;

      if (subscription) {
        // Has a subscription record — check its status
        const status = subscription.status;
        if (status === "active" || status === "trialing") {
          isLocked = false;
        } else if (status === "past_due") {
          isLocked = true;
        } else if (status === "canceled" || status === "paused") {
          // Check if still within paid period
          const periodEnd = subscription.current_period_end
            ? new Date(subscription.current_period_end)
            : null;
          const cancelAt = subscription.cancel_at
            ? new Date(subscription.cancel_at)
            : null;
          const effectiveEnd = cancelAt || periodEnd;
          isLocked = !effectiveEnd || effectiveEnd <= new Date();
        } else {
          isLocked = true;
        }
      } else {
        // No subscription — check org-level trial
        if (org.plan === "trial" && org.trial_ends_at) {
          const trialEnd = new Date(org.trial_ends_at);
          isLocked = trialEnd <= new Date();
        } else if (org.plan === "trial") {
          // Trial with no end date — treat as not locked (legacy orgs)
          isLocked = false;
        } else {
          // Not on trial, no subscription
          isLocked = true;
        }
      }

      if (isLocked) {
        // Allow access to billing page even when locked
        if (pathname.startsWith("/dashboard/billing")) {
          return response;
        }
        return NextResponse.redirect(new URL("/select-plan", request.url));
      }
    } catch {
      // If subscription check fails, allow access rather than locking out
      // This prevents edge cases where a DB error locks paying customers out
      return response;
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/upload/:path*",
    "/jobs/:path*",
    "/analysis/:path*",
    "/select-plan",
    "/onboarding",
    "/api/:path*",
    // Public marketing pages, matched ONLY for the server-side pageview capture above.
    // They short-circuit before any auth/subscription logic.
    "/",
    "/extension",
    "/blog/:path*",
    "/privacy",
    "/security",
    "/terms",
    "/refund",
    "/support",
  ],
};