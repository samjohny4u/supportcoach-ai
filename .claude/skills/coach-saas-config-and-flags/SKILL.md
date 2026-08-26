---
name: coach-saas-config-and-flags
description: Load this skill when you need to know or change ANY configuration value in the supportcoach-ai repo (SupportCoach AI Manager Dashboard) — what each env var DOES and what breaks without it (the per-variable inventory table lives HERE; for where vars are SET and .env.local bootstrap use coach-saas-build-env-run), the Paddle price-id constants and their four-place coupling, plan/trial constants (14-day trial, PLAN_HIERARCHY, lookback windows 30/90/365, LIMIT 15), where plan access is actually checked (and where it is NOT — feature gating is unenforced), the hard-coded gpt-5.4 model id at 8 call sites, worker batch sizes and limits (1 job per invocation, BATCH_SIZE 10, report LIMIT 200), the middleware matcher, next.config, per-org DB columns that act as the only runtime flags, and the Paddle-dashboard-side config that behaves like code config (3 products x 2 prices, webhook URL, default payment link). Load BEFORE tuning any threshold, changing a price, swapping the model, or adding a new env var. To land the change itself use coach-saas-change-control; for env setup mechanics use coach-saas-build-env-run; for why a config value caused an incident use coach-saas-failure-archaeology; for enforcing plan gating use coach-saas-plan-gating-campaign.
---

# Configuration axes and flags for supportcoach-ai

Everything below verified directly against the repo on 2026-07-17. HEAD `93de005` (104 commits, single branch `main`). Repo root has only `README.md` + `app/`; all paths below are relative to `C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\` unless noted. Owner: Johny Patrick, solo. Production = https://www.supportcoach.io, auto-deployed from `main` by Vercel — there is no staging, so **every config value in this file is a production value**. There is no "experimental" tier and no feature-flag framework anywhere in the codebase; the closest things to flags are per-org DB columns (Section 9).

## 0. The one-sentence model

Configuration lives in FIVE planes — (1) env vars in `app/.env.local` + the Vercel dashboard, (2) hard-coded TypeScript constants scattered across `app/src`, (3) per-org columns in Supabase, (4) `app/middleware.ts` matcher + `app/next.config.ts`, (5) the Paddle dashboard — and only planes 2 and 4 are in git, so changing anything in planes 1, 3, or 5 MUST be recorded in `app/docs/context.md` or the knowledge is lost (per coach-saas-change-control).

Jargon used once, defined once: **worker** = the analysis route that calls OpenAI on uploaded transcripts (`app/src/app/api/process-jobs/route.ts` batch; `app/src/app/api/reanalyze-analysis/route.ts` per-chat). **Plan** = `trial | starter | professional | enterprise`. **Lookback window** = how many days of prior delivered coaching points get injected into a new analysis.

## 1. Environment variables (plane 1)

`app/.env.local` defines exactly these 9 variable NAMES (verified 2026-07-17 by regex on names only — owner standing rule: NEVER read the values). The same set is configured in the Vercel dashboard (codex-orchestration.md lines 363, 384 — Vercel-side state itself is UNVERIFIABLE from the repo).

| Variable | Read by (verified call sites) | What breaks without it | Guard in code |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Every Supabase client: `middleware.ts:11,68`, `src/lib/supabase.ts`, `src/lib/supabaseServer.ts`, `src/lib/coachingFollowthrough.ts`, ~25 routes/pages | Everything — auth, data, workers. Used with `!` non-null assertion everywhere; missing = runtime crash on first request | None (`!` assertion) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser client (`src/lib/supabase.ts`), server auth (`src/lib/supabaseServer.ts`), `middleware.ts:12`, topics pages | Login/session, all client-side reads (TrialBanner, select-plan per rule 35) | None |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin clients in `middleware.ts:69` and most API routes + server pages (dashboard, jobs, analysis, settings, agent) | All server-side data access. NOTE: the middleware subscription lock swallows this in its fail-open catch (`middleware.ts:149-153`) — a missing key silently DISABLES the billing lock rather than erroring | Middleware fail-open only; routes crash |
| `OPENAI_API_KEY` | All 8 model call sites (Section 4) | Every analysis, report, summary, reclassification | Only `api/analyze/route.ts:209` checks presence and returns 500; all other sites throw at call time |
| `NEXT_PUBLIC_SITE_URL` | `api/logout/route.ts:11`, `dashboard/page.tsx:239` (dashboard fetches its OWN `/api/team-summary` through this base URL) | Falls back to `http://localhost:3000`: in production the AI team summary silently returns null and logout redirects to localhost | Fallback literal — a silent-wrong-value trap, not a guard |
| `PADDLE_WEBHOOK_SECRET` | `api/paddle-webhook/route.ts:15` | Webhook returns 500 "Webhook not configured" → Paddle retries → no subscription ever recorded → paying customers stay locked out after trial | Explicit presence check, 500 (route.ts:17-23) |
| `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` | `select-plan/page.tsx:158`, `dashboard/billing/page.tsx:53` (`Paddle.Initialize({ token })`) | Checkout overlay never opens; users cannot subscribe | "Payment system is loading" alert path only |
| `PADDLE_API_KEY` | **Nothing.** Zero references in code (verified by grep; only docs mention it) | Nothing today — reserved for future Paddle API calls. Still covered by rules.md rule 19 (never expose) | n/a |
| `NEXT_PUBLIC_PADDLE_ENVIRONMENT` | **Nothing.** Zero code references | Nothing. There is NO sandbox switch in code — the client token alone selects the Paddle account. rules.md "PAST MISTAKES": the lowercase `environment` param was removed from `Paddle.Initialize` because Paddle v2 rejects it | n/a |

Re-verify names (values never printed):

```powershell
Select-String -Path C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\.env.local -Pattern '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=' | ForEach-Object { $_.Matches[0].Groups[1].Value }
```

Re-verify who reads what:

```powershell
Get-ChildItem C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app -Recurse -Include *.ts,*.tsx -Exclude node_modules | Select-String -Pattern 'process\.env\.'
```

Adding an env var = adding it in `.env.local` AND the Vercel dashboard AND documenting it in context.md — three places or it works locally and dies in production.

## 2. Paddle price constants — the four-place (not two-place) coupling

rules.md rule 36 says: price changes must update BOTH `PADDLE_PRICE_MAP` and `PLAN_PRICES` in `app/src/lib/paddle.ts`. Verified reality on 2026-07-17 is stricter — the same 6 price ids and dollar amounts live in FOUR code locations plus the Paddle dashboard:

| # | Location | Contents | Who consumes it |
|---|---|---|---|
| 1 | `src/lib/paddle.ts:7` `PADDLE_PRICE_MAP` | 6 price ids → `{plan, interval}` | `getPlanFromPriceId` (`paddle.ts:109`) → `api/paddle-webhook/route.ts:92`. **Webhook direction**: unmapped price id silently defaults to `plan="starter"`, `interval="monthly"` (webhook route lines 93-94) — a wrong entry misprices the org's cached plan |
| 2 | `src/lib/paddle.ts:49` `PLAN_PRICES` | plan → `{monthly, annual}` price ids | **Nothing imports it** (verified: only definition matches in `app/src`). It exists to satisfy rule 36; keep it updated anyway — rule 36 is a standing order and a future consumer may appear |
| 3 | `src/app/select-plan/page.tsx:15` local `PLAN_PRICES` | price ids AND dollar amounts (29/59/99 monthly, 290/590/990 annual, perMonth 24.17/49.17/82.50) | **The one checkout actually uses** (`page.tsx:191-198` → `Paddle.Checkout.open`). A price change that skips this file sells at the old price id |
| 4 | `src/app/page.tsx:28-60` | display strings `$29/$59/$99`, `$290/$590/$990` | Public landing-page pricing cards (marketing only, no checkout) |
| 5 | Paddle dashboard | The 6 price entities themselves (3 products x 2 prices, each with a 14-day trial — codex-orchestration.md:380-381) | Paddle billing engine. NOT in git; see Section 8 |

**Both-or-broken, concretely:** #1 is the webhook (money → database) direction, #3 is the checkout (user → money) direction. Updating #3 without #1 means new subscriptions get recorded as starter/monthly regardless of what was bought. Updating #1 without #3 means checkout opens the old Paddle price. Treat any price change as a 4-file + 1-dashboard change, savepoint first, and record the dashboard half in context.md.

```powershell
Get-ChildItem C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\src -Recurse -Include *.ts,*.tsx | Select-String -Pattern 'pri_01' | Group-Object Path | Select-Object Name, Count
```

Expected: exactly 3 files (`lib/paddle.ts`, `select-plan/page.tsx`, and no others). If a fourth file appears, the coupling grew — update this skill.

## 3. Plan and trial constants — and where plan access is actually checked

### 3a. Constants (all hard-coded, all production)

| Constant | Value | Location | Notes |
|---|---|---|---|
| Trial length | 14 days | `api/onboarding/route.ts:78-79` (`setDate(getDate()+14)`) | ALSO baked into select-plan marketing copy ("Start 14-Day Free Trial", `select-plan/page.tsx:240,416,426`) and into the Paddle price entities (14-day trial per price, dashboard-side). Changing trial length = code + copy + Paddle dashboard, three planes |
| `PLAN_HIERARCHY` | trial 0, starter 1, professional 2, enterprise 3 | `src/lib/paddle.ts:41` | Consumed by `planAccess.ts` (`getFeatureAccess`, `isUpgrade`) |
| Feature tier thresholds | level >= 2 Professional+ (topics, coaching insights, pattern cards); level >= 3 Enterprise (FAQ AI, integrations) | `src/lib/planAccess.ts:214-224` | See 3b for the enforcement gap |
| Lookback windows | starter/trial 30, professional 90, enterprise 365 | `src/lib/planAccess.ts:243-248` `getFollowthroughWindowDays` | **Duplication trap**: `COACHING_FOLLOWTHROUGH_WINDOW_DAYS` (`planAccess.ts:235`) holds the same numbers but is imported by NOTHING — the function re-hard-codes them as literals. Editing the const changes nothing; edit both or you create silent doc-vs-behavior drift |
| Prior-points cap | `COACHING_FOLLOWTHROUGH_LIMIT = 15` | `src/lib/planAccess.ts:241` | Enforced in `src/lib/coachingFollowthroughFetch.ts:82`. Locked design decision (context.md: "LIMIT 15 prior coaching points per analysis regardless of plan") — cost control, not a tunable |
| Prior-rows fetch cap | `.limit(50)` analyses rows | `coachingFollowthroughFetch.ts:37` | Upstream of the 15-point cap |
| Trial banner urgency | `days <= 3` turns banner urgent | `src/components/TrialBanner.tsx:135` | Cosmetic |
| Seat picker bounds | min 1, input max 999 | `select-plan/page.tsx:292-301` | Actual seats billed = Paddle checkout quantity |

### 3b. Where plan access is checked (verified consumer map)

- `middleware.ts:64-153` — the ONLY enforcement that locks anyone out: subscription/trial lock on `/dashboard /upload /jobs /analysis`, redirect to `/select-plan`, **fail-open** on any error (rules.md rule 37 — do not "fix" this to fail closed).
- `getFollowthroughWindowDays` — used for real in `api/process-jobs/route.ts` (via `coachingFollowthroughFetch.ts:25`) and `dashboard/agent/[name]/page.tsx:133`. This is the only per-tier FEATURE difference that is live today.
- `getOrgAccess` (`planAccess.ts:34`) with its `canAccessTopics/PatternCards/FaqAi/...` booleans — consumed ONLY by `api/subscription-status/route.ts:66`, which client pages deliberately avoid (rules.md rule 35: cookie issue). Net effect, confirmed by context.md "REMAINING BEFORE FULL LAUNCH" item 3: **plan feature gating is UNENFORCED — Professional/Enterprise features are accessible to all plans.** This is a known, owner-accepted open item, not a bug to hotfix; building the enforcement is `coach-saas-plan-gating-campaign`'s job.

```powershell
Get-ChildItem C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\src -Recurse -Include *.ts,*.tsx | Select-String -Pattern 'getOrgAccess|getFollowthroughWindowDays|PLAN_HIERARCHY'
```

## 4. The hard-coded model id — `"gpt-5.4"`, 8 call sites (count verified 2026-07-17)

No env var, no shared constant — the model id is a string literal at each site. `temperature: 0.2` accompanies it everywhere EXCEPT team-summary (no temperature param there). A model swap is a multi-file production change: savepoint first (coach-saas-change-control Section 2), and remember the two worker routes are a matched pair (prompt/schema parity rule).

| # | File | Line | Purpose | Structured output? |
|---|---|---|---|---|
| 1 | `src/app/api/process-jobs/route.ts` | 962 | Batch analysis worker | Prompt-only "Return ONLY valid JSON" — NO `response_format` |
| 2 | `src/app/api/reanalyze-analysis/route.ts` | 594 | Per-chat re-analyze worker (duplicate prompt of #1) | Prompt-only, NO `response_format` |
| 3 | `src/app/api/team-summary/route.ts` | 21 | Dashboard weekly summary | `json_schema` strict (line 50); prompt line 42 mandates plain ASCII (the Unicode-war fix) |
| 4 | `src/app/api/reclassify-topics/route.ts` | 52 | Topic re-classification | `json_object` (line 79) |
| 5 | `src/app/api/manager-report/route.ts` | 188 | Manager report API | Free text + `sanitizeReport` strip (line 43) |
| 6 | `src/app/api/manager-report-pdf/route.ts` | 108 | PDF report | Free text + `sanitizeReportText` (line 63) |
| 7 | `src/app/dashboard/report/page.tsx` | 179 | Report page (server component calls OpenAI directly) | Free text + `sanitizeReport` (line 41) |
| 8 | `src/app/api/analyze/route.ts` | 264 | Legacy single-transcript analyzer — **no in-repo callers found** (upload flow uses create-analysis-job + process-jobs). Apparent orphan; intent UNVERIFIED — do not delete unasked (rules 2-5) | — |

Only sites #1 and #2 carry the coaching prompt/JSON schema and MUST change together. Sites #3-#7 are independent prompts. Note that #1/#2 relying on prompt-only JSON (no `response_format`) is itself a config posture — adding `response_format` there is a behavior change to BOTH routes, class 4c in coach-saas-change-control.

```powershell
Get-ChildItem C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\src -Recurse -Include *.ts,*.tsx | Select-String -Pattern '"gpt-5.4"'
```

Expected: exactly 8 matches. Any other count means this section is stale.

## 5. Worker batch sizes and limits (plane 2)

| Axis | Value | Location | Behavior / guard |
|---|---|---|---|
| Jobs per worker invocation | 1 (oldest pending/processing) | `process-jobs/route.ts:751-756` `.limit(1)` | One GET = one job; multiple queued jobs need multiple triggers |
| Items per invocation | ALL pending items of that job, sequential loop | `process-jobs/route.ts:772-791` | No per-invocation item cap. Guard against double-processing: conditional claim UPDATE `status pending → processing` where `analysis_id IS NULL` (lines 793-809); losers of the race `continue` |
| Worker trigger | Browser-only; NO cron anywhere | `upload/page.tsx:108-127` auto-trigger after upload; `src/components/WorkerTriggerButton.tsx:41` manual "Process Now" | GET `/api/process-jobs` has NO auth check in the route itself and uses the service-role client — it only processes pending queue items, but treat that as a known-open posture, not a feature |
| Function timeout | No `maxDuration` exported anywhere; only `export const runtime = "nodejs"` (14 routes) | verified by grep | Vercel's plan-default serverless timeout applies to a worker invocation processing many items. Exact limit depends on the Vercel plan — UNVERIFIED from the repo; large uploads hitting the timeout mid-job is an OPEN risk with no written incident history |
| Reclassify batch | `BATCH_SIZE = 10`, `BATCH_DELAY_MS = 500` | `reclassify-topics/route.ts:17-18` | Paged with `.range()`, sleeps between batches |
| Report input cap | `.limit(200)` analyses | `manager-report/route.ts:166`, `manager-report-pdf/route.ts:89`, `dashboard/report/page.tsx:91` | Three copies of the same cap — change all three together |
| Follow-through injection | 50 rows fetched, flattened to max 15 points, plan-windowed 30/90/365 days | Section 3a | Fails soft: fetch errors → empty array, analysis proceeds without follow-through |
| Duplicate upload detection | SHA-256 of trimmed transcript, checked in-batch and against `analysis_job_items` per org | `create-analysis-job/route.ts:14-16, 84-129` | No cap on file count per upload; all-duplicates upload returns 400 |
| Quick-summary fallback thresholds | score `<= 5` flags a weakness; max 2 parts joined | `process-jobs/route.ts:281-305` | Fallback path only, when the AI's own quick_summary is unusable |

## 6. Middleware matcher and lock config (plane 4)

`app/middleware.ts:159-168` — the `config.matcher` (7 patterns): `/dashboard/:path*`, `/upload/:path*`, `/jobs/:path*`, `/analysis/:path*`, `/select-plan`, `/onboarding`, `/api/:path*`. Inside the handler:

- `skipPaths` (lines 40-54, 13 entries): select-plan, onboarding, paddle-webhook, subscription-status, api/onboarding, api/signup, api/logout, login, signup, terms, privacy, refund, support — always pass.
- `protectedPaths` (line 61, 4 entries): dashboard, upload, jobs, analysis — subscription lock applies.
- Locked users may still reach `/dashboard/billing` (lines 143-146).
- Any error in the check → allow (lines 149-153). **Fail-open is a non-negotiable** (rules.md rule 37).

Consequence of the matcher shape: `/api/:path*` is matched but NOT in `protectedPaths`, so API routes get session-cookie refresh from middleware but no subscription lock — each route does (or does not do) its own auth. Adding a new page under a new top-level path means deciding whether it joins `matcher` AND `protectedPaths` AND/OR `skipPaths`; forgetting all three silently exempts it from the billing lock.

```powershell
Select-String -Path C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\middleware.ts -Pattern 'matcher|skipPaths|protectedPaths|allow access' -Context 0,2
```

## 7. next.config.ts — deliberately empty

`app/next.config.ts` is the default stub: `const nextConfig: NextConfig = {};`. No redirects, no headers, no image domains, no experimental flags. Two implications: (a) the www vs non-www 308 redirect that broke Paddle webhooks (Section 8) is Vercel/domain-level, NOT in this file; (b) any first entry added here is a new configuration plane going live in production on push — treat as a change-control event, not housekeeping.

```powershell
Get-Content C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\next.config.ts
```

## 8. Paddle-dashboard-side config (plane 5 — behaves like code, invisible to git)

Both production billing incidents were dashboard config, not code (context.md lines 59-64; full narratives in coach-saas-failure-archaeology). Current known-good state, as documented in codex-orchestration.md lines 377-401:

| Dashboard setting | Known-good value (as of docs, 2026-03-25 verification) | Breaks how if wrong |
|---|---|---|
| Products / prices | 3 products (Starter, Professional, Enterprise) x 2 prices each (monthly, annual), 14-day trial on each price | Price ids must match Section 2's constants exactly; a recreated price gets a NEW id and silently decouples checkout from the webhook mapping |
| Webhook destination | `https://www.supportcoach.io/api/paddle-webhook` — the `www` host is load-bearing | Non-www 308-redirects; Paddle does not follow redirects → webhooks silently dropped (the March 25 incident) |
| Webhook secret | Pairs with env `PADDLE_WEBHOOK_SECRET` | Rotating it in Paddle without updating Vercel env = every event 401s |
| Default payment link | `https://www.supportcoach.io/select-plan` in Checkout Settings | Unset = checkout 400 before it even opens (the March 24 incident) |

Rules for this plane: read-only unless the owner explicitly instructs (owner standing rule — never mutate live systems unasked); after ANY dashboard change, paste what changed into `app/docs/context.md` — the docs are this plane's only version control. No re-verification command exists from the repo; verification = owner checks the Paddle dashboard, or a webhook test event.

## 9. Per-org DB columns — the only runtime "flags" (plane 3)

There is no feature-flag framework. Runtime behavior toggles live as Supabase columns (schema NOT in git — docs are the schema of record, see coach-saas-change-control 4b):

| Column | Default | Effect | Written by |
|---|---|---|---|
| `organizations.auto_mark_coaching_delivered` | `true` | `false` = CopyButton's silent auto-mark no-ops; manual toggles still work | Settings page (Phase 2 Task 4) |
| `organizations.coaching_context` | empty | Non-empty = injected verbatim into BOTH worker prompts (`process-jobs/route.ts:945-958`, `reanalyze-analysis/route.ts:577-590`); fetch fails soft | Settings page (Section 9k) |
| `organizations.plan` / `organizations.trial_ends_at` | `'trial'` / now+14d at onboarding | Middleware lock + lookback window selection. `plan` is a webhook-updated CACHE; `subscriptions` table is the billing source of truth (rule 34) | `api/onboarding`, `api/paddle-webhook` |
| `chat_analyses.excluded` | `false` | Soft-delete: every stats/report query must filter it (rule 15; both `.eq("excluded", false)` and `.neq("excluded", true)` styles exist in code) | `api/toggle-exclude` only |

Flipping any of these on a LIVE org is a production mutation — owner does it, or explicitly instructs (the test-org reset SQL in context.md line 259 is the owner's own tool, org id `8e71dc46-e674-4131-8709-506223a35d7e`).

## 10. Add-a-config-axis checklist (route through coach-saas-change-control)

When adding any new configurable value (env var, constant, threshold, dashboard setting):

1. Load `coach-saas-change-control`; classify the blast radius (its Section 4). A new env var or Paddle setting is class "not-in-git" — plan the context.md record up front.
2. Decide the plane deliberately: env var (secret or per-deploy), TS constant (versioned, ships on push), per-org DB column (runtime-tunable, needs SQL block with `IF NOT EXISTS` for the owner to run in the Supabase SQL Editor), or Paddle dashboard (owner-only).
3. ONE definition site. Do not create a second copy of an existing value — this repo already carries three known duplication traps (price ids x4 in Section 2, lookback days x2 in Section 3a, report `limit(200)` x3 in Section 5). If duplication is unavoidable, name every copy in your handoff and in context.md.
4. Guard the absence: explicit presence check with a clear error (the `PADDLE_WEBHOOK_SECRET` pattern, webhook route lines 17-23) — never a silent fallback to a wrong value (the `NEXT_PUBLIC_SITE_URL` localhost trap). Exception: anything in the middleware lock path must keep failing OPEN (rule 37).
5. Secrets: server-only name (no `NEXT_PUBLIC_` prefix), never logged, never client-exposed (rules 17-19).
6. If it touches the workers' prompt/schema: apply to BOTH `process-jobs` and `reanalyze-analysis` (change-control 4c) and state that only NEW analyses are affected.
7. Env vars: set in `.env.local` AND Vercel; DB columns: deliver the SQL block, never run it unasked; Paddle: owner changes it, you record it.
8. Add the new axis to THIS skill's tables and to `app/docs/context.md` as part of the same change (docs update is part of the change, not optional).
9. Gate locally from `app/` (PowerShell 5.1 — no `&&`):

```powershell
npm run lint
npm run build
```

10. End with a numbered manual-test checklist for the owner, including one step that exercises the MISSING-value path (e.g. rename the var locally, confirm the guard's error appears). Do not push — push is a production deploy.

## When NOT to use this skill

- Landing the change (savepoints, commits, doc sync, blast radius) → `coach-saas-change-control` — nothing here routes around it.
- Setting up a dev environment / getting `npm run dev` working → `coach-saas-build-env-run`.
- A config value is suspected in a LIVE failure → `coach-saas-debugging-playbook`; the history of the Paddle 400 / webhook-308 / Unicode incidents → `coach-saas-failure-archaeology`.
- Why the system is shaped this way (invariants, data flow) → `coach-saas-architecture-contract`.
- Building the missing plan-gating enforcement (Section 3b's gap) → `coach-saas-plan-gating-campaign`.
- Verifying behavior after a config change in depth → `coach-saas-validation-and-qa`.
- Prompt semantics / transcript parsing behind the worker constants → `transcript-analysis-domain-reference`; pricing-page growth experiments → `supportcoach-growth-frontier`.
- Anything in the Chrome-extension repo (`C:\Users\CHIST\Desktop\GitRepo\support-coach-extension`) → its `coach-ext-config-and-flags`.

## Provenance and maintenance

Authored 2026-07-17 against HEAD `93de005`. Sources: `app/.env.local` (variable names only), `app/src/lib/paddle.ts`, `app/src/lib/planAccess.ts`, `app/src/lib/coachingFollowthroughFetch.ts`, `app/middleware.ts`, `app/next.config.ts`, `app/package.json`, the routes cited inline, `app/docs/rules.md`, `app/docs/context.md`, `app/docs/codex-orchestration.md` (lines 360-401), `app/docs/supportcoach-ai-context.md`, and `git log`. Known-open items are labeled OPEN/UNVERIFIED above; per the owner, some known issues never reached written history — do not invent incidents to explain them.

Volatile facts — re-verify before relying on them:

| Fact (as of 2026-07-17) | Re-verify with (PowerShell 5.1, run each line separately) |
|---|---|
| HEAD `93de005`, 104 commits, `main` only | `git -C C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai log --oneline -3` |
| 9 env var names in `.env.local`, incl. unused `PADDLE_API_KEY` / `NEXT_PUBLIC_PADDLE_ENVIRONMENT` | command in Section 1 |
| `gpt-5.4` at exactly 8 call sites | command in Section 4 |
| Price ids in exactly 3 files; `lib/paddle.ts` `PLAN_PRICES` still unimported | command in Section 2, then `Get-ChildItem C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\src -Recurse -Include *.ts,*.tsx` piped to `Select-String -Pattern 'from "@?/?.*lib/paddle"'` |
| `getOrgAccess` consumed only by subscription-status (gating still unenforced) | command in Section 3b; also `Select-String -Path C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\docs\context.md -Pattern "Plan gating"` |
| Lookback duplication: `COACHING_FOLLOWTHROUGH_WINDOW_DAYS` unimported, function literals 30/90/365 | `Select-String -Path C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\src\lib\planAccess.ts -Pattern "WINDOW_DAYS|return 90|return 365|return 30"` |
| Worker: 1 job per GET, no `maxDuration` anywhere | `Select-String -Path C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\src\app\api\process-jobs\route.ts -Pattern "limit\(1\)"` then grep `maxDuration` across `app/src` |
| Reclassify `BATCH_SIZE = 10` / `BATCH_DELAY_MS = 500`; report caps `.limit(200)` x3 | `Select-String -Path C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\src\app\api\reclassify-topics\route.ts -Pattern "BATCH_"` and grep `limit(200)` across `app/src` |
| Middleware matcher = 7 patterns, skipPaths = 13, fail-open intact | command in Section 6 |
| `next.config.ts` still empty | command in Section 7 |
| Trial = 14 days in onboarding route | `Select-String -Path C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\src\app\api\onboarding\route.ts -Pattern "getDate\(\) \+ 14"` |
| Paddle dashboard state (webhook URL www, payment link, 6 prices) | No repo command — owner verifies in the Paddle dashboard; docs of record: codex-orchestration.md lines 377-401, context.md lines 57-64 |
