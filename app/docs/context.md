# SUPPORTCOACH AI — CONTEXT FILE
# Last updated: March 25, 2026

## PROJECT STATUS
- **Phase:** Live in Production — Paddle checkout blocked by Paddle-side error, landing page polish complete
- **All MVP features are DONE**
- **RLS security is ENABLED on all tables**
- **Production deployment is LIVE at supportcoach.io**
- **Paddle billing integration is BUILT — checkout blocked by Paddle 400 error (their side)**
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
  - Paddle webhook endpoint configured pointing to /api/paddle-webhook — DONE
- Landing page polish (March 25, 2026) — DONE
  - Annual/monthly pricing toggle with "2 months free" badge — DONE
  - Professional plan highlighted with green border and "Most Popular" badge — DONE
  - All pricing card bullet dots changed to consistent teal — DONE
  - ROI stats bar added above pricing toggle ($40,000+/mo, 1,000+ hrs, 40x ROI) — DONE
  - FAQ section added with 9 accordion questions — DONE
  - Footer added with Terms, Privacy, Refund, Support links and copyright — DONE
  - src/app/page.tsx converted to "use client" for toggle state — DONE

## CURRENT TASK
- Waiting on Paddle support to resolve checkout 400 error

## REMAINING BEFORE FULL LAUNCH
1. **Paddle checkout fix** — Paddle returning 400 "unexpected internal error" on Checkout.open(). Support ticket submitted. All code is ready — once Paddle resolves, checkout will work end-to-end.
2. **UI design polish** — dashboard interior pages (fonts, colors, theme consistency — user exploring shadcn/ui). Landing page is complete.

## KNOWN ISSUES / BLOCKERS
- **BLOCKER: Paddle checkout returns 400** — `POST checkout-service.paddle.com/transaction-checkout` returns `{"errors":[{"status":405,"code":"unexpected","details":"Internal error"}]}`. Confirmed not a code issue — same error when calling Paddle.Checkout.open() directly from browser console with a hardcoded price ID. Paddle support contacted.
- AI team summary may still produce Unicode bullet characters — the API route strips them but the prompt also instructs plain ASCII
- First save on settings page shows NEXT_REDIRECT before working on second click — minor, not blocking
- subscription-status API route returns 401 when called from client-side fetch due to Route Handler cookie handling — TrialBanner and select-plan page use Supabase browser client directly as workaround
- Supabase RLS returns 406 on client-side subscriptions query — non-blocking, page works without it

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
- Landing page: src/app/page.tsx is "use client" — required for annual/monthly toggle state

## FILES THAT MUST NOT BREAK
- `src/app/api/process-jobs/route.ts` — the core worker
- `src/app/dashboard/page.tsx` — main dashboard
- `src/app/api/create-analysis-job/route.ts` — upload pipeline
- `src/lib/currentOrganization.ts` — org resolution for multi-tenancy
- `middleware.ts` — auth + subscription lock check
- `src/lib/paddle.ts` — Paddle price mapping and webhook verification
- `src/lib/planAccess.ts` — plan gating logic
- `src/app/page.tsx` — public landing page

## DOCUMENTS TO READ ON NEW THREAD
1. `docs/RULES.md` — standing orders (read first, always)
2. `docs/CONTEXT.md` — this file
3. `docs/codex-orchestration.md` — completed task list (reference only)
4. `docs/supportcoach-ai-context.md` — full master prompt

## NEW THREAD STARTER MESSAGE
"I'm continuing development of SupportCoach AI. Read docs/RULES.md and docs/CONTEXT.md for current status. The app is live at supportcoach.io. Paddle billing integration code is complete but checkout is blocked by a Paddle-side 400 error — waiting on their support. Landing page is complete. Remaining work: Paddle checkout fix and dashboard UI polish."
```