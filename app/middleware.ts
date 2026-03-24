import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

export async function middleware(request: NextRequest) {
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

  // If not authenticated, let Next.js handle it (login redirect etc.)
  if (!user) {
    return response;
  }

  const pathname = request.nextUrl.pathname;

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
  ],
};