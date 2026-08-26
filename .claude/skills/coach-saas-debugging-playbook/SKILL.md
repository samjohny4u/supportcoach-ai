---
name: coach-saas-debugging-playbook
description: Load this skill when diagnosing a LIVE failure or error symptom in the supportcoach-ai repo (SupportCoach AI Manager Dashboard, Next.js on Vercel at https://www.supportcoach.io, Supabase, OpenAI workers, Paddle billing). Symptoms that route here — white screen or Vercel build failure, Paddle checkout 400 / overlay won't open, webhook received nothing / plan never updated after payment, analyses stuck or never appearing after upload, items frozen in "processing", garbled Unicode characters in dashboard or AI output, "Multiple GoTrueClient instances" warning or session/auth flapping, users unexpectedly redirected to /select-plan (subscription lock), 401 from subscription-status, missing/misconfigured env vars. Core doctrine: check Paddle dashboard state and Vercel logs BEFORE changing code — two production sagas were dashboard config, not code. For the full settled-incident narratives use coach-saas-failure-archaeology; to SHIP a fix use coach-saas-change-control; for build/env/run mechanics use coach-saas-build-env-run; for design invariants use coach-saas-architecture-contract; for test procedure detail use coach-saas-validation-and-qa; for tunable constants use coach-saas-config-and-flags.
---

# Debugging playbook for supportcoach-ai

Everything below verified directly against the repo on 2026-07-17 (HEAD `93de005`, 104 commits, single branch `main`). All code lives under `app/`. Owner: Johny Patrick, solo dev. Production = https://www.supportcoach.io, auto-deployed from `main` by Vercel; there is no staging, no CI, no test suite.

Jargon, defined once:
- **Worker** = `app/src/app/api/process-jobs/route.ts` — the batch analysis route. A plain `GET` picks the oldest pending job and runs OpenAI analysis on its items.
- **Re-analyze route** = `app/src/app/api/reanalyze-analysis/route.ts` — per-chat re-run, `POST` from a form on the analysis page. The worker and this route carry DUPLICATE copies of the same system prompt.
- **Paddle** = the billing provider. Part of its behavior lives in the Paddle web dashboard (payment link, webhook URL, products/prices), NOT in this repo.
- **Fail open** = on error, allow access instead of blocking (the middleware's deliberate design, rules.md rule 37).

## 0. Rule zero: read state before writing code

The two worst debugging weeks in this repo's history (Mar 24-25, 2026) ended with ZERO code defects found. Checkout 400s were a missing default-payment-link in Paddle Checkout Settings; silent webhooks were a non-www webhook URL hitting a 308 redirect. Three isolation commits (`d68bbd5`, `1c92b1d`, `7b331d6`) and a cleanup commit (`2d3a9a7`) later, the code was back where it started. So, in order, BEFORE editing anything:

1. **Vercel dashboard** — Deployments (did the last push build? which commit is live?) and the function logs for the failing route. Console output from every `console.error` cited below lands here.
2. **Paddle dashboard** (billing symptoms) — Checkout Settings default payment link (`https://www.supportcoach.io/select-plan`), Notifications/webhook URL (`https://www.supportcoach.io/api/paddle-webhook`, WITH www), webhook delivery log, products/prices (3 products x 2 prices).
3. **Supabase Table Editor / SQL Editor** (read-only) — the rows tell you what actually happened: `analysis_jobs`, `analysis_job_items`, `chat_analyses`, `subscriptions`, `organizations`.
4. **Browser DevTools console + network tab** on the failing page.
5. Only then: the code, having read the whole file (rules.md rule 1).

If you change ANYTHING in the Paddle or Vercel dashboards, record it in `app/docs/context.md` — dashboard state is invisible to git. And per owner standing rules: never mutate production (SQL, deploys, dashboard settings, pushes) unasked; SQL below is written for the OWNER to run in the Supabase SQL Editor.

## 1. Triage table: symptom → first check → discriminating experiment

| Symptom | First check (no code edits) | Discriminating experiment | Section |
|---|---|---|---|
| Site shows old version / push didn't land | Vercel Deployments: did the build fail? | `npm run build` locally from `app/` — same TS error means build failure, prod still serves the LAST good deploy | 2 |
| White screen / crash on a page | Browser console + Vercel function log for that page | Does `src/app/error.tsx` boundary render instead? If yes it's a runtime throw, not a build issue | 2 |
| Paddle checkout 400 / overlay won't open | Paddle Checkout Settings: default payment link saved? | Browser console on /select-plan: `Paddle checkout error:` vs network 400 from Paddle's API — the latter was dashboard config (Mar 24) | 3 |
| Paid, but plan never updated / trial still locked | Paddle webhook delivery log: what HTTP status did deliveries get? | 308 in Paddle's log = wrong host (non-www). 200 with no DB change = look for `Paddle webhook:` errors in Vercel logs | 4 |
| Upload "succeeded" but no analysis appears | `analysis_jobs` + `analysis_job_items` status columns in Supabase | Item `status='pending'` → worker never ran (trigger GET /api/process-jobs). Item `status='processing'` forever → stuck claim (5c). `failed` → Vercel log | 5 |
| Duplicate upload seems ignored | Upload response body | `"All uploaded files were duplicates"` from create-analysis-job is BY DESIGN (sha-256 `transcript_hash` dedupe) | 5 |
| Re-analyze button "does nothing" | URL after submit: `?reanalyzed=1` or `?error=` | The route redirects, it doesn't render errors — check query string, then Vercel log | 5 |
| Garbled characters (â€¢, Ã©, boxes) in UI or AI text | Is it a STATIC string in a .tsx file or AI OUTPUT? | `Select-String -Pattern "[^\x00-\x7F]"` on the suspect file finds static offenders; AI output garbling = prompt-side ASCII rule | 6 |
| "Multiple GoTrueClient instances" warning, auth flapping | Grep for a second `createBrowserClient` call | Only `src/lib/supabase.ts` may create the browser client — any other call site is the bug | 7 |
| 401 from `/api/subscription-status` in client fetch | Known, documented behavior — not a regression | Rule 35: client components read billing via the Supabase browser client instead | 7 |
| User bounced to /select-plan unexpectedly | `subscriptions` + `organizations` rows for that org | Recompute the middleware lock by hand (Section 8 walkthrough); `subscriptions` wins over `organizations.plan` | 8 |
| Paying customers NOT locked out despite bad data / nobody ever locked | Vercel env: `SUPABASE_SERVICE_ROLE_KEY` present? | Middleware fails OPEN on any error — a broken service key silently disables the whole subscription lock | 8, 9 |
| Route 500s with "not configured" / OpenAI auth errors | Vercel env var list (names, not values) | Match against the canonical name list in Section 9; `NEXT_PUBLIC_*` changes need a redeploy to take effect | 9 |

## 2. White screen / build failure

Two different failures that look alike from a chair:

**A. Vercel build failure.** Push to `main` triggers a build; if `next build` fails (TypeScript error, missing import), Vercel keeps serving the previous successful deployment — the site does not go down, it goes STALE. Check the Vercel Deployments list for a red build against your commit. Reproduce locally (PowerShell 5.1 — no `&&`, run lines separately):

```powershell
Set-Location C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app
npm run lint
npm run build
```

If your change broke it: STOP, no cascading fixes, report file/error/previous state, revert with `git checkout HEAD~1 -- path/to/file` (rules.md 27-30). Known false alarm: VS Code showing "Cannot find module @/components/AppNav" is a stale editor TS cache and does NOT fail the Vercel build (context.md KNOWN ISSUES).

**B. Runtime crash (the true white screen).** Since Task 9 (`806996a`, Mar 18) a crash should render the global error boundary `src/app/error.tsx` ("Something went wrong...") and unknown URLs render `src/app/not-found.tsx` — a literal blank white page means the throw happened OUTSIDE the boundary (root layout, middleware) or predates hydration. Historical example of the runtime class: Phase 2 Task 1 passed a DB `bigint` where a component expected `string`; the build was green, the page crashed at runtime. Fix `97588a2` (cast `analysis.id` to `String`), lesson journaled in `0060288`. Check the Vercel function log for the page route's stack trace first — it names the throwing file.

Open, known, non-blocking: a soft React hydration mismatch (#418) on the analysis page after the May 1 Task 5 polish — the obvious cause (`toLocaleDateString`) was already fixed in `c5621bc`; the residual cause is undiagnosed (context.md KNOWN ISSUES). Do not burn time re-fixing the date formatting.

## 3. Paddle checkout failures (the Mar 24 400 saga)

History (context.md lines 59-64; commits Mar 24, 2026): checkout returned 400. Three code-side isolation attempts — remove email pre-fill (`d68bbd5`), remove customData (`1c92b1d`), minimal checkout with logging (`7b331d6`) — found nothing. Root cause: the **default payment link URL was never saved in Paddle Checkout Settings**. Fix was one dashboard field: set default payment link to `https://www.supportcoach.io/select-plan`. Debug logging was then deliberately stripped (`2d3a9a7`) because transcripts/PII must never be logged (rules.md 17).

Checklist, in order:
1. Paddle dashboard → Checkout Settings → default payment link saved and correct.
2. Paddle dashboard → products/prices exist (3 products x 2 prices) and price IDs match the code (next step).
3. Browser console on `/select-plan`: "Payment system is loading" alert = Paddle.js never initialized (check `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`, and that `https://cdn.paddle.com/paddle/v2/paddle.js` loaded in the network tab). `Paddle checkout error:` = `Paddle.Checkout.open()` threw.
4. Price-ID consistency. **There are THREE copies of the Paddle price IDs in code** (all verified 2026-07-17): `PADDLE_PRICE_MAP` (`app/src/lib/paddle.ts` line 7, webhook direction), `PLAN_PRICES` (`paddle.ts` line 49), and a **separate local `PLAN_PRICES` object inside `app/src/app/select-plan/page.tsx` (lines 15-49)** which is what checkout actually sends (`priceInfo.priceId`). rules.md rule 36 names only the two in paddle.ts — the select-plan copy is the easy one to miss. A price changed in Paddle but not in all three places = checkout sells the wrong/dead price.
5. Code landmine from the past-mistakes log: Paddle v2 `Paddle.Initialize()` does NOT accept an `environment` (lowercase) parameter — it was removed once already (rules.md PAST MISTAKES). Current init passes only `token` (select-plan page lines 157-159). Don't reintroduce it.

## 4. Webhook silent failure (www vs non-www 308)

History (Mar 25, 2026): checkout worked, cards were charged, but `organizations.plan` never updated and `subscriptions` stayed empty — with no error anywhere in this repo, because the requests never arrived. The webhook URL in Paddle was `https://supportcoach.io/...` (non-www); Vercel 308-redirects non-www to www at the DOMAIN level (verified: `app/next.config.ts` is empty — the redirect is not in code), and **Paddle does not follow redirects**. Fix: point the Paddle webhook at `https://www.supportcoach.io/api/paddle-webhook`. The `www` host is load-bearing; this rule is codified in context.md KEY DECISIONS.

Triage for "payment happened, database didn't change":
1. Paddle dashboard → webhook delivery log. `308` = the URL regressed to non-www. No deliveries at all = webhook not configured / wrong endpoint.
2. Vercel function log for `/api/paddle-webhook`. The route's status codes (verified in `app/src/app/api/paddle-webhook/route.ts`): missing `PADDLE_WEBHOOK_SECRET` → 500 (line 17); invalid signature → 401 (line 27); malformed payload → 400; everything after validation → 200 EVEN ON PROCESSING ERRORS (lines 58-64, deliberate — Paddle retry-storms on non-2xx; rules 32-33). So a 200 in Paddle's log does NOT prove the DB was written — read the log lines: `Paddle webhook: No organization_id in custom_data...` means the event was acknowledged and silently dropped (route lines 100-105). `custom_data.organization_id` is injected at checkout by select-plan (`page.tsx` lines 202-204); a checkout opened without it produces exactly this silent drop.
3. Supabase: `subscriptions` (upsert keyed on `paddle_subscription_id`) and the `organizations.plan` cache. `subscriptions` is the source of truth; `organizations.plan` is webhook-maintained convenience (rule 34).
4. Signature verification is HMAC-SHA256 over `ts:rawBody` from the `Paddle-Signature` header (`app/src/lib/paddle.ts` lines 68-103). A rotated webhook secret in Paddle without updating `PADDLE_WEBHOOK_SECRET` in Vercel = every delivery 401s.

Do not "fix" the 200-on-error behavior to return 5xx, and do not move signature verification later — both shapes are intentional (see coach-saas-change-control Section 5).

## 5. Analyses stuck / not appearing

The pipeline (all verified in code):
`/upload` page → `POST /api/create-analysis-job` (sha-256 `transcript_hash` dedupe; if every file is a dupe it returns `"All uploaded files were duplicates"`) → fire-and-forget `GET /api/process-jobs` auto-trigger (`upload/page.tsx` line 113) → worker claims the OLDEST pending/processing job (**one job per invocation**, `limit(1)` at route line 756), claims each item `pending → processing` conditionally, calls OpenAI (`gpt-5.4`), inserts into `chat_analyses`, marks item `completed`. Manual backup trigger: the "Process Now" button (`WorkerTriggerButton.tsx`, same GET).

Triage by Supabase row state (`analysis_jobs`, `analysis_job_items`):

| Row state | Meaning | Action |
|---|---|---|
| Job `pending`, items `pending` | Worker never ran (auto-trigger fetch failed — upload page will have shown "processing did not start automatically") | Re-trigger: click "Process Now", or `Invoke-WebRequest https://www.supportcoach.io/api/process-jobs -UseBasicParsing` (this RUNS the production worker — owner's call) |
| Several jobs `pending` | Worker does one job per GET | Trigger once per job |
| Item `failed` | Caught exception — `Item processing error:` in Vercel log (OpenAI error, empty transcript, missing org id) | Read the log; items with no `organization_id` or empty transcript fail by design (route lines 814-820) |
| Item `processing` forever, job possibly `completed` | **The stuck-claim trap** (5c below) | Owner resets the item (SQL below) |
| Analysis exists but invisible on dashboard | `excluded=true`? Every dashboard read filters excluded rows (rule 15) | Check the row's `excluded` flag before suspecting queries |

**5c. The stuck-claim trap (code-verified failure mode; no recorded production incident as of 2026-07-17 — labeled open, not history).** The worker claims an item by setting `status='processing'` (route lines 793-800). If the function then dies mid-item (crash, or Vercel function timeout — the route exports no `maxDuration`, so the platform default applies; exact limit depends on the Vercel plan, UNVERIFIED), the item is NEVER retried: the item query selects only `status='pending'` AND `analysis_id IS NULL` (lines 776-777), and the end-of-run completion check counts only `pending` items (lines 1459-1467), so the job can even be marked `completed` while an item is frozen. Recovery SQL — owner runs in Supabase SQL Editor:

```sql
-- Un-stick items abandoned mid-claim so the next worker run retries them
UPDATE analysis_job_items SET status = 'pending'
WHERE status = 'processing' AND analysis_id IS NULL;
```

Then re-trigger the worker.

**Worker vs re-analyze route.** The re-analyze route (`POST /api/reanalyze-analysis`, invoked by a `<form method="post">` on the analysis page, line 480) is authenticated (401 when logged out) and responds with REDIRECTS: success → `?reanalyzed=1`, failure → `?error=...` in the URL — so "the button did nothing" means read the query string, then the Vercel log. Both routes carry duplicate prompts: a prompt behaving differently on first analysis vs re-analyze means the two copies drifted — the exact incident behind fix `36f5b8b` (coaching context injected only on re-analyze until Mar 22). Prompt changes affect only NEW analyses; old rows keep old output until re-analyzed (context.md). Shipping a prompt fix = both files, per coach-saas-change-control Section 4c.

**Do not confuse the real worker with `/api/analyze`** — `app/src/app/api/analyze/route.ts` exists (dated Mar 7, pre-worker) but has no in-repo callers (verified by grep 2026-07-17; whether anything external still calls it is UNVERIFIED). Editing it will not change batch analysis behavior.

## 6. Garbled Unicode output (the Mar 18 Unicode war)

History: one day, 8+ commits. `59eff43` (bullet encoding) → `838f571` (render as markdown) → `823cbec` (remove substitution causing UTF-8 corruption) → `30615be` → `2566750` (sanitize bullets/dashes at render) → **full revert `1bdf54d`** ("restored dashboard to post-Task-3 clean state") → `8be2601` (replace all garbled chars in dashboard with plain ASCII) → arrow-character mop-ups (`e825354`, `fe0cb53`, `b47f87c`, `3895f83`, `2030015`, later `dc70208` on the extension page) → `fa88735` (prevent Unicode bullets in team-summary AI response). The losing strategy was layering render-time substitutions on top of each other; the winning strategy was fixing at the SOURCE: plain-ASCII hardcoded strings in the .tsx files, plus a prompt instruction.

Triage — first decide WHICH of two distinct problems you have:

1. **Static UI strings garbled** (arrows, bullets baked into .tsx). Find them:
```powershell
Get-ChildItem C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\src -Recurse -Include *.tsx,*.ts | Select-String -Pattern "[^\x00-\x7F]" | Select-Object Path, LineNumber -Unique
```
   Note: legitimate `•` bullets exist today in JSX (e.g. `analysis/[id]/page.tsx`, topics pages) and legacy prompts (`api/analyze/route.ts`) — garbling looks like `â€¢`/`Ã©` mojibake, not a clean bullet. Replace mojibake with plain ASCII; save the file as UTF-8.
2. **AI-generated text garbled** (team summary, manager report). The active defense is prompt-side: `app/src/app/api/team-summary/route.ts` line 42 — "Do not include bullet characters, em dashes, or any special Unicode symbols... Use only plain ASCII characters." Keep that line intact when editing the prompt.

**Verified doc-drift warning (2026-07-17):** context.md KNOWN ISSUES says "the API route strips them but the prompt also instructs plain ASCII" — no Unicode-stripping code exists in `team-summary/route.ts` today (`fa88735`'s entire diff is that one prompt line; the render-side sanitizer was reverted in `1bdf54d`). The prompt instruction is the ONLY active defense, and recurrence is an acknowledged open risk. If recurrence is confirmed, adding a strip at the API route is a reasonable CANDIDATE fix — take it through coach-saas-change-control; do not resurrect render-layer substitution (that is what corrupted UTF-8 last time, `823cbec`).

## 7. Supabase auth / session conflicts

**The one-browser-client law.** `app/src/lib/supabase.ts` is the SOLE `createBrowserClient` call in the repo (verified). Creating a second one anywhere throws the "Multiple GoTrueClient instances" console warning and causes session conflicts — the landing-page nav bug fixed across `5f13ff7`, `578d5ee`, `1bef1d9` ("use shared supabase client on landing page to prevent session conflict"), `5c35931`. If the warning appears, grep for the offender:

```powershell
Get-ChildItem C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "createBrowserClient|createClientComponentClient"
```

Correct client per context (all verified):
| Context | Use | File |
|---|---|---|
| Client components ("use client") | shared `supabase` export | `src/lib/supabase.ts` |
| Server components / Route Handlers needing the user session | `createSupabaseServer()` | `src/lib/supabaseServer.ts` |
| Service-role admin access (workers, webhook, middleware lock check) | `createClient(url, SUPABASE_SERVICE_ROLE_KEY)` | inline per route |

Past mistake on record (rules.md): `createServerComponentClient` from `@supabase/auth-helpers-nextjs` was used once — that package/API is not installed here. Use `createSupabaseServer`.

**Known cookie quirks (documented, not regressions):**
- `/api/subscription-status` returns 401 when fetched from client-side code (Route Handler cookie handling). Standing workaround = rule 35: client pages (TrialBanner, select-plan) read org/subscription via the browser client directly. Verified residue: `src/app/dashboard/billing/page.tsx` line 33 still fetches `/api/subscription-status` from the client — if the billing page shows wrong plan data, this is the first suspect (open item, no fix on record).
- Client-side `subscriptions` query can return 406 under RLS — known non-blocking (context.md KNOWN ISSUES).

## 8. Middleware locking users out (or failing to)

`app/middleware.ts` runs on `/dashboard`, `/upload`, `/jobs`, `/analysis` (plus `/select-plan`, `/onboarding`, `/api/*` in the matcher; only the four protected prefixes get the lock check). Recompute a lock decision by hand — the logic, verified line-by-line:

1. No authenticated user → pass through untouched (login handling elsewhere).
2. Path in skip list (`/select-plan`, `/onboarding`, `/api/paddle-webhook`, `/api/subscription-status`, `/login`, `/signup`, legal pages...) → pass.
3. Service-role client fetches the user's membership → no membership = redirect `/onboarding`.
4. Latest `subscriptions` row for the org (newest `created_at`): `active`/`trialing` → unlocked; `past_due` → LOCKED; `canceled`/`paused` → locked only after `cancel_at`/`current_period_end` passes; any other status → LOCKED. **A subscription row, when present, always wins over `organizations.plan`** (rule 34).
5. No subscription row → org trial fields: `plan='trial'` with past `trial_ends_at` → LOCKED; trial with NO end date → unlocked (legacy); any other plan with no subscription → LOCKED.
6. Locked → redirect `/select-plan`, except `/dashboard/billing` stays reachable (lines 142-147).
7. **Any thrown error → fail OPEN** (catch at lines 149-153: "allow access rather than locking out"). rules.md rule 37. This is an owner-level product decision — never "harden" it to fail closed.

Diagnostic corollaries:
- "User locked out but they paid" → read their `subscriptions` row: a stale `past_due`/`canceled` there overrides a paid-looking `organizations.plan`; that usually means the webhook stopped updating rows → go to Section 4.
- "Expired trial NOT locked out" → check `SUPABASE_SERVICE_ROLE_KEY` in Vercel first: if the admin client can't be created, every request throws into the fail-open catch and the lock is silently OFF globally. Also check `trial_ends_at` is non-null (null = legacy unlocked).
- Read-only SQL to see what the middleware sees (owner runs, or run against a test org):
```sql
SELECT plan, trial_ends_at FROM organizations WHERE id = '<org-id>';
SELECT status, current_period_end, cancel_at, trial_end, created_at
FROM subscriptions WHERE organization_id = '<org-id>'
ORDER BY created_at DESC LIMIT 1;
```
- Resetting the owner's TEST org after a cancelled subscription is a documented production mutation (exact UPDATE/DELETE in context.md KNOWN ISSUES, org `8e71dc46-e674-4131-8709-506223a35d7e`) — owner runs it.

## 9. Env / key misconfiguration

Canonical variable names (from `app/.env.local` — NAMES only, never read the values — and Vercel project settings, which the owner maintains). This table maps names to SYMPTOMS only; the full per-variable inventory (consumers, purpose, guards) lives in `coach-saas-config-and-flags` Section 1, and where-set/bootstrap mechanics in `coach-saas-build-env-run` Section 3:

| Variable | Misconfig symptom |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Nothing loads; auth dead everywhere |
| `SUPABASE_SERVICE_ROLE_KEY` | Workers/webhook 500; subscription lock silently OFF (fail-open, Section 8) |
| `OPENAI_API_KEEY` — no: `OPENAI_API_KEY` | Analyses fail, items go `failed`, summary/report errors (all 8 `gpt-5.4` call sites) |
| `PADDLE_WEBHOOK_SECRET` | Webhook 500 "Webhook not configured" (route line 17), or 401s if rotated in Paddle but not here |
| `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` | Checkout overlay never opens ("Payment system is loading") |
| `NEXT_PUBLIC_SITE_URL` | Team summary fails server-side; logout redirect wrong |
| `PADDLE_API_KEY`, `NEXT_PUBLIC_PADDLE_ENVIRONMENT` | None — zero code references (verified 2026-07-17); present in env but inert, changing them fixes nothing here; do not delete them unasked either |

Rules of engagement:
- List names without exposing values (safe, owner-approved pattern):
```powershell
Select-String -Path C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\.env.local -Pattern "^\s*([A-Z0-9_]+)\s*=" | ForEach-Object { $_.Matches[0].Groups[1].Value }
```
- `NEXT_PUBLIC_*` values are baked into the client bundle at BUILD time — changing one in Vercel does nothing until the next deploy. Server-only keys are read at runtime per invocation.
- Local dev uses `app/.env.local`; production values live in the Vercel dashboard (codex-orchestration.md, Production Deployment). They can drift — "works locally, fails in prod" on a key-shaped error means diff the NAME lists, not the values.
- Never log or expose `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET` (rule 19).

## 10. After diagnosis

A diagnosis is not a fix. Route the fix through coach-saas-change-control (savepoint commit, both-routes rule for prompts, docs-of-record update, owner-run SQL, no unasked push — push = production deploy). End every handoff with a numbered manual-test checklist for the owner; nothing user-visible ships without their browser verification.

## When NOT to use this skill

- Shipping any change, classifying blast radius, docs-of-record procedure → `coach-saas-change-control`.
- Full narrative depth on the settled incidents summarized here (Unicode war, Paddle sagas, GoTrueClient bug, scope violations) → `coach-saas-failure-archaeology`.
- System design, data flow, invariants before coding → `coach-saas-architecture-contract`.
- Dev setup, build/run mechanics, lockfile questions → `coach-saas-build-env-run`.
- Constant/flag values and tuning (planAccess windows, thresholds, price maps as config) → `coach-saas-config-and-flags`.
- Writing/executing verification checklists → `coach-saas-validation-and-qa`.
- Transcript parsing / coaching-prompt semantics (sender misattribution, abandoned-chat rules) → `transcript-analysis-domain-reference`.
- Plan-gating enforcement work → `coach-saas-plan-gating-campaign`; SEO/growth → `supportcoach-growth-frontier`.
- The Chrome extension product's runtime bugs (its marketing page at `/extension` is THIS repo, but its coaching behavior/backend is not) → sibling repo `support-coach-extension`, skill `coach-ext-debugging-playbook`.

## Provenance and maintenance

Authored 2026-07-17. Sources: `app/docs/rules.md`, `app/docs/context.md`, `app/docs/codex-orchestration.md`; direct reads of `app/middleware.ts`, `app/next.config.ts`, `app/src/lib/paddle.ts`, `app/src/lib/supabase.ts`, `app/src/lib/supabaseServer.ts`, `app/src/lib/currentOrganization.ts`, `app/src/app/api/paddle-webhook/route.ts`, `app/src/app/api/process-jobs/route.ts`, `app/src/app/api/reanalyze-analysis/route.ts`, `app/src/app/api/team-summary/route.ts`, `app/src/app/api/create-analysis-job/route.ts`, `app/src/app/api/manager-report/route.ts`, `app/src/app/select-plan/page.tsx`, `app/src/app/upload/page.tsx`, `app/src/components/WorkerTriggerButton.tsx`; `git log`/`git show --stat` (commits cited inline). Sibling exemplar spot-checked and consistent: `coach-saas-change-control`.

Volatile facts — re-verify before relying on them (all "as of 2026-07-17"):

| Fact | Re-verify with |
|---|---|
| HEAD `93de005`, 104 commits, branch `main` only | `git -C C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai log --oneline -3` |
| Worker claims 1 job per GET; items selected by `status='pending'` + `analysis_id IS NULL`; no `maxDuration` export | `Select-String -Path C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\src\app\api\process-jobs\route.ts -Pattern "limit\(1\)|maxDuration|eq\(.status., .pending.\)"` |
| Webhook status codes: 500 no-secret / 401 bad-sig / 400 bad-payload / 200 otherwise | `Select-String -Path C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\src\app\api\paddle-webhook\route.ts -Pattern "status: (401|400|500)|received"` |
| Middleware fail-open catch near lines 149-153 | `Select-String -Path C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\middleware.ts -Pattern "allow access"` |
| select-plan has its own local `PLAN_PRICES` (3rd price-ID copy) | `Select-String -Path "C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\src\app\select-plan\page.tsx" -Pattern "PLAN_PRICES|priceId"` |
| No Unicode-strip code in team-summary route (prompt-only defense) | `Select-String -Path C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\src\app\api\team-summary\route.ts -Pattern "replace|ASCII"` |
| `src/lib/supabase.ts` is the sole `createBrowserClient` call | `Get-ChildItem C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\src -Recurse -Include *.ts,*.tsx \| Select-String -Pattern "createBrowserClient"` |
| `gpt-5.4` at 8 call sites; `PADDLE_API_KEY` / `NEXT_PUBLIC_PADDLE_ENVIRONMENT` unreferenced in src | `Get-ChildItem C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\src -Recurse -Include *.ts,*.tsx \| Select-String -Pattern "gpt-5.4|PADDLE_API_KEY|PADDLE_ENVIRONMENT"` |
| billing page still client-fetches `/api/subscription-status` (open quirk) | `Select-String -Path C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\src\app\dashboard\billing\page.tsx -Pattern "subscription-status"` |
| Hydration #418 on analysis page still open; Unicode recurrence still a listed risk | `Select-String -Path C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\docs\context.md -Pattern "418|Unicode"` |
| Paddle dashboard state (payment link, webhook URL, 3x2 prices) — invisible to git | Owner checks the Paddle dashboard; last verified in docs on 2026-03-25 (context.md) |
