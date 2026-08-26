---
name: coach-saas-architecture-contract
description: Load this skill BEFORE designing or coding anything in supportcoach-ai (SupportCoach AI Manager Dashboard) that touches data flow, tenancy, billing, the analysis workers, or auth — it is the system's design contract (the load-bearing decisions and WHY). Load it when asked "how does X work", "where does tenant isolation happen", "why are there two prompts", "can I refactor/extract this", or before adding any query, route, or schema change. Core invariants — app-level organization_id filtering is the ONLY tenant barrier on service-role paths (RLS bypassed); process-jobs and reanalyze-analysis carry DUPLICATE prompts that must change together; subscriptions is billing truth, organizations.plan a stale-able cache; the middleware lock FAILS OPEN; deletion is soft; one browser Supabase client only; DB schema NOT in git. To LAND a change use coach-saas-change-control; live-failure triage → coach-saas-debugging-playbook; past incidents → coach-saas-failure-archaeology; build/env mechanics → coach-saas-build-env-run; constants/thresholds → coach-saas-config-and-flags; prompt/transcript semantics → transcript-analysis-domain-reference; plan-gating build work → coach-saas-plan-gating-campaign.
---

# Architecture contract for supportcoach-ai

Everything below verified directly against source and git on 2026-07-17. Repo: single branch `main`, 104 commits, HEAD `93de005` (2026-07-03). All code under `app/` (repo root = `README.md` + `app/`). Production: https://www.supportcoach.io on Vercel, auto-deploy on push to main, no staging. Owner: Johny Patrick, solo. This skill describes what IS and why — to change any of it, go through `coach-saas-change-control` first; several "obvious improvements" below are deliberate decisions with incidents behind them.

## 0. The one-sentence model

A Next.js App Router monolith where client pages upload PDF text, a pull-based worker route runs one giant OpenAI prompt per transcript and writes `chat_analyses` rows, dashboards aggregate those rows, and Paddle webhooks keep a `subscriptions` table that a fail-open middleware reads to lock expired orgs — with tenant isolation enforced by hand-written `organization_id` filters because most server code runs on the RLS-bypassing service-role key.

Glossary (used throughout): **RLS** = Postgres Row Level Security, per-row access policies enforced by Supabase. **Service-role key** = `SUPABASE_SERVICE_ROLE_KEY`, a server-only Supabase credential that bypasses RLS entirely. **Fail open** = on error, allow access rather than deny. **Soft delete** = flag a row hidden instead of deleting it.

## 1. Two products, one app, one Supabase project

- This repo is the **Manager Dashboard** (upload → analyze → coach). The **Chrome extension** product (live agent coaching) lives in sibling repo `C:\Users\CHIST\Desktop\GitRepo\support-coach-extension` with its own backend — but its PUBLIC marketing page and waitlist live HERE: `app/src/app/extension/page.tsx` and `app/src/app/api/extension-waitlist/route.ts` (context.md line 297: "two separate products sharing one Next.js app and one Supabase project"; both files marked ISOLATED — do not touch unless asked).
- WHY: one domain (supportcoach.io), one Vercel project, one Supabase bill; the extension page needed SEO on the main domain. Consequence: the shared Supabase project contains the `extension_waitlist` table (service-role-only RLS), and a schema change here can affect the sibling product. Repo-ownership routing table lives in `coach-saas-change-control` Section 7.
- Stack (master doc `app/docs/supportcoach-ai-context.md` Section 3): Next.js App Router + TypeScript, Supabase (Postgres + Auth), OpenAI (`gpt-5.4` hard-coded at 8 call sites), Tailwind, pdfjs-dist (client-side PDF parsing in `app/src/app/upload/page.tsx` lines 5-95), pdf-lib, Recharts, Paddle.

## 2. Multi-tenant model: organization_id on everything, filtered BY HAND

The invariant (rules.md 14-16): **every query filters `organization_id`; never rely on RLS.**

Why this is not just belt-and-braces: RLS is enabled on all tables, BUT the service-role key bypasses RLS, and service-role clients are created in **27 files under `app/src` plus `app/middleware.ts:69`** (verify: grep `SUPABASE_SERVICE_ROLE_KEY`). That is nearly every API route and most server pages (`dashboard/page.tsx:11`, `analysis/[id]/page.tsx:11`, etc.). On all those paths the hand-written `.eq("organization_id", organizationId)` filter is the ONLY tenant barrier. Master doc Section 4 (lines 205-226) codifies this.

How org resolution works:
- `app/src/lib/currentOrganization.ts` (31 lines): cookie-auth user → `organization_memberships` row → `{ user, organizationId, role }`. Throws if unauthenticated or org-less. One membership per user is assumed (`.single()`).
- Users without an org are redirected to `/onboarding` by middleware (middleware.ts lines 79-82).
- Sanctioned exception: the batch worker `/api/process-jobs` runs with NO user session and processes jobs across all orgs by design, using the `organization_id` stored on each job/item (master doc line 214; code at `process-jobs/route.ts:812`).

Verified filter styles — grep for BOTH when auditing: `.eq("excluded", false)` (dashboard/page.tsx:303) and `.neq("excluded", true)` (api/export/route.ts:46).

Known-weak points, stated plainly (open as of 2026-07-17, no written history — do not invent one):
- `app/src/app/api/toggle-exclude/route.ts` uses a service-role client (lines 4-7) and updates `chat_analyses` by `analysis_id` alone (lines 26-29) — **no auth check and no organization_id filter**. Anyone who can POST a valid analysis UUID can flip its excluded flag across tenants. RLS does not save it (service role). Open issue; fixing it is a change-control task, not a drive-by.
- `GET /api/process-jobs` is publicly reachable (middleware only gates `/dashboard|/upload|/jobs|/analysis` page paths and passes unauthenticated requests through, middleware.ts lines 32-35, 61-62). Blast radius is bounded — it only processes already-queued pending items — but it is an unauthenticated compute trigger. Documented as by-design cross-org (master doc line 214); the missing shared-secret is an open candidate, not a decided design.

## 3. The dual analysis routes and the duplicated prompt

Two routes each carry a **full private copy** of the same OpenAI system prompt and JSON schema:

| Route | File | Trigger | Auth |
|---|---|---|---|
| Batch worker | `app/src/app/api/process-jobs/route.ts` (1482 lines; prompt from line 967, model `gpt-5.4` at 962) | Fire-and-forget GET from upload page (`upload/page.tsx:113`) or "Process Now" button (`WorkerTriggerButton.tsx:41`) | None (see Section 2) |
| Per-chat re-analyze | `app/src/app/api/reanalyze-analysis/route.ts` (1073 lines; prompt from line 599, model at 594) | Form POST from analysis detail page | Cookie auth + org-scoped every query (lines 448-508) |

Verified identical structure: both prompts contain the same 13 `=== SECTION ===` markers (COMPANY COACHING CONTEXT, FIELD-SPECIFIC RULES, SCORING RUBRIC, BOOLEAN FLAG ASSESSMENT CRITERIA, ABANDONED CHAT DETECTION, SCREEN SHARING / REMOTE SESSION DETECTION, TRANSCRIPT COMPLETENESS AWARENESS, CHURN RISK ASSESSMENT, TRANSCRIPT FORMAT, CRITICAL — FACTUAL ACCURACY RULES, COPY COACHING MESSAGE FORMAT, COACHING POINTS — STRUCTURED OUTPUT).

WHY duplication instead of a shared module: the re-analyze route was added later (Section 9l) by copying the worker, and the repo's standing orders forbid refactors outside the current task (rules.md 2-3) with a locked scope — so extraction was never an approved task. The docs codify living with it instead: codex-orchestration.md Phase 2 Task 2 — "Both routes have the same OpenAI system prompt and JSON schema — apply the same change to both." The failure mode is real: coaching-context injection initially landed only in re-analyze; first-pass analyses silently missed it until `36f5b8b`. The April 27 prompt overhaul hit both in one commit (`2fa4997`). Extracting a shared prompt module remains an UNAPPROVED candidate — owner decision via change-control.

INVARIANTS:
1. Any prompt or output-schema change is applied to BOTH files in the same task.
2. Prompt changes affect only NEW analyses; existing rows keep old output until re-analyzed (context.md line 100). Say so in handoffs.
3. `copy_coaching_message` is never removed or restructured — it is the manager's deliverable; `coaching_points` is additive (context.md Phase 2 rules).
4. AI output stays plain ASCII (the Unicode war — see `coach-saas-failure-archaeology`).

Traps for "update both prompts" greps:
- `app/src/app/api/analyze/route.ts` is a THIRD, older prompt copy (`COACHING_SYSTEM_PROMPT`, line 8; `gpt-5.4` at 264) with **zero references anywhere in `app/src`** (verified: no fetch/link to `/api/analyze`) and visible mojibake (`â€”` sequences) predating the encoding fix. Master doc line 315 labels it "legacy/utility". It is dead but deployed — do not update it as if live, do not delete it unasked.
- `app/backup/3-10-2026/` is an untracked manual snapshot containing yet another old `process-jobs/route.ts`. Scope greps to `app\src` plus `app\middleware.ts`, not all of `app\`.
- Doc drift: master doc still cites `src/app/api/reanalyze/route.ts` in 5 places (lines 324, 1137, 1160, 1532, 1578); the real path is `reanalyze-analysis` (correction on 2026-04-30 covered rules/context/orchestration only — context.md line 280).

## 4. Job queue and batch worker design

Queue = two tables, no external queue service. `analysis_jobs` (one per upload batch) → `analysis_job_items` (one per PDF, carries `transcript_text`, `transcript_hash`, `status`, `analysis_id`). PDFs are parsed to text **in the browser** (pdfjs) and only text is uploaded — the server never stores the PDF.

Upload path (`app/src/app/api/create-analysis-job/route.ts`, auth + org-scoped): SHA-256 hash of transcript (line 15) → duplicate check within batch (lines 88-96) and against prior org items (lines 98-120) → duplicates skipped with reasons; all-duplicates returns 400 (lines 131-140) → job + items inserted `status='pending'`.

Worker pass (`process-jobs/route.ts` GET, lines 749-1481), design decisions and why:
1. **One job per invocation**: oldest job with status pending/processing, `.limit(1)` (lines 751-756). Serverless-friendly; a cron/retry loop drains the queue.
2. **Claim-then-work**: job flipped to `processing` (768-770); each item claimed via conditional update `status='pending' AND analysis_id IS NULL` → `processing` with `.maybeSingle()` (793-809) so two concurrent invocations cannot double-process an item. Idempotency anchor = `analysis_id IS NULL` (master doc lines 184-201): retries never duplicate conversations or analyses.
3. **Sequential per-item loop**, each item independently try/caught; any failure marks that item `failed` and continues (1449-1456). Per item: fetch org `coaching_context` (822-841) and `plan` (852-863), best-effort `earlyAgentGuess` from parsed sender names (845-850), fetch prior delivered coaching points (865-882, see Section 6), insert `conversations` + `conversation_messages`, one OpenAI call, insert `chat_analyses`, normalize+save `coaching_points` (1395-1405), upsert `coaching_followthrough` rows (1407-1433, `ignoreDuplicates` on the unique triple), mark item `completed` with `analysis_id` (1435-1441).
4. Job flips to `completed` only when no pending items remain (1459-1468).

Weak points, stated plainly:
- **No `maxDuration` export** in either worker route (only `export const runtime = "nodejs"`). A large batch can hit the Vercel function timeout mid-loop, stranding items at `processing`. Recovery is MANUAL: owner resets status to `pending` in Supabase (master doc line 181 — "Automatic recovery is not part of the current sprint"). Open by decision, not oversight.
- `earlyAgentGuess` = first unique sender name in the transcript (845-850) and is used for the prior-coaching fetch and as followthrough `agent_name` fallback (1416). If the first sender is the customer, follow-through lookups run against the wrong name for that item. Labeled best-effort in code; open, no incident on record.
- Re-analyze idempotency is different by design: it DELETES stale `coaching_followthrough` rows where this chat is `detected_in_analysis_id` (reanalyze-analysis lines 966-973) so re-analysis produces a fresh assessment, while rows where this chat is `source_analysis_id` are preserved (context.md Phase 2 rules).

## 5. Billing: subscriptions table = truth, organizations.plan = cache, middleware fails open

Layered by design (rules.md 32-37):
- **`subscriptions` table is the source of truth** for billing status; **`organizations.plan` is a convenience cache** updated by the Paddle webhook (rule 34). Verified in `app/src/app/api/paddle-webhook/route.ts`: `subscription.created`/`updated` upsert the subscriptions row THEN update `organizations.plan` (lines 109-137, 151-176). Crucially, `subscription.canceled` updates ONLY the subscriptions row (183-201) — `organizations.plan` keeps the last paid value. That is safe because the lock reads subscriptions first; but anything that reads `organizations.plan` directly inherits the staleness — e.g. the follow-through lookback window (`process-jobs` 852-863) keeps a canceled enterprise org at 365 days. Known consequence, accepted; never "fix" by writing plan state from anywhere except the webhook.
- Webhook shape (preserve exactly — rules 32-33): signature verified first (line 26; helper `verifyPaddleWebhook` in `app/src/lib/paddle.ts:68`, HMAC-SHA256 over `ts:rawBody`); invalid signature → 401, missing secret → 500, malformed payload → 400; any error AFTER validation is swallowed to 200 (58-65) because Paddle retry-storms on non-2xx. Org linkage comes from `custom_data.organization_id` set at checkout (line 98). Price-id → plan mapping: `PADDLE_PRICE_MAP` (paddle.ts:7, webhook direction) and `PLAN_PRICES` (paddle.ts:49, checkout direction) must change together (rule 36); `PLAN_HIERARCHY` at line 41.
- **Middleware lock** (`app/middleware.ts`): for authed users on `/dashboard|/upload|/jobs|/analysis` (line 61), a service-role client (67-70) resolves membership → org → newest subscriptions row (98-104). Lock logic (106-140): subscription present → `active`/`trialing` unlocked, `past_due` locked, `canceled`/`paused` unlocked until `cancel_at || current_period_end`; no subscription → org-level trial fields decide (`trial_ends_at` passed = locked; trial with no end date = legacy, unlocked). Locked → redirect `/select-plan`, except `/dashboard/billing` stays reachable (144-147). `skipPaths` (40-54) keep billing/auth/legal/webhook endpoints always reachable — the webhook MUST be in there or Paddle events would bounce.
- **Deliberate fail-open**: the entire check is wrapped in try/catch; any error allows access (149-153, rule 37). WHY: a Supabase glitch must never lock out paying customers. Trade-off accepted: a DB outage suspends billing enforcement. Changing this to fail-closed is an owner-level product decision — not a hardening tweak.
- **Plan gating is LATENT**: `getOrgAccess()` in `app/src/lib/planAccess.ts:34` computes per-tier feature flags, but its only caller is `/api/subscription-status` (route lines 7, 66), which client pages deliberately do NOT call (Route Handler cookie handling 401s client-side fetches — rule 35, context.md line 253; TrialBanner and select-plan read via the browser client instead). So no page or API route enforces tier today (context.md REMAINING item 3). Building enforcement → `coach-saas-plan-gating-campaign`.

## 6. Soft delete, follow-through data flow, plan windows

- **Never hard delete** (rule 13 + context.md KEY DECISIONS): `chat_analyses.excluded` boolean is the only deletion mechanism. WHY: analyses feed dashboard stats, topic intelligence, reports, exports, and follow-through history — deleting rows would corrupt all of them retroactively. Only writers of the flag: `/api/toggle-exclude` + `ExcludeToggleButton.tsx`. Every read excludes excluded rows (rule 15) EXCEPT screens that manage exclusions (the analysis detail page still shows excluded chats).
- Follow-through pipeline (Phase 2, live): `app/src/lib/coachingFollowthroughFetch.ts` fetches prior DELIVERED coaching points — filters org + agent + `coaching_delivered=true` + `excluded=false` + created_at within plan window, newest first, row limit 50, flattened-point hard cap `COACHING_FOLLOWTHROUGH_LIMIT = 15` (planAccess.ts:241; fetch lines 28-84). Windows: `getFollowthroughWindowDays` (planAccess.ts:243-248) — starter/trial/unknown 30d, professional 90d, enterprise 365d (365 is a hard cost cap). Prompt section built only when points exist — new agents incur zero extra tokens. Manager overrides (`coaching_followthrough.manager_override`) beat AI status everywhere.

## 7. The shared browser Supabase client singleton

`app/src/lib/supabase.ts` (6 lines) holds the ONLY `createBrowserClient` call in the codebase (verified) and exports a module-level `supabase` singleton. All five browser consumers import it: `login/page.tsx:4`, `signup/page.tsx:4`, `select-plan/page.tsx:6`, landing `page.tsx:5`, `TrialBanner.tsx:6`.

INVARIANT: never create a second browser client. WHY: multiple GoTrueClient instances fight over the same auth storage and corrupt sessions — this bit the landing page in production (fix `1bef1d9` "use shared supabase client on landing page to prevent session conflict"; context.md line 295). Server-side code instead uses `createSupabaseServer()` (`app/src/lib/supabaseServer.ts`, cookie-bound anon client, a new instance per request — that is fine) or raw service-role `createClient` (Section 2). Do not import `lib/supabase.ts` into server code.

## 8. Schema-not-in-git

The Postgres schema has NO migrations directory and zero `.sql` files anywhere in the repo (verified). Every schema change is a labeled SQL block the owner pastes into the Supabase SQL Editor by hand (master doc File Placement Rules line 341). Consequences:
- **The docs ARE the schema record.** Table-by-table schema: master doc Section 6 (lines 345-546). Verified-live column/table status: codex-orchestration.md "VERIFIED STATUS" (lines 41-52). Applied Phase 2 SQL appears verbatim in context.md (lines 191-219) and codex-orchestration.md, marked "already run manually in Supabase". An applied migration not pasted into the docs is lost knowledge.
- 10 tables as of 2026-07-17: organizations, organization_memberships, analysis_jobs, analysis_job_items, conversations, conversation_messages, chat_analyses, subscriptions, extension_waitlist (the "9 tables, RLS enabled" list, codex-orchestration lines 325-331) + coaching_followthrough (Phase 2 Task 1, RLS policy via organization_memberships).
- You can never fully trust column lists from docs alone — when a query fails on a missing column, the ground truth is the live Supabase dashboard (owner checks; never mutate live unasked). SQL safety rules always: `ADD COLUMN IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS`, never drop (rules 11-13).

## 9. Known-weak points — quick index

| Weak point | Where | Status (2026-07-17) |
|---|---|---|
| toggle-exclude: no auth, no org filter, service-role | `api/toggle-exclude/route.ts:4-29` | OPEN — no written history; fix via change-control |
| /api/process-jobs publicly triggerable | middleware.ts:32-35 + route | OPEN candidate (cross-org worker is by design) |
| Stuck `processing` items after worker timeout; no maxDuration | process-jobs route; master doc line 181 | Accepted — manual reset in Supabase |
| earlyAgentGuess may pick customer name | process-jobs:845-850 | OPEN, labeled best-effort |
| Dead legacy prompt copy w/ mojibake | `api/analyze/route.ts` (unreferenced) | OPEN — do not treat as live, do not delete unasked |
| organizations.plan stale after cancel | paddle-webhook:183-201 | Accepted consequence of cache design |
| Plan gating computed but unenforced | planAccess.ts:34, sole caller subscription-status | Scheduled work → coach-saas-plan-gating-campaign |
| subscription-status 401 on client fetch | context.md:253; rule 35 workaround | Accepted — browser client instead |
| Master doc cites wrong reanalyze path (5 places) | supportcoach-ai-context.md:324 etc. | OPEN doc drift |
| Untracked `app/backup/`, stray `app/api/`, `structure.txt` | `app/` top level | OPEN clutter — exclude from greps, do not delete unasked |
| Upload multi-file: input has `multiple` (upload/page.tsx:334) yet only one file processed per context.md:256 | upload page | OPEN, investigation deferred by owner |

## When NOT to use this skill

- Actually landing a change (savepoints, gates, docs-sync, push=deploy) → `coach-saas-change-control` (nothing routes around it, including this skill).
- A live symptom right now (white screen, webhook silence, worker stall) → `coach-saas-debugging-playbook`.
- "Has this broken before / why is this weird thing here" narratives → `coach-saas-failure-archaeology`.
- Env vars, dev server, build/lint mechanics → `coach-saas-build-env-run`.
- Tunable values (price maps, thresholds, windows) as configuration → `coach-saas-config-and-flags`.
- Writing test/verification checklists → `coach-saas-validation-and-qa`.
- Transcript parsing / prompt-content semantics → `transcript-analysis-domain-reference`.
- Building plan-tier enforcement → `coach-saas-plan-gating-campaign`; SEO/growth → `supportcoach-growth-frontier`.
- Extension coaching behavior/backend/CWS → sibling repo's `coach-ext-architecture-contract`.

## Provenance and maintenance

Authored 2026-07-17. Sources: full reads of `app/middleware.ts`, `app/src/lib/{supabase,supabaseServer,currentOrganization,paddle,planAccess,coachingFollowthroughFetch}.ts`, `app/src/app/api/{paddle-webhook,toggle-exclude,create-analysis-job,subscription-status}/route.ts`, structural reads + targeted greps of `app/src/app/api/{process-jobs,reanalyze-analysis,analyze}/route.ts`, docs of record (`app/docs/rules.md`, `context.md`, `codex-orchestration.md`, `supportcoach-ai-context.md`), and `git log` (hashes verified: `93de005`, `36f5b8b`, `2fa4997`, `1bef1d9`, `1bdf54d`, `5c43c72`). Line numbers drift with edits — treat them as anchors, re-grep before quoting.

Volatile facts — re-verify before relying (PowerShell 5.1, one command per line):

| Fact (as of 2026-07-17) | Re-verify with |
|---|---|
| HEAD `93de005`, 104 commits, `main` only | `git -C C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai log --oneline -3` |
| Middleware fail-open catch near lines 149-153 | `Select-String -Path C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\middleware.ts -Pattern "allow access"` |
| Sole `createBrowserClient` is lib/supabase.ts | `Get-ChildItem C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "createBrowserClient" | Select-Object Path,LineNumber` |
| Service-role used in 27 src files + middleware | `Get-ChildItem C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "SUPABASE_SERVICE_ROLE_KEY" -List | Measure-Object` |
| Both worker prompts still carry identical 13 section markers | `Select-String -Path C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\src\app\api\process-jobs\route.ts,C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\src\app\api\reanalyze-analysis\route.ts -Pattern "^==="` |
| `/api/analyze` still unreferenced (dead) | `Get-ChildItem C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "api/analyze"` |
| toggle-exclude still lacks auth/org filter | `Get-Content C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\src\app\api\toggle-exclude\route.ts` |
| `getOrgAccess` still has one caller (gating latent) | `Get-ChildItem C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "getOrgAccess"` |
| No SQL/migrations in git | `Get-ChildItem C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai -Recurse -Include *.sql` |
| Webhook cancel branch still skips org.plan update | `Select-String -Path C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\src\app\api\paddle-webhook\route.ts -Pattern "subscription.canceled" -Context 0,18` |
| `gpt-5.4` still at 8 call sites | `Get-ChildItem C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "gpt-5.4" | Select-Object Path,LineNumber` |
| Follow-through caps: LIMIT 15 / windows 30-90-365 | `Select-String -Path C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\src\lib\planAccess.ts -Pattern "COACHING_FOLLOWTHROUGH"` |
