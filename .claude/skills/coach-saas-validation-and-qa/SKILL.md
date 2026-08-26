---
name: coach-saas-validation-and-qa
description: Load this skill whenever you need to VERIFY anything in the supportcoach-ai repo (SupportCoach AI Manager Dashboard) — before claiming a change works, when writing the manual "Test:" checklist for a handoff, when running lint/build as gates, when smoke-checking the dev server, when checking database state in Supabase after a change, or when asked to verify webhook/billing (Paddle) behavior safely. This repo has NO test suite, NO CI, NO staging, and local dev points at the LIVE production Supabase — so "testing" here means: lint+build as the only mechanical gates, a disciplined manual Test checklist executed by the owner, and read-only SQL the owner runs in the Supabase SQL Editor against the hard-coded test org. Also defines exactly what the word "verified" may mean in a handoff, and the (candidate, not yet existing) path to real automated tests. For classifying and landing the change itself use coach-saas-change-control; for diagnosing a live failure use coach-saas-debugging-playbook; for dev-environment setup and env vars use coach-saas-build-env-run; for past incident narratives use coach-saas-failure-archaeology; for architecture invariants use coach-saas-architecture-contract.
---

# Validation and QA for supportcoach-ai

Everything below verified directly against the repo on 2026-07-17 (HEAD `93de005`, 104 commits, branch `main` only; `npm run lint` and `npm run build` actually executed that day — results quoted where cited). Owner: Johny Patrick, solo dev, no reviewers. Production live at https://www.supportcoach.io. Repo root has only `README.md` + `app/`; everything lives under `app/`.

## 0. The one-sentence model

There is no test suite, no CI, no staging, and no separate dev database: **evidence here is (1) `next build` passing, (2) a numbered manual "Test:" checklist the owner executes in a real browser, and (3) rows the owner inspects in the Supabase SQL Editor — anything you did not actually observe is a claim, not a verification.**

## 1. What exists and what does not (verified 2026-07-17)

| Claimed capability | Reality | Evidence |
|---|---|---|
| Automated tests | NONE. Zero test/spec files under `app/src`; no test script in `app/package.json` (scripts = `dev`/`build`/`start`/`lint`) | file search + `package.json` |
| Test framework installed | NONE. `@playwright/test` appears only as a transitive entry inside the lockfiles (pulled in via pdfjs-dist tooling) — it is NOT a devDependency and is not runnable | `package.json`, lockfile grep |
| CI | NONE. No `.github/`, no `vercel.json`, no pipeline of any kind | dir listing |
| Staging | NONE. One branch (`main`), Vercel auto-deploys it to production | context.md; `coach-saas-change-control` §4a |
| Separate dev/test database | NONE. One Supabase project shared by production, local dev, AND the sibling extension product (context.md line 297). `next build`/`next dev` load `app/.env.local`, which holds LIVE keys — never read its values, variable names only | build output line "Environments: .env.local" (observed 2026-07-17) |
| Paddle sandbox | NOT WIRED. `NEXT_PUBLIC_PADDLE_ENVIRONMENT` exists as a variable NAME in `.env.local` but is referenced NOWHERE in `app/src` (grep 2026-07-17). `Paddle.Initialize({ token })` in `select-plan/page.tsx:157` and `dashboard/billing/page.tsx:52` passes token only — all Paddle traffic is live | grep + both files; rules.md PAST MISTAKES ("environment" param removed) |

Consequence: **your local dev server is a live-production console with hot reload.** Section 4 tells you what is safe to do in it.

## 2. Mechanical gate #1: `npm run build` (the real gate)

Run from `app/` (Windows PowerShell 5.1 — never chain with `&&`, it is a parser error):

```powershell
Set-Location C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app
npm run build
```

Verified behavior (executed 2026-07-17, exit 0): Next.js 16.1.6 (Turbopack), compiles in ~12s, then **"Running TypeScript"** — the TypeScript check IS part of the build and fails it on type errors. 45 routes generated. Total wall time well under 2 minutes.

Facts that matter:

- **`next build` does NOT run ESLint.** Proven empirically 2026-07-17: the build exited 0 on the same tree where `npm run lint` exited 1. So lint errors never block a Vercel deploy — type errors do.
- **Only one build at a time.** A second concurrent `next build` fails with "Unable to acquire lock at ...\app\.next\lock" (observed 2026-07-17). If you hit this, another build is running — wait; do not delete the lock while a build is live.
- The build loads `.env.local`. Missing env vars can surface here, not at edit time.
- If your change breaks the build: **STOP. No cascading fixes.** Report file/error/previous state; recovery is `git checkout HEAD~1 -- path/to/file` (rules.md rules 27-30).

## 3. Mechanical gate #2: `npm run lint` (noisy — scope it)

`app/package.json` lint script is bare `eslint` (ESLint 9, flat config `app/eslint.config.mjs`, which un-ignores everything except `.next/`, `out/`, `build/`, `next-env.d.ts`). Verified 2026-07-17: **`npm run lint` currently exits 1 on an untouched tree**, entirely from pre-existing noise:

- `app/backup/3-10-2026/...` — an UNTRACKED local snapshot directory (not in git; confirmed via `git ls-files`). It gets linted anyway. Lint results therefore differ between machines.
- `app/public/pdf.worker.mjs` — vendored pdf.js worker (git-tracked), hundreds of warnings + "Definition for rule 'es/...' not found" errors.
- `app/middleware.ts:6` — one pre-existing `prefer-const` error.

Do NOT "fix" any of that unasked (scope lock; see `coach-saas-change-control`). The usable gate is scoping lint to the files you touched:

```powershell
Set-Location C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app
npx eslint src/app/dashboard/page.tsx src/components/CopyButton.tsx
```

Pass criterion: zero NEW errors in files you edited. A global exit-0 is not achievable today (2026-07-17) and is not the bar.

## 4. Dev-server smoke check (safe subset only)

```powershell
Set-Location C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app
npm run dev
```

Then open http://localhost:3000 (default port; no `-p` override in scripts). `/dashboard`, `/upload`, `/jobs`, `/analysis` require login AND an unexpired trial/subscription — middleware redirects locked orgs to `/select-plan` (`app/middleware.ts:61-147`; it fails OPEN on errors by design, line 149-153 — never "fix" that). Login credentials are the owner's; ask, don't guess.

**Safe (read-only) smoke actions** — this is the minimum before any handoff of a page-touching change:

1. Load `/` (landing), `/dashboard`, and every page your change touched.
2. Watch the `npm run dev` terminal AND the browser console for NEW errors — white screen, unhandled exception, failed fetch.
3. Navigate into one analysis detail page and one topic drill-down if your change is anywhere near them.

**Known benign console noise — do not chase, do not claim as your regression** (all logged in `app/docs/context.md` KNOWN ISSUES, lines 251-257):

| Noise | Status |
|---|---|
| React hydration error #418 on the analysis page (soft mismatch, auto-recovered) | Known since 2026-05-01, cause undiagnosed, non-blocking |
| Supabase RLS 406 on client-side `subscriptions` query | Known, non-blocking |
| `subscription-status` 401 from client-side fetch | Known; workaround is the browser client (rules.md rule 35) |
| VS Code phantom "Cannot find module @/components/AppNav" | Stale editor cache; does not affect the build |

**UNSAFE in local dev — production mutations. Never do these unasked** (owner standing rule):

- Uploading a transcript ("Upload and Analyze") — writes real rows to the live DB and, via auto-trigger, calls OpenAI with real money.
- Clicking "Process Now" or requesting `/api/process-jobs` — that route is an **unauthenticated GET** (`process-jobs/route.ts:749`, service-role client, no auth check) that claims and processes pending jobs for ANY org.
- Toggling exclude / coaching-delivered / follow-through overrides on real customer rows.
- Submitting the `/extension` waitlist form (writes `extension_waitlist`).
- Opening a Paddle checkout past the overlay.

Data-mutating verification belongs in the owner's Test checklist (Section 6), executed by the owner against the test org (Section 5).

## 5. The test-org convention

There is exactly one sanctioned place for write-testing: the owner's testing organization, hard-coded in the docs of record:

- **Test org id: `8e71dc46-e674-4131-8709-506223a35d7e`** (context.md line 259; also codex-orchestration.md line 442).
- Documented reset after a billing test (context.md line 259 — OWNER runs it, in the Supabase SQL Editor, never you unasked):
  ```sql
  UPDATE organizations SET plan='trial', trial_ends_at=now()+interval '14 days' WHERE id='8e71dc46-e674-4131-8709-506223a35d7e';
  DELETE FROM subscriptions WHERE organization_id='8e71dc46-e674-4131-8709-506223a35d7e';
  ```
- Precedent for owner-run live SQL on this org: the Bangkok trial extension (codex-orchestration.md line 442).

It lives in the production database — the isolation is by org id (every query filters `organization_id`, rules.md rule 14), not by environment. So test-org writes are still production writes: cheap to reset, but owner-initiated only.

## 6. The manual "Test:" checklist — the repo's test suite

Every task in `app/docs/codex-orchestration.md` carries a numbered **Test:** block. This is the house testing discipline; your handoff MUST end with one (mandated by master prompt Section 1i step 4 and 1e: "provide a simple manual test the user can run").

Anatomy of a good one — each trait quoted from a real shipped checklist:

| Trait | Real example (source) |
|---|---|
| Numbered, imperative, copy-pasteable by a non-expert | Phase 2 Task 1 Test, codex-orchestration.md lines 548-553 |
| Names the exact page/action: "Open an analysis page. Click Copy Message." | line 550 |
| Names the exact DB evidence: "Check the `chat_analyses` row in Supabase — `coaching_delivered` should be true, `coaching_delivered_at` should have a timestamp." | line 551 |
| Includes a regression assertion on what must NOT change: "Check that `copy_coaching_message` is still generated identically to before." | Phase 2 Task 2 Test, line 607 |
| Includes negative/edge cases: "Verify nothing breaks if the user is logged out."; "Test on an abandoned chat — `coaching_points` should be `[]`." | lines 553, 609 |
| Covers BOTH analysis routes when a prompt changed: "Re-analyze a chat using the per-chat re-analyze button. Verify it also populates `coaching_points`." | line 608 |
| Behavioral end-to-end for features: "Exclude a chat → verify it disappears from dashboard stats, topics, and export. Still visible on analysis detail page." | Task 5 Test, line 233 |

Writing rules distilled: 3-10 steps; every step has an observable expected result; at least one step checks a Supabase row when the change writes data; at least one step asserts an existing behavior is unchanged; note explicitly when a prompt change "only affects new analyses going forward — existing analyses keep old coaching messages until re-analyzed" (context.md line 100).

## 7. Verifying DB state in Supabase after a change

An AI session has NO database access here: no Supabase CLI, no psql, no MCP connector in this repo, and reading connection values from `app/.env.local` is forbidden. DB verification is therefore **read-only SELECT blocks you hand the owner to paste into the Supabase SQL Editor** (same delivery channel as migrations — see `coach-saas-change-control` §4b). Scope them to the test org. Verified-correct column names (from the Phase 2 Task 1 SQL recorded in context.md lines 191-219 and the webhook code):

```sql
-- Latest analyses for the test org (after an upload/re-analyze test)
SELECT id, agent_name, created_at, excluded, coaching_delivered, coaching_delivered_at, coaching_points
FROM chat_analyses
WHERE organization_id = '8e71dc46-e674-4131-8709-506223a35d7e'
ORDER BY created_at DESC LIMIT 10;

-- Billing state pair: cache vs source of truth (must agree; rules.md rule 34)
SELECT plan, trial_ends_at FROM organizations WHERE id = '8e71dc46-e674-4131-8709-506223a35d7e';
SELECT status, plan, billing_interval, seats, paddle_subscription_id, current_period_end, cancel_at, updated_at
FROM subscriptions WHERE organization_id = '8e71dc46-e674-4131-8709-506223a35d7e'
ORDER BY created_at DESC;

-- Follow-through rows written by a Task-5-style analysis
SELECT source_analysis_id, source_coaching_point_id, detected_in_analysis_id, status, manager_override, created_at
FROM coaching_followthrough
WHERE organization_id = '8e71dc46-e674-4131-8709-506223a35d7e'
ORDER BY created_at DESC LIMIT 10;
```

Traps:

- **The schema is NOT in git** — docs are the only schema record, and they can drift from reality. Documented proof: commit `97588a2` "Phase 2 Task 1 fix: cast analysis.id to String when passing to CopyButton (bigint runtime, string expected)" — the runtime type surprised the code. When a type matters, have the owner confirm it in Supabase (Table Editor → column type), don't trust the doc's SQL block.
- `chat_analyses` reads in app code filter excluded rows two ways — `.eq("excluded", false)` AND `.neq("excluded", true)` (e.g. `app/src/app/api/export/route.ts:46`). Your verification SQL above deliberately does NOT filter, so you can see excluded rows too.
- Never put customer names/emails/transcript text in your handoff when quoting query results (rules.md rule 17).

## 8. Verifying webhook / billing flows without touching production

There is no safe self-serve path to exercise Paddle end-to-end. Constraints, all verified:

1. **No sandbox** (Section 1). The configured webhook endpoint is production: `https://www.supportcoach.io/api/paddle-webhook` — www is load-bearing (non-www 308-redirects and Paddle does not follow; context.md lines 62-63).
2. **You cannot forge a test event.** The handler verifies an HMAC-SHA256 signature over `ts:rawBody` before anything else (`app/src/lib/paddle.ts:68-103`; route returns 401 on bad signature, `paddle-webhook/route.ts:27-33`). Faking it requires `PADDLE_WEBHOOK_SECRET`'s value — which you must never read. Do not POST junk at the production endpoint "to see the 401".
3. **Behavior partly lives in the Paddle dashboard** (checkout default payment link, webhook URL, 3 products x 2 prices) — invisible to git. See `coach-saas-change-control` §4d and `coach-saas-failure-archaeology` for the two incidents.

So the verification ladder, weakest to strongest:

| Level | Who | How |
|---|---|---|
| Code-path verification | You | Read and trace `paddle.ts` + `paddle-webhook/route.ts`; confirm price-id maps (`PADDLE_PRICE_MAP` line 7 / `PLAN_PRICES` line 49 — a price change must update BOTH); `npm run build` passes |
| DB-state verification | Owner (you write the SQL) | Section 7 billing pair — `organizations.plan` must match latest `subscriptions` row |
| Delivery verification | Owner | Paddle dashboard → webhook delivery log (2xx responses), Checkout Settings still has the default payment link |
| End-to-end | Owner ONLY | The documented pattern: real checkout on the test org with the owner's card, confirm webhook → `subscriptions` row → `organizations.plan`, then cancel before the charge date and reset via Section 5 SQL. This is exactly how billing was verified on 2026-03-25 (codex-orchestration.md line 400: "Test subscription cancelled before April 8th charge date") |

Never invent a lighter-weight path (ngrok tunnels, replayed payloads, secret extraction). If end-to-end proof is required and the owner hasn't offered to run it, say so in the handoff and mark the flow UNVERIFIED.

## 9. What "verified" may and may not mean in a handoff

The docs of record reserve "verified" for owner-confirmed runs with named evidence: "verified end-to-end with Subaiqua chat 292" (context.md line 109), "verified end-to-end on Subaiqua chat 288" (line 113), "Paddle billing fully verified end-to-end (March 25, 2026)". Match that standard.

| You MAY write | Only if |
|---|---|
| "Build passes" | You ran `npm run build` from `app/` and saw exit 0 |
| "Lint clean on touched files" | You ran scoped `npx eslint <files>` (Section 3) |
| "Pages render, no new console errors" | You did the Section 4 safe smoke on those pages |
| "Code path traced" | You read every file involved end-to-end |
| "Verified" / "tested" / "working" | The behavior was actually exercised (by you within Section 4's safe subset, or by the owner) AND you can name the evidence — the chat id, the row, the observed output |

Never write: "should work", "this fixes it" (untested), "verified" for anything involving DB writes, OpenAI calls, webhooks, or checkout that nobody exercised. The honest formula for those: "Build + lint pass and the code path is traced; runtime behavior UNVERIFIED — Test checklist below." Prompt/schema changes additionally require the note that both routes were updated (`process-jobs` AND `reanalyze-analysis`) and that only NEW analyses are affected.

Commit messages follow the same discipline — even a production debugging experiment was labeled honestly as one: `1c92b1d` "Test: remove customData from Paddle checkout to isolate 400 error".

## 10. Adding real tests someday — CANDIDATE, nothing exists today

Everything in this section is unbuilt and NOT owner-approved as of 2026-07-17. Scope is locked (rules.md SCOPE; codex-orchestration.md: "New tasks must be added to this file before any code is written") — so this is a proposal to raise with the owner, never something to start unasked.

Cheapest first targets — pure functions with zero I/O, already isolated in `app/src/lib`:

| Function | Location | What a test would pin down |
|---|---|---|
| `verifyPaddleWebhook` | `paddle.ts:68` | signature parse, HMAC match, malformed-header rejection |
| `getPlanFromPriceId` | `paddle.ts:109` | all 6 price ids + unknown id → null |
| `getFollowthroughWindowDays` | `planAccess.ts:243` | plan → 30/90/365 mapping incl. trial/null |
| `getOrgAccess` / `isUpgrade` | `planAccess.ts:34` / `:229` | tier gating truth table |
| `buildFollowthroughPromptSection` | `coachingFollowthroughFetch.ts:91` | prompt text stability |

Known obstacles to record in any proposal:

- **Framework choice + install is a dependency change** in a repo with BOTH `package-lock.json` and `pnpm-lock.yaml` present and the canonical package manager UNVERIFIED — resolve that with the owner first (see `coach-saas-change-control` §3).
- The most bug-prone logic (transcript parsing, `buildStructuredTranscript`, `clampScore`, `normalizeRisk`) is **module-private inside the two route files** and duplicated across them (`process-jobs/route.ts:687`, `reanalyze-analysis/route.ts:414`) — testing it means exporting or extracting, i.e. a refactor of "FILES THAT MUST NOT BREAK", which needs explicit owner approval.
- Parser regression fixtures need transcripts, and real transcripts contain PII (rules.md rule 17) — fixtures must be synthetic or sanitized.
- rules.md's PAST MISTAKES already mandates the manual version: "always test parser changes against real transcript data." A fixture suite would mechanize an existing standing order, which is the strongest argument to offer the owner.

CI (running build + scoped lint on push) is a further candidate, but remember push-to-main IS the production deploy — a failing gate after push is too late. Any CI proposal must confront that ordering.

## When NOT to use this skill

- Classifying a change's blast radius, savepoints, docs-of-record updates, landing the change → `coach-saas-change-control` (nothing here routes around it).
- A live failure is happening right now → `coach-saas-debugging-playbook`; settled past investigations → `coach-saas-failure-archaeology`.
- Setting up node/env/dev-server from scratch, env var inventory → `coach-saas-build-env-run`.
- What a flag/threshold/constant means or should be → `coach-saas-config-and-flags`.
- System design and invariants → `coach-saas-architecture-contract`; prompt/transcript semantics → `transcript-analysis-domain-reference`.
- Plan-gating build work → `coach-saas-plan-gating-campaign`; growth/SEO → `supportcoach-growth-frontier`.
- Anything in the sibling extension repo (`C:\Users\CHIST\Desktop\GitRepo\support-coach-extension`) → its `coach-ext-validation-and-qa` / `coach-ext-change-control`.

## Provenance and maintenance

Authored 2026-07-17. Sources: `app/docs/rules.md`, `app/docs/context.md`, `app/docs/codex-orchestration.md`, `app/docs/supportcoach-ai-context.md` (Sections 1e, 1i), `app/package.json`, `app/eslint.config.mjs`, `app/middleware.ts`, `app/src/lib/paddle.ts`, `app/src/lib/planAccess.ts`, `app/src/lib/coachingFollowthrough*.ts`, `app/src/app/api/paddle-webhook/route.ts`, `app/src/app/api/process-jobs/route.ts`, `app/src/app/select-plan/page.tsx`, git log (commits cited: `97588a2`, `1c92b1d`, `93de005`), and live runs of `npm run lint` (exit 1) and `npm run build` (exit 0) on 2026-07-17. A few known issues never reached development and have no written history — where this file says UNVERIFIED or open, that is deliberate; do not invent history.

Volatile facts — re-verify before relying on them:

| Fact (as of 2026-07-17) | Re-verify with |
|---|---|
| `npm run build` passes; TypeScript runs in build; ESLint does not | `Set-Location C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app` then `npm run build` |
| `npm run lint` exits 1 from pre-existing noise (backup/, pdf.worker.mjs, middleware.ts:6) | `Set-Location C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app` then `npm run lint` |
| `app/backup/` is untracked; `public/pdf.worker.mjs` is tracked | `git -C C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai ls-files app/backup app/public` |
| Test org id `8e71dc46-e674-4131-8709-506223a35d7e` still the convention, reset SQL unchanged | `Select-String -Path C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\docs\context.md -Pattern "8e71dc46"` |
| `NEXT_PUBLIC_PADDLE_ENVIRONMENT` still unused in code (no sandbox wired) | `Get-ChildItem C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\src -Recurse -Include *.ts,*.tsx ^| Select-String -Pattern "PADDLE_ENVIRONMENT"` |
| `/api/process-jobs` still an unauthenticated GET | `Select-String -Path C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\src\app\api\process-jobs\route.ts -Pattern "export async function"` |
| Still zero test files / no test script / both lockfiles present | `Get-Content C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\package.json`; `Get-ChildItem C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app -Filter *lock*` |
| Known-benign console noise list (hydration #418, 406, 401) still current | `Select-String -Path C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\docs\context.md -Pattern "hydration|406|401"` |
| "Test:" checklist line numbers cited (233, 548, 604) still accurate | `Select-String -Path C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\docs\codex-orchestration.md -Pattern "\*\*Test:\*\*"` |
