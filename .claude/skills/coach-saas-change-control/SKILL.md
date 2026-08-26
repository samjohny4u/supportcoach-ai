---
name: coach-saas-change-control
description: Load this skill BEFORE making any change in the supportcoach-ai repo (SupportCoach AI Manager Dashboard) — code edits, prompt edits, SQL, doc updates, commits, or pushes. It defines how changes are classified by blast radius (push to main = instant production deploy on Vercel, no staging; SQL runs manually in Supabase and schema is NOT in git; worker prompt changes must hit BOTH analysis routes; Paddle behavior partly lives in the Paddle dashboard, not code), the docs-of-record system (app/docs/rules.md numbered standing orders, context.md living state, codex-orchestration.md task protocol), the pre-task savepoint commit convention, the non-negotiable rules with the historical incident behind each, and the exact steps to land a change. Also load it when unsure whether an action touches production, or which repo (this one vs support-coach-extension) owns a file. For diagnosing a live failure use coach-saas-debugging-playbook; for build/run mechanics use coach-saas-build-env-run; for past incident narratives use coach-saas-failure-archaeology; for architecture invariants use coach-saas-architecture-contract; for test/verification detail use coach-saas-validation-and-qa.
---

# Change control for supportcoach-ai

Everything below verified directly against the repo on 2026-07-16/17. Repo root contains only `README.md` + `app/`; ALL app code, docs, and config live under `app/`. Single branch `main`, 104 commits as of 2026-07-17 (HEAD `93de005`, 2026-07-03). Owner: Johny Patrick, solo, no other reviewers.

## 0. The one-sentence model

There is no CI, no test suite, no staging environment, and no second reviewer: change control here IS the docs-of-record + savepoint commits + manual "Test:" checklists + the owner's own browser verification — so follow them exactly.

## 1. Docs of record (read BEFORE any code execution)

Session start = read these, in this order. This is mandated by `app/docs/rules.md` line 2 ("Read this file FIRST before any code execution") and `app/docs/codex-orchestration.md` lines 5-9.

| Order | File (repo-relative) | Role |
|---|---|---|
| 1 | `app/docs/rules.md` | Standing orders — 37 numbered mandatory rules + "PAST MISTAKES TO AVOID" |
| 2 | `app/docs/context.md` | Living state: completed tasks, CURRENT TASK, KNOWN ISSUES / BLOCKERS, KEY DECISIONS, "FILES THAT MUST NOT BREAK", ISOLATED FILES |
| 3 | `app/docs/codex-orchestration.md` | Task protocol: per-task Read/Edit/Test/Commit blocks, version-control rules, VERIFIED STATUS of DB + features |
| 4 | `app/docs/supportcoach-ai-context.md` | Master prompt / full architecture (read relevant sections as needed; Section 10k = Phase 2 design) |

Notes:
- Docs refer to `RULES.md`/`CONTEXT.md`; actual filenames on disk are lowercase `rules.md`/`context.md` (Windows is case-insensitive — same files).
- **Doc updates are PART of a change, not optional.** codex-orchestration.md line 27: "After pushing, update the task status in this file AND in `docs/CONTEXT.md`." Every completed task in git history has a matching docs-sync commit (e.g. `a6dd642`, `d260d32`, `73607b4`). A change whose docs are not updated is an unfinished change.
- Scope is closed: rules.md SCOPE section — "Do not build anything outside these documents" (orchestration prompt defines tasks, master prompt defines architecture). Past mistake on record: ChatGPT built `/api/manager-insights` outside approved scope; it was removed (commit `5c43c72`).

### Load-bearing numbered rules (distilled from rules.md, all verified 2026-07-16)

| # | Rule (condensed) |
|---|---|
| 1 | Read the full file before editing it. Never assume contents. |
| 2-4 | Only the changes the current task needs; no refactors, no redesigns, no feature suggestions. |
| 5 | Do not invent files, helpers, schema fields, or routes that don't exist. |
| 7 | Before a task touching >1 file: `git add -A` then `git commit -m "Pre-task savepoint: Task N"`. |
| 8-10 | Commit after each task (`"Task N: description"`); if >3 files, commit after EACH file; push after every completed task. |
| 11-13 | SQL: `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS`, never drop columns or tables. |
| 14 | Every query filters by `organization_id` — no exceptions. |
| 15 | Every `chat_analyses` query includes `.eq('excluded', false)` unless managing exclusions. |
| 16 | Do not assume RLS is active — always filter at application level too. |
| 17 | NEVER log customer emails, payment info, passwords, API keys, or PII. |
| 19 | Never expose `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET` client-side. |
| 27-30 | If a change breaks the build: STOP, no cascading fixes, report file/error/previous state; revert with `git checkout HEAD~1 -- path/to/file`. |
| 32 | Paddle webhook must always return 200 to acknowledge receipt — Paddle retries on non-2xx. |
| 33 | Paddle webhook signature verified before processing any event. |
| 34 | `subscriptions` table = billing source of truth; `organizations.plan` = convenience cache updated by webhook. |
| 35 | Client pages (select-plan, TrialBanner) read org/subscription via the Supabase BROWSER client, not `/api/subscription-status`. |
| 36 | Price changes must update BOTH `PADDLE_PRICE_MAP` and `PLAN_PRICES` in `app/src/lib/paddle.ts`. |
| 37 | Middleware subscription lock must FAIL OPEN on errors — never lock paying customers out on a DB glitch. |

Context-window rule (rules.md lines 85-90): if a session exceeds ~50 messages or context degrades — stop, commit, update task status in codex-orchestration.md, and recommend a fresh thread.

## 2. Savepoint convention

rules.md rule 7 (mirrored in codex-orchestration.md line 24): before starting any task that modifies more than 1 file, commit a savepoint. The doc writes it as `git add -A && git commit -m "Pre-task savepoint: Task N"`; in Windows PowerShell 5.1 `&&` is a parser error, so run:

```powershell
git -C C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai add -A
git -C C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai commit -m "Pre-task savepoint: Task N"
```

Verified example commits: `9a14567` (Task 4), `b709f1b` (Phase 2 Task 2), `d718a1d` (Phase 2 Task 3), `b7edbea` (Phase 2 Task 5). The savepoint is the rollback anchor — the repo's recovery story is `git checkout HEAD~1 -- path/to/file` (rule 30) and, historically, full reverts to a savepoint state (commit `1bdf54d` "Revert encoding fix attempts - restored dashboard to post-Task-3 clean state").

Committing the savepoint is safe local git; PUSHING is a deploy (Section 4a). Per owner standing rules, do not push unless the owner has asked for the change to land.

## 3. Gates (there are no automated ones)

Verified: `app/package.json` scripts are only `dev`/`build`/`start`/`lint`. No test script, zero test files, no `.github/`, no `vercel.json`, no Dockerfile. The gates are:

1. `next build` succeeding — locally and again on Vercel at deploy time. Run from `app/`: `npm run build`.
2. `npm run lint` (eslint 9, `eslint-config-next`).
3. The numbered manual **"Test:"** checklist attached to each task in `app/docs/codex-orchestration.md` (e.g. Phase 2 Task 1, lines 548-553: run SQL, click Copy, verify `chat_analyses` row in Supabase, verify copy UI, verify logged-out behavior).
4. The owner's own browser verification against the live/dev app. Nothing user-visible ships without it.

Recommended practice (added 2026-07-16, not owner-mandated): before handing a change back, run this minimal smoke check from `app/`:

```powershell
npm run lint
npm run build
```

then start `npm run dev` and load the pages your change touches (at minimum `/dashboard` and any edited page) checking for white screens and console errors. This costs minutes and substitutes for the CI that does not exist.

Note the trap: BOTH `package-lock.json` and `pnpm-lock.yaml` exist in `app/`. Canonical package manager is UNCERTAIN (unverified as of 2026-07-16) — do not "clean up" either lockfile unasked.

## 4. Blast-radius classes

Classify every change before touching anything:

### 4a. Git push to main = INSTANT production deploy
Vercel auto-deploys on push to `main` (context.md: "committed and pushed, auto-deploys via Vercel"; production is live at https://www.supportcoach.io). There is one branch and no staging environment. Therefore: local commits are cheap and encouraged (savepoints, per-file commits); `git push origin main` is a production deploy and happens only when the owner wants the change live. The docs' rule 10 ("push after every completed task") describes the owner-driven flow — an AI session does not push unasked (owner standing rule, Section 6).

### 4b. SQL / schema changes — manual, and NOT in git
- The database schema is NOT tracked in git. There are no migration files. Every schema change is delivered as a labeled SQL block the owner runs manually in the Supabase SQL Editor (`app/docs/supportcoach-ai-context.md` Section 1i: "List SQL migrations (if any) — labeled as separate blocks the user runs in the Supabase SQL Editor"; per-task pattern in codex-orchestration.md, e.g. line 484 "SQL migration to run in Supabase SQL Editor"). NOTE: the discovery-era claim that this is "rules.md #12" is wrong — rules 11-13 are the DDL-safety rules (IF NOT EXISTS, never drop); the SQL-Editor delivery rule lives in the master prompt and per-task blocks.
- Because schema is not in git, **the docs are the only schema record**: every applied migration must be pasted into context.md / codex-orchestration.md (the Phase 2 Task 1 SQL appears verbatim in both, marked "already run manually in Supabase"). A schema change not recorded in docs is lost knowledge.
- SQL safety rules 11-13 always apply: `IF NOT EXISTS` everywhere, never drop.
- Live-data SQL (e.g. the test-org reset UPDATE/DELETE in context.md line 259, hard-coded org `8e71dc46-e674-4131-8709-506223a35d7e`) is a production mutation — owner runs it, or explicitly instructs.

### 4c. Worker prompt changes — apply to BOTH analysis routes
`app/src/app/api/process-jobs/route.ts` (batch worker) and `app/src/app/api/reanalyze-analysis/route.ts` (per-chat re-analyze) carry duplicate copies of the same system prompt and JSON schema. Any prompt/schema change affects ALL future analyses and MUST be applied to both files.
- Incident: coaching-context injection was added but only worked on re-analyze; first-pass analyses silently missed it until fix `36f5b8b` "Inject company coaching context into worker on first analysis" (context.md: "was only working on re-analyze").
- The April 27 prompt overhaul was deliberately applied to both in one commit (`2fa4997` "...applied to process-jobs and reanalyze routes"); codex-orchestration.md Phase 2 Task 2 codifies it: "Both routes have the same OpenAI system prompt and JSON schema — apply the same change to both."
- Prompt changes only affect NEW analyses; existing rows keep old output until re-analyzed (context.md line 100). Say so in your handoff.
- Model id `"gpt-5.4"` is hard-coded at 8 call sites across `app/src` (verified) — a model change is a multi-file change, savepoint first.

### 4d. Paddle / billing — behavior partly lives in the Paddle dashboard, not code
Two production sagas were dashboard-config, not code (both documented in context.md lines 59-64):
1. Checkout 400 (Mar 24): root cause = default payment link URL not saved in Paddle Checkout Settings. Code-side isolation commits `d68bbd5`, `1c92b1d`, `7b331d6`, cleanup `2d3a9a7` found nothing wrong in code.
2. Webhook silent failure (Mar 25): webhook URL was non-www `https://supportcoach.io`, which 308-redirects to www; Paddle does not follow redirects. Fix: point webhook at `https://www.supportcoach.io/api/paddle-webhook`. The www host is load-bearing.

So: when billing misbehaves, check Paddle dashboard state (payment link, webhook URL, products/prices — 3 products x 2 prices each) BEFORE changing code, and record any dashboard change in context.md because it is invisible to git.

### 4e. Isolated files — do not touch unless explicitly asked
`app/src/app/extension/page.tsx` and `app/src/app/api/extension-waitlist/route.ts` are the Chrome-extension product's marketing page/waitlist, hosted in this repo but not part of the Manager Dashboard (context.md "ISOLATED FILES"). Also consult context.md "FILES THAT MUST NOT BREAK" (~20 files incl. both workers, middleware.ts, paddle.ts, currentOrganization.ts) — changes there get extra care and explicit manual testing.

## 5. Non-negotiables — rule, rationale, incident

Do not "improve" any of these without an explicit owner decision.

| Non-negotiable | Rule / source | Rationale + incident |
|---|---|---|
| Every query filters `organization_id`; every `chat_analyses` read excludes excluded rows | rules 14, 15, 16 | Multi-tenant isolation, defense-in-depth on top of RLS (service-role key bypasses RLS). Verified in code: filters appear as BOTH `.eq("excluded", false)` and `.neq("excluded", true)` (e.g. `app/src/app/api/export/route.ts:46`, `dashboard/page.tsx`) — grep for both styles when auditing coverage. |
| Never hard delete — soft-delete via `excluded` boolean | rule 13 + context.md KEY DECISIONS | Analyses feed stats, reports, follow-through history; deletion would corrupt them. `toggle-exclude` route + `ExcludeToggleButton` are the only exclusion writers. |
| Paddle webhook: signature verified FIRST; processing errors still return 200 | rules 32, 33; `app/src/app/api/paddle-webhook/route.ts` | Paddle retries on non-2xx; a throwing handler would retry-storm. Verified code nuance (as of 2026-07-16): signature check is first (line 26), but invalid signature returns 401, missing secret 500, malformed payload 400 — only errors AFTER validation are swallowed to 200 (lines 58-64). That is intentional: reject unauthenticated junk, never bounce a genuine event. Preserve exactly this shape. |
| `subscriptions` table = source of truth; `organizations.plan` = webhook-updated cache | rule 34 | Middleware lock logic checks `subscriptions` first and falls back to org trial fields (middleware.ts lines 98-140). Writing plan state anywhere else desyncs billing. |
| Price changes update BOTH `PADDLE_PRICE_MAP` AND `PLAN_PRICES` | rule 36; `app/src/lib/paddle.ts` (exports at lines 7, 49; `PLAN_HIERARCHY` line 41) | One maps Paddle price-ids to plans (webhook direction), the other renders checkout prices (UI direction). Updating one silently breaks the other direction. |
| Never log PII, payment info, or keys | rules 17-19 | Customer transcripts contain names/emails; logs are Vercel-hosted. Paddle debug logging was added during the 400 saga and then deliberately stripped (`2d3a9a7`). |
| Never create a second Supabase browser client | context.md KEY DECISIONS line 295; shared client is `app/src/lib/supabase.ts` (verified: sole `createBrowserClient` call) | "Multiple GoTrueClient instances" bug on the landing page — session conflicts. Fixes: `5f13ff7`, `578d5ee`, `1bef1d9` "use shared supabase client on landing page to prevent session conflict", `5c35931`. Related rule 35: client pages read billing via the browser client, NOT `/api/subscription-status` (Route Handler cookie handling 401s client-side fetches). |
| AI output must be plain ASCII — no Unicode bullets/dashes/arrows | team-summary prompt (`app/src/app/api/team-summary/route.ts:42`: "Use only plain ASCII characters"); context.md Encoding fix | The Unicode war (Mar 18): 8+ commits of garbled characters — `59eff43` → `838f571` → `823cbec` → `2566750` → full revert `1bdf54d` → `8be2601` "Replace all garbled Unicode characters in dashboard with clean ASCII" → `fa88735` "Prevent Unicode bullet characters in team summary AI response". Resolution: instruct ASCII in the prompt AND strip at the API route. Residual risk still logged in context.md KNOWN ISSUES line 251. |
| Middleware FAILS OPEN by design | rule 37; `app/middleware.ts` lines 149-153 (catch → allow access) | A DB glitch must never lock paying customers out of a product they paid for. Do NOT "fix" this to fail closed — that is an owner-level product decision, not a hardening tweak. |

## 6. Owner standing rules (confirmed 2026-07-16)

1. NEVER touch production data, flip flags, run deploys, mutate live Supabase, or push to remotes unasked. Read-only against live systems unless the owner explicitly instructs in that session. (`app/.env.local` holds live keys — never read its values; refer to variable names only.)
2. Nothing user-visible ships without the owner's manual browser verification. Every change-work runbook ends with a numbered manual-test checklist for the owner.
3. Where you add discipline the docs don't mandate, label it "Recommended practice".

## 7. Cross-repo rule: which repo owns this?

Two products share one Supabase project and one domain (context.md line 297: "two separate products sharing one Next.js app and one Supabase project"). Before editing, confirm the file lives in the right repo:

| Belongs to THIS repo (supportcoach-ai) | Belongs to sibling `C:\Users\CHIST\Desktop\GitRepo\support-coach-extension` |
|---|---|
| Manager Dashboard app, all `/dashboard` `/upload` `/analysis` pages and API routes | Chrome extension code, its Express backend (Railway, api.supportcoach.io), admin app |
| The extension's PUBLIC WEB PRESENCE: `/extension` marketing page, `/privacy` `/terms` `/refund` `/support`, sitemap/robots, OG images, `/api/extension-waitlist` | Extension release/zip/CWS workflow |

If a request mentions the extension's landing page, waitlist, or SEO — it is THIS repo. If it mentions the extension's coaching behavior, backend, or CWS build — it is the sibling (load `coach-ext-change-control` there; note the sibling has its own divergent house rules, e.g. it forbids `&&` in PowerShell and mandates full-file replacements, which THIS repo's codex-orchestration.md explicitly removed in `3dadff1`).

## 8. How to land a change here (checklist)

1. Read `app/docs/rules.md`, `app/docs/context.md`, and the relevant task in `app/docs/codex-orchestration.md`. Confirm the change is in scope (rules.md SCOPE) — if not, get owner approval first.
2. Confirm repo ownership (Section 7) and blast-radius class (Section 4). Check the target file against context.md "FILES THAT MUST NOT BREAK" and "ISOLATED FILES".
3. If >1 file will change: pre-task savepoint commit (Section 2).
4. Read every file fully before editing (rule 1). Make only the needed change (rules 2-5).
5. Prompt change? Apply to BOTH `process-jobs` and `reanalyze-analysis` (Section 4c). Price change? Both constants in paddle.ts (rule 36). Schema change? Write the SQL block with `IF NOT EXISTS` for the owner to run in Supabase SQL Editor — never run it yourself unasked.
6. If >3 files: commit after each file (rule 9).
7. Gate locally: `npm run lint` then `npm run build` from `app/`. If the build breaks: STOP, no cascading fixes, report (rules 27-30).
8. Recommended practice: dev-server smoke check of touched pages (Section 3).
9. Update the docs AS PART of the change: task status in codex-orchestration.md, progress/decisions/KNOWN ISSUES in context.md, and paste any applied SQL or Paddle-dashboard change into context.md.
10. Final commit `"Task N: description"`. Do NOT push unless the owner asked — push = production deploy (Section 4a).
11. End your handoff with a numbered manual-test checklist for the owner, modeled on the "Test:" blocks in codex-orchestration.md (exact pages to open, exact rows to check in Supabase, expected results). Note when a prompt change only affects new analyses.

## When NOT to use this skill

- Diagnosing a live failure or error symptom → `coach-saas-debugging-playbook` (history of settled investigations → `coach-saas-failure-archaeology`).
- Understanding system design, data flow, or invariants before coding → `coach-saas-architecture-contract`.
- Setting up the dev environment, running builds, env vars → `coach-saas-build-env-run`.
- Flag/constant values and tuning (planAccess, thresholds) → `coach-saas-config-and-flags`.
- Writing or executing verification steps in depth → `coach-saas-validation-and-qa`.
- Transcript-parsing / prompt-domain semantics → `transcript-analysis-domain-reference`.
- Building plan-gating enforcement → `coach-saas-plan-gating-campaign`; growth/SEO work → `supportcoach-growth-frontier`.
- Any work inside the sibling extension repo → that repo's `coach-ext-change-control`.

## Provenance and maintenance

Authored 2026-07-16 (written to disk 2026-07-17). Sources: `app/docs/rules.md`, `app/docs/context.md`, `app/docs/codex-orchestration.md`, `app/docs/supportcoach-ai-context.md` (Section 1i), `app/middleware.ts`, `app/src/app/api/paddle-webhook/route.ts`, `app/src/lib/paddle.ts`, `app/src/lib/supabase.ts`, `app/package.json`, and `git log` of this repo (commits cited inline: e.g. `36f5b8b`, `2fa4997`, `1bdf54d`, `1bef1d9`, `93de005`).

Volatile facts — re-verify before relying on them:

| Fact (as of 2026-07-17) | Re-verify with |
|---|---|
| HEAD is `93de005` (2026-07-03), 104 commits, branch `main` only | `git -C C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai log --oneline -5` |
| rules.md still has 37 numbered rules with the numbers cited here | `Select-String -Path C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\docs\rules.md -Pattern "^\d+\."` |
| No test/CI: package.json scripts = dev/build/start/lint; no `.github`, no `vercel.json` | `Get-Content C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\package.json`; `Get-ChildItem C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app -Force` |
| Webhook error-path status codes (401 bad sig / 200 after validation) | `Select-String -Path C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\src\app\api\paddle-webhook\route.ts -Pattern "status:|received"` |
| Middleware fail-open catch block near lines 149-153 | `Select-String -Path C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\middleware.ts -Pattern "allow access"` |
| `gpt-5.4` hard-coded at 8 call sites | `Get-ChildItem C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\src -Recurse -Include *.ts,*.tsx ^| Select-String -Pattern "gpt-5.4"` |
| Both lockfiles still present (package manager ambiguity) | `Get-ChildItem C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app -Filter *lock*` |
| Phase 2 Task 6b still the open task; plan gating still unenforced | `Select-String -Path C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\docs\context.md -Pattern "Task 6b|Plan gating"` |
