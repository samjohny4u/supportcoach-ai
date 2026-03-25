# SUPPORTCOACH AI — CONTEXT FILE
# Last updated: March 25, 2026

## PROJECT STATUS
- **Phase:** Live in Production — Paddle billing fully verified end-to-end, landing page and nav complete
- **All MVP features are DONE**
- **RLS security is ENABLED on all tables**
- **Production deployment is LIVE at supportcoach.io**
- **Paddle billing is FULLY WORKING — checkout, webhooks, database updates all verified**
- **Codebase:** GitHub repo, committed and pushed, auto-deploys via Vercel

## COMPLETED TASKS
- Task 0: Remove manager-insights route and dashboard panel — DONE
- Task 1: Run topic reclassification — DONE
- Task 2: Verify duplicate detection in create-analysis-job — DONE
- Task 3: Human-readable job titles and verified status badges — DONE
- Task 4: Worker trigger button rename + auto-trigger — DONE
- Task 5: Verify exclude filter coverage across all files — DONE
- Task 6: Pattern Cards UI — DONE
- Task 7: Surface quick_summary and copy coaching message — DONE
- Task 8: Attention priority badges — DONE
- Task 9: Global error boundary and 404 page — DONE
- Section 9k: Company Coaching Context — settings page + worker prompt injection — DONE
- Section 9l: Per-Chat Re-Analyze Button — DONE
- Encoding fix: Dashboard garbled Unicode characters replaced with clean ASCII — DONE
- Upload page: Click to Upload with drag-and-drop and centered Upload and Analyze button — DONE
- Prompt fix: Coaching opening variety — DONE
- Prompt fix: Reduced timestamp obsession — DONE
- RLS policies enabled on all tables — DONE
- Landing page with hero, features, and pricing — DONE
- Pluralization fix across all pages — DONE
- Coaching context bug fix: Worker now fetches and injects coaching_context on first analysis (was only working on re-analyze) — DONE
- Opening variety enforcement: Added explicit "BANNED" rule for "this chat was really about" opening pattern — DONE
- Evidence preservation: Added instruction to maintain evidence-based coaching even when company context is present — DONE
- Production deployment to Vercel — DONE
- Domain supportcoach.io connected — DONE
- Terms of Service page at /terms — DONE
- Privacy Policy page at /privacy — DONE
- Refund Policy page at /refund — DONE
- Customer Support page at /support (with address and phone for Stripe/Paddle compliance) — DONE
- Paddle billing account approved — DONE
- Paddle billing integration code — DONE (all files built and deployed)
  - SQL migration: subscriptions table + plan/trial_ends_at columns on organizations — DONE
  - Environment variables: PADDLE_API_KEY, PADDLE_WEBHOOK_SECRET, NEXT_PUBLIC_PADDLE_CLIENT_TOKEN, NEXT_PUBLIC_PADDLE_ENVIRONMENT — DONE
  - src/lib/paddle.ts — price mapping, webhook verification — DONE
  - src/lib/planAccess.ts — plan gating logic, feature access per tier — DONE
  - src/app/api/paddle-webhook/route.ts — webhook receiver for subscription lifecycle — DONE
  - src/app/api/subscription-status/route.ts — returns org plan and access status — DONE
  - src/app/select-plan/page.tsx — plan selection with seat picker and Paddle checkout overlay — DONE
  - src/components/TrialBanner.tsx — trial countdown banner on dashboard — DONE
  - src/app/dashboard/billing/page.tsx — billing management page — DONE
  - src/app/onboarding/page.tsx — redirects to /select-plan after org creation — DONE
  - src/app/api/onboarding/route.ts — sets plan='trial' and trial_ends_at on new orgs — DONE
  - middleware.ts — subscription/trial lock check, redirects expired trials to /select-plan — DONE
  - src/app/dashboard/page.tsx — TrialBanner component added — DONE
  - Paddle products and prices created in dashboard (3 products × 2 prices each) — DONE
  - Paddle webhook endpoint configured pointing to https://www.supportcoach.io/api/paddle-webhook — DONE
- Paddle billing end-to-end verified (March 25, 2026) — DONE
  - Root cause of 400 error: default payment link URL was not saved in Paddle dashboard
  - Fix: set default payment link to https://www.supportcoach.io/select-plan in Paddle Checkout Settings
  - Root cause of webhook failures: webhook URL was set to non-www (https://supportcoach.io) causing 308 redirect — Paddle does not follow redirects
  - Fix: updated webhook URL to https://www.supportcoach.io/api/paddle-webhook (with www)
  - Full flow verified: checkout overlay → card processed → webhook delivered → organizations.plan updated to 'starter' → subscriptions table populated
  - Test subscription cancelled before April 8th charge date
- Landing page polish (March 25, 2026) — DONE
  - Annual/monthly pricing toggle with "2 months free" badge — DONE
  - Professional plan highlighted with green border and "Most Popular" badge — DONE
  - All pricing card bullet dots changed to consistent teal — DONE
  - ROI stats bar added above pricing toggle ($40,000+/mo, 1,000+ hrs, 40x ROI) — DONE
  - FAQ section added with 9 accordion questions — DONE
  - Footer added with Terms, Privacy, Refund, Support links and copyright — DONE
  - src/app/page.tsx converted to "use client" for toggle state — DONE
- Auth-aware nav (March 25, 2026) — DONE
  - Landing page (/) has its own nav built in — logged-out shows Features/Pricing/Login/Get Started, logged-in shows Dashboard/Logout
  - Logo on landing page links to / when logged out, /dashboard when logged in
  - src/components/AppNav.tsx created — app-wide nav shown on all pages except /
  - AppNav shows Upload/Dashboard/Settings/Logout on all interior pages
  - Logo in AppNav always links to /dashboard
  - Settings link points to /settings (not /dashboard/settings)
  - src/app/layout.tsx updated to use AppNav
  - Fixed multiple GoTrueClient instances bug — landing page now uses shared supabase client from src/lib/supabase.ts instead of creating a new instance

## CURRENT TASK
- No active blockers. Product is fully live with working billing.

## REMAINING BEFORE FULL LAUNCH
1. **UI design polish** — dashboard interior pages (fonts, colors, theme consistency). Landing page is complete.
2. **Plan gating enforcement** — API routes and dashboard pages do not yet check plan tier. Professional/Enterprise features accessible to all plans. Gating to be added after billing is confirmed stable.
3. **Password change flow** — Phase 2 item, post-Bangkok
4. **Self-signup improvements** — Phase 2 item, post-Bangkok
5. **Agent management** — Phase 2 item, post-Bangkok

## KNOWN ISSUES / BLOCKERS
- No active blockers
- AI team summary may still produce Unicode bullet characters — the API route strips them but the prompt also instructs plain ASCII
- First save on settings page shows NEXT_REDIRECT before working on second click — minor, not blocking
- subscription-status API route returns 401 when called from client-side fetch due to Route Handler cookie handling — TrialBanner and select-plan page use Supabase browser client directly as workaround
- Supabase RLS returns 406 on client-side subscriptions query — non-blocking, page works without it
- VS Code shows false TypeScript error "Cannot find module @/components/AppNav" — stale cache issue, does not affect Vercel build

## KEY DECISIONS MADE
- Manager-insights route removed (duplicated existing routes)
- Soft delete via `excluded` boolean, not hard delete
- Template-based pattern card narratives, not AI-generated (v1)
- Response time threshold: under 2 min = normal, 2-4 min = notable, over 4 min = coaching point
- Timestamps only cited when timing is actually a coaching point — not as decoration
- Coaching openings must vary naturally — "this chat was really about" pattern is explicitly banned
- Pre-formatted structured transcripts sent to AI instead of raw PDF text
- knownSenderNames set for handling inconsistent PDF spacing
- Company coaching context: manager-provided process knowledge injected into AI prompt per org
- Per-chat re-analyze: one chat at a time, no bulk — intentional cost control
- Two-layer API integration strategy: full metadata ingest + selective AI analysis (Section 10c)
- RLS enabled on all tables. Service role key bypasses RLS. Application-level org filtering maintained as defense-in-depth.
- Paddle approved first — will be primary billing provider. Stripe as backup if approved.
- Deploy first, polish later — app is live and functional, UI improvements happen iteratively.
- If a fix attempt fails, STOP. Do not cascade fixes.
- Paddle billing: collect credit card upfront at trial start, 14-day free trial with all features unlocked, auto-bill on day 14, app locks on trial expiry or cancellation
- Paddle billing: per-agent seat pricing from day one ($29/$59/$99 per agent per month)
- Paddle billing: annual pricing with 2 months free ($290/$590/$990 per agent per year)
- Paddle billing: new signups start on trial with all features unlocked, pick plan at signup, features gate to plan tier after trial
- Paddle billing: Paddle checkout overlay (popup on site) not redirect
- Paddle billing: TrialBanner and select-plan page use Supabase browser client directly (not subscription-status API route) due to Route Handler cookie issues
- Paddle billing: webhook URL must use www (https://www.supportcoach.io) — non-www causes 308 redirect which Paddle does not follow
- Paddle billing: default payment link must be set in Paddle Checkout Settings before checkout will work
- Landing page: src/app/page.tsx is "use client" — required for annual/monthly toggle state and auth-aware nav
- Landing page nav: uses shared supabase client from src/lib/supabase.ts — never create a second Supabase client instance on the landing page
- Nav architecture: AppNav (src/components/AppNav.tsx) renders on all pages except / — landing page handles its own nav internally

## FILES THAT MUST NOT BREAK
- `src/app/api/process-jobs/route.ts` — the core worker
- `src/app/dashboard/page.tsx` — main dashboard
- `src/app/api/create-analysis-job/route.ts` — upload pipeline
- `src/lib/currentOrganization.ts` — org resolution for multi-tenancy
- `middleware.ts` — auth + subscription lock check
- `src/lib/paddle.ts` — Paddle price mapping and webhook verification
- `src/lib/planAccess.ts` — plan gating logic
- `src/app/page.tsx` — public landing page
- `src/components/AppNav.tsx` — app-wide nav for all interior pages
- `src/app/layout.tsx` — root layout, imports AppNav
- `src/app/api/paddle-webhook/route.ts` — Paddle webhook receiver

## DOCUMENTS TO READ ON NEW THREAD
1. `docs/RULES.md` — standing orders (read first, always)
2. `docs/CONTEXT.md` — this file
3. `docs/codex-orchestration.md` — completed task list (reference only)
4. `docs/supportcoach-ai-context.md` — full master prompt

## NEW THREAD STARTER MESSAGE
"I'm continuing development of SupportCoach AI. Read docs/RULES.md and docs/CONTEXT.md for current status. The app is live at supportcoach.io. Paddle billing is fully working end-to-end — checkout, webhooks, and database updates all verified March 25, 2026. Remaining work: dashboard UI polish and plan gating enforcement."
```

---

Push it:
```
git add docs/CONTEXT.md
```
```
git commit -m "docs: update CONTEXT.md — Paddle billing fully verified, all blockers resolved"
```
```
git push