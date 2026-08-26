---
name: supportcoach-growth-frontier
description: Load this skill when the OWNER of supportcoach-ai (SupportCoach AI Manager Dashboard) explicitly asks where the product can grow next — "what should we work on after Phase 2", roadmap prioritization, monetization gaps, the /extension launch funnel, SEO/marketing for supportcoach.io, prompt/analysis-quality measurement, or scale readiness. It is a map of OPEN PROBLEMS: each frontier states why the current state falls short (verified against the repo), what asset this project already holds, the first three concrete steps in this repo, and a falsifiable "you have a result when" milestone. Everything in it is candidate/unproven — do NOT treat it as an approved build plan; rules.md forbids unsolicited feature suggestions, so never volunteer this content. Before executing anything it suggests, load coach-saas-change-control. For actually building plan-gating enforcement use coach-saas-plan-gating-campaign; for prompt-domain semantics use transcript-analysis-domain-reference; for architecture invariants use coach-saas-architecture-contract; for live debugging use coach-saas-debugging-playbook. Anything about the Chrome extension's own code/backend belongs to the sibling repo support-coach-extension (coach-ext-* skills).
---

# Growth frontier map for supportcoach-ai

Facts below verified directly against the repo on 2026-07-17 (HEAD `93de005`, 2026-07-03, 104 commits, branch `main` only). Owner: Johny Patrick, solo dev, no reviewers. Product live at https://www.supportcoach.io (Vercel auto-deploy on push to main; Supabase; OpenAI workers; Paddle billing).

**What this skill is:** a map of unproven territory — five candidate frontiers where the product could advance, grounded in the repo's own docs and code, plus an explicit section for territory with NO written history. **What it is not:** an approved plan. Scope is locked (`app/docs/rules.md` SCOPE; master doc Section 13: "SCOPE IS LOCKED"), and rules 4 and 6 forbid suggesting features unprompted. Use this map only when the owner asks a growth/roadmap question, and get explicit owner approval before writing any code any frontier suggests. Nothing here routes around `coach-saas-change-control` — load it before touching anything.

Jargon, once: **frontier** = an open problem worth advancing, not a task; **candidate** = plausible but unproven and unapproved; **UNVERIFIED** = could not be confirmed from repo/docs on 2026-07-17.

## 0. Verified ground state (what every frontier builds on)

| Fact (verified 2026-07-17) | Where |
|---|---|
| Billing works end-to-end; 3 tiers at $29/$59/$99 per agent/mo; verified 2026-03-25 | context.md lines 59-65; master doc Section 14 |
| Plan gating logic EXISTS but is NOT enforced — API route gating and UI gating both marked "NOT YET" | master doc Section 14 "Implementation Notes" items 4-5; context.md REMAINING item 3 |
| The one gate that IS live: follow-through lookback window (30/90/365 by plan, `LIMIT 15` points) | `app/src/lib/planAccess.ts` lines 235-248; enforced in `app/src/lib/coachingFollowthroughFetch.ts` line 82 |
| `/extension` page converted from waitlist to self-serve trial funnel on 2026-06-24 | commit `54102d3`; CTAs point to `https://admin.supportcoach.io/signup` (sibling product's admin app) |
| `/api/extension-waitlist` route + `extension_waitlist` table still exist but no page references the route anymore | grep `extension-waitlist` across `app/src` returns only the route file itself |
| SEO plumbing added 2026-07-01/03: `sitemap.ts` (5 URLs), `robots.ts` | commits `0e8e9c2`, `93de005`; `app/src/app/sitemap.ts`, `app/src/app/robots.ts` |
| No test suite, no eval harness, no CI, no analytics tooling anywhere in `app/src` | `app/package.json` scripts = dev/build/start/lint; grep for gtag/plausible/posthog/etc. returns nothing |
| Worker processes ONE job per HTTP GET, all items serially in one request; no cron, no queue, no `maxDuration` export | `app/src/app/api/process-jobs/route.ts` lines 749-756 (`.limit(1)`); triggered from `app/src/app/upload/page.tsx` line 113 and a "Process Now" button |
| Data volume: ~52 active + ~175 legacy analyses (as of the docs' last sync, 2026-05-01) | codex-orchestration.md VERIFIED STATUS |
| `docs/context.md` last updated 2026-05-01 — everything after (extension funnel conversion, SEO work) is in git only, not in the docs of record | context.md line 2 vs git log dates |

That last row is itself a finding: **the docs of record are ~7 weeks behind git.** Any frontier work must start by syncing that drift (a change-control doc task), or you will build on a stale map.

---

## 1. Frontier F1 (candidate): finish monetization — plan-gating enforcement

**Why the current state falls short.** The landing page sells three tiers, Paddle charges three prices, and `planAccess.ts` computes per-tier flags (`canAccessTopics`, `canAccessFaqAi`, ...) — but nothing consumes them for enforcement. Verified: `app/src/app/api/topic-stats/route.ts` contains zero plan checks (a Professional-tier feature per Section 14), and `getOrgAccess` appears in exactly 2 files — its definition in `lib/planAccess.ts` and its sole consumer `api/subscription-status/route.ts` (matching coach-saas-plan-gating-campaign Section 2 check 1.3, the authoritative check). The agent page (`dashboard/agent/[name]/page.tsx`) and `lib/coachingFollowthroughFetch.ts` consume `getFollowthroughWindowDays`, a different function — that is the one live gate, not feature gating. A Starter customer paying $29/agent gets every $99 Enterprise feature; there is no product reason to upgrade. Docs agree this is deliberate debt: "Gating to be added after billing is confirmed stable" (context.md REMAINING item 3) — billing was confirmed stable 2026-03-25.

**This project's specific asset.** The hard parts are done: verified billing, a deployed access-computation layer (`getOrgAccess` handles trialing/active/past_due/canceled/expired with fail-open middleware), a written blueprint of exactly what each tier includes (master doc Section 14), and one working precedent gate (`getFollowthroughWindowDays`, live since Phase 2 Task 5). Enforcement is wiring, not design.

**First three steps in this repo.**
1. Load `coach-saas-plan-gating-campaign` — that sibling owns execution; this section only frames the frontier.
2. Build the enforcement inventory (read-only): list every Professional+/Enterprise surface from Section 14, then confirm each lacks a check —
   ```powershell
   Get-ChildItem C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\src\app\api -Recurse -Filter route.ts | Select-String -Pattern "getOrgAccess" -List
   ```
   (Expect hits only in `subscription-status` as of 2026-07-17.)
3. Resolve the doc conflict BEFORE writing a spec: master doc Section 10k says the prior-points cap is `LIMIT 30` (line 1484); context.md and code say 15 (`COACHING_FOLLOWTHROUGH_LIMIT = 15`). Code is reality; get the owner's ruling and fix the losing doc. Then draft the gating spec as a codex-orchestration.md task block for owner approval — no code before approval.

**You have a result when…** a test org on the Starter plan is denied `/dashboard/topics` and `/api/topic-stats` (upgrade prompt or 403 — semantics are an OPEN owner decision, no written record exists) while a Professional test org is not, verified in browser and with curl. Falsified if any Section 14 Professional+ feature remains reachable by a Starter org after the work is declared done.

---

## 2. Frontier F2 (candidate): extension waitlist → launch funnel

**Why the current state falls short.** The `/extension` page launched (commit `54102d3`, 2026-06-24: demo video `youtu.be/_t77xhDO8B0`, launch pricing $15/mo or $10/mo annual anchored to a $20 post-launch rate, all CTAs → `admin.supportcoach.io/signup`). Three loose ends: (a) the pre-launch waitlist — `extension_waitlist` table, service-role-only RLS — holds signups nobody may have contacted (UNVERIFIED: no written record of a launch email; owner confirmed some things never reached development, so treat as open, not as "was done"); (b) there is zero funnel measurement — no analytics anywhere in `app/src`, and `app/src/app/privacy/page.tsx` line ~210 explicitly promises no third-party analytics cookies, which constrains any tooling choice; (c) `context.md` still describes the page as a waitlist with a form (lines 83-89) — doc drift since 2026-06-24.

**This project's specific asset.** A finished, SEO-treated conversion page (own OG image `public/og-extension.png`, canonical, sitemap priority 1.0 — commits `ccbbb3b`, `4ed1ef6`), a captive list of warm pre-launch emails, and free traffic plumbing: the main landing page nav links "Live Agent Coach" → `/extension` in both logged-in and logged-out states (context.md, 2026-03-28 entry).

**First three steps in this repo.**
1. Count the asset. Ask the owner to run (read-only, Supabase SQL Editor — never run against prod yourself):
   ```sql
   SELECT count(*), min(created_at), max(created_at) FROM extension_waitlist;
   ```
2. Doc-sync task via change-control: update context.md's `/extension` description and ISOLATED FILES notes to post-`54102d3` reality, and record whether `/api/extension-waitlist` is now dead code (it is unreferenced; decommissioning it is an owner decision — the files are on the ISOLATED do-not-touch list).
3. Draft a one-page decision memo for the owner: options for waitlist activation (one-time launch email via an external tool — this repo has no email dependency: no resend/sendgrid/nodemailer in `app/package.json`), and options for cookieless funnel measurement that honor the privacy page. Decisions are the owner's; the memo is the deliverable.

**You have a result when…** context.md contains a dated record of (a) how many waitlist emails existed and what was done with them (including an explicit "decided not to contact"), and (b) a week of measured `/extension` → signup conversion — a number, not an anecdote. Falsified if after the work you still cannot state the waitlist size or the weekly conversion count. NOTE: signups land in the sibling product (`admin.supportcoach.io` = support-coach-extension repo, Railway/Vercel) — measurement on that side belongs to the sibling's skills (`coach-ext-run-and-operate`).

---

## 3. Frontier F3 (candidate): SEO / marketing surface for the dashboard product

**Why the current state falls short.** SEO exists for exactly one product. `/extension` has full metadata treatment (`app/src/app/extension/layout.tsx`: title, description, canonical, OG + Twitter cards). The Manager Dashboard's own landing page `/` has none of that: root `app/src/app/layout.tsx` metadata is `title: "SupportCoach AI"` with a one-line description and no OG image — and `/` is absent from `sitemap.ts`, whose comment misdescribes it as "gated" (it is the public marketing page with pricing and FAQ). Brand inconsistency on one domain: root says "SupportCoach AI", extension layout says "Support Coach AI". There is no content/blog surface at all. Crawlers are already arriving: commit `93de005` (2026-07-03) exists because "crawler was probing /api/logout".

**This project's specific asset.** Everything needed is one pattern-copy away: robots/sitemap plumbing works (Next Metadata API, verified live routes `app/src/app/robots.ts` / `sitemap.ts`), `extension/layout.tsx` is a proven in-repo template for per-route metadata, the landing page already has 9 FAQ accordion questions (near-ready FAQPage structured data), and Paddle-compliance legal pages (`/support` with real address and phone) give the domain trust signals many SaaS sites lack.

**First three steps in this repo.**
1. Owner decision: should `/` be indexed? If yes, add it to `sitemap.ts` and fix the misleading comment; if no, record why in context.md. (One-file change either way, via change-control.)
2. Give `/` real metadata: mirror the `extension/layout.tsx` pattern for the root (or a route group layout), including an OG image and ONE canonical brand spelling — the spelling itself is an open owner decision.
3. Establish the baseline before optimizing: UNVERIFIED whether a Google Search Console property exists for www.supportcoach.io — ask the owner; no repo evidence either way. Do not propose keyword/content work until the baseline exists.

**You have a result when…** a `site:www.supportcoach.io` query (or Search Console) shows `/` and `/extension` indexed with the intended titles/descriptions, and one chosen target query shows non-zero impressions over a 28-day Search Console window. Falsified if `/` stays unindexed or still serves the generic root metadata after deploy.

---

## 4. Frontier F4 (candidate): analysis quality you can measure — prompt evals

**Why the current state falls short.** The analysis prompt IS the product, and it ships blind. No test script, no eval harness, no token/failure observability (Section 10d explicitly deferred). The prompt lives inline, duplicated in two files that must change together (`process-jobs/route.ts`, 1,482 lines; `reanalyze-analysis/route.ts`, 1,073 lines — change-control Section 4c). History shows every quality regression was caught by the owner eyeballing production output AFTER shipping: the Unicode war (8+ commits, full revert `1bdf54d`), timestamp obsession, the banned "this chat was really about" opening. Today there is no way to answer "did this prompt edit make output better or worse?" before deploying it.

**This project's specific asset.** This codebase is unusually eval-ready: the worker demands strict JSON with a fully documented schema (master doc Section 11 lists every field), and Section 11's Prompt Quality Rules are largely MECHANICAL — banned opening phrase, ASCII-only output, max 2-3 timestamp citations, 250-450-word coaching message, 1-3 `coaching_points` with kebab-case ids, `no_opportunity` honesty rule. Most check with regex + JSON assertions, no LLM judge needed. The re-analyze route is a built-in per-chat replay mechanism, and verified reference chats exist (Subaiqua chats 288 and 292, cited in context.md as end-to-end-verified).

**First three steps in this repo.**
1. Read-only: extract the mechanically checkable rules from master doc Section 11 (lines ~1633-1690) into a checklist table — rule, field, check type (regex / count / length / enum).
2. Assemble a golden corpus with the owner: 5-10 real transcripts + their current analysis JSON. Rules 17-19 apply — transcripts contain PII; keep the corpus out of git and out of logs.
3. Build the runner OUTSIDE the app (standalone Node script in the scratchpad — an in-repo eval harness is outside documented scope and needs explicit owner approval as a new task): feed each transcript through the candidate prompt at the production settings (model `gpt-5.4`, temperature 0.2 — verified `process-jobs/route.ts` line 963) and emit a violation-count table. This spends real OpenAI money and needs the owner's key — ask first; never read key VALUES from `app/.env.local`.

**You have a result when…** for one real prompt edit you can produce before/after violation-count tables from the same corpus, and the delta is attributable to the edit. Falsified if repeated runs of the SAME prompt over the same corpus disagree beyond an agreed tolerance (then the harness, not the prompt, is the problem — fix reproducibility before trusting any delta). Remember: any prompt change that graduates from the eval to production must hit BOTH routes and only affects new analyses (change-control 4c).

---

## 5. Frontier F5 (candidate): multi-tenant scale readiness

**Why the current state falls short.** The worker's throughput model is one-customer-shaped: a GET to `/api/process-jobs` claims the single oldest pending job (`.limit(1)`, line 756) and processes ALL its items serially inside that one HTTP request — no `maxDuration` export (so the Vercel plan's default function timeout applies; the exact limit is UNVERIFIED, plan-dependent), no cron, no queue, no `vercel.json`. Triggering is user-driven (upload-page auto-fetch + "Process Now" button). Fine at ~52 active analyses; unknown at the design target of 4,000 chats/customer/month (Section 10c). And the docs impose a hard ordering constraint: unfair-rating detection (Section 10h) MUST exist before helpdesk API ingestion (10c) goes live, because ~40% of 1-star chats are product-directed and would flood agent metrics.

**This project's specific asset.** The scaling design is already written and costed, which is rare: Section 10c's two-layer architecture (metadata ingest for 100% of chats at ~zero AI cost, AI analysis for a selected 5-15%), Section 10k's per-analysis cost tables, an idempotent item-claim protocol already in the worker (fixes 8a/8b — status-conditional claim update, safe under concurrent invocations), and multi-tenant correctness already enforced twice over (RLS + application-level `organization_id` filtering, rules 14/16).

**First three steps in this repo.**
1. Measure the real ceiling: time one representative item end-to-end (parse → OpenAI → insert) on the dev server, then compute how many items fit inside the Vercel timeout. This number does not exist anywhere in the docs.
2. Stress the loop in dev only: upload a many-item job against the owner's test org (context.md documents org `8e71dc46-e674-4131-8709-506223a35d7e` as the test account) and observe what actually breaks first — timeout, OpenAI rate limit, or memory. Never against production.
3. Write the ordered prerequisite ledger as a candidate task block: 10h before 10c (doc-mandated), plus the worker decision the docs never made — cron vs queue vs per-item invocations — as OPEN options for the owner, with the measured ceiling attached.

**You have a result when…** you can state N — the maximum transcript items one worker invocation completes on the current Vercel plan — from a measured run, and a written note in the docs names the first component to change when a customer exceeds N per upload. Falsified if a 2×N-item job then completes successfully (your ceiling was wrong) or the component that actually breaks first is not the one your note named.

---

## 6. Unmapped territory — open by owner confirmation, no written history

The owner confirmed (2026-07-17) that some known issues never reached development and have NO written record. Rule for this zone: **never invent history.** If it is not in the docs or git log, it is open — elicit it from the owner, then the FIRST deliverable is recording it in context.md KNOWN ISSUES before any fix.

Documented-but-open (context.md KNOWN ISSUES, unchanged since 2026-05-01 — re-verify each is still open before working it):

| Open item | Status on record |
|---|---|
| Upload accepts one file despite "file(s)" UI and multi-file duplicate detection | Investigation deferred; suspected missing `multiple` attribute |
| Lingering React hydration error #418 on analysis page | Cause not diagnosed (the obvious fix was already applied) |
| Settings first-save shows NEXT_REDIRECT before working on second click | Minor, undiagnosed |
| Supabase RLS 406 on client-side subscriptions query | Non-blocking, undiagnosed |
| Residual Unicode risk in AI team summary | Mitigated by prompt instruction ONLY (team-summary route line 42), not eliminated. context.md's claim that the API route strips Unicode is known doc drift — no strip code exists at HEAD (see coach-saas-failure-archaeology doc-drift ledger) |

Unexplained repo artifacts (observed 2026-07-17, purpose UNVERIFIED — do not delete, do not build stories about them; ask the owner): `app/backup/`, `app/gitlog.txt`, `app/structure.txt`, the empty `app/src/app/api/manager-insights/` directory (route removed in `5c43c72`; empty dirs are untracked by git, so this exists on local disk only), and the dual lockfiles (`package-lock.json` + `pnpm-lock.yaml` — canonical package manager undecided).

Explicitly undecided product questions with no written record (owner decisions, not engineering calls): unfair-rating detection mechanism Option A/B/C (Section 10h), gating enforcement semantics (F1), waitlist activation (F2), `/` indexing + brand spelling (F3), worker scaling mechanism (F5).

## When NOT to use this skill

- Actually making any change this map motivates → `coach-saas-change-control` first, always.
- Building plan-gating enforcement (F1 execution) → `coach-saas-plan-gating-campaign`.
- Understanding system invariants before designing → `coach-saas-architecture-contract`; config/threshold values → `coach-saas-config-and-flags`.
- Prompt semantics and transcript-domain rules (F4 content) → `transcript-analysis-domain-reference`; verification procedure detail → `coach-saas-validation-and-qa`.
- A live failure or symptom → `coach-saas-debugging-playbook`; settled incident history → `coach-saas-failure-archaeology`.
- Dev environment, builds, env vars → `coach-saas-build-env-run`.
- The extension's own code, backend, CWS release, or signup-side funnel measurement → sibling repo `support-coach-extension` (`coach-ext-change-control`, `coach-ext-run-and-operate`).

## Provenance and maintenance

Authored 2026-07-17. Sources: `app/docs/rules.md`, `app/docs/context.md` (last doc update 2026-05-01), `app/docs/codex-orchestration.md` (VERIFIED STATUS section), `app/docs/supportcoach-ai-context.md` (Sections 10c/10d/10h/10k, 11, 12, 14), `app/src/lib/planAccess.ts`, `app/src/app/api/process-jobs/route.ts`, `app/src/app/{sitemap.ts,robots.ts,layout.tsx}`, `app/src/app/extension/{page.tsx,layout.tsx}`, `app/src/app/api/extension-waitlist/route.ts`, `app/package.json`, git log (commits cited inline: `54102d3`, `ccbbb3b`, `4ed1ef6`, `0e8e9c2`, `93de005`, `1bdf54d`, `5c43c72`). Frontiers are candidates by design and never "verify" — but their factual premises rot:

| Volatile premise (as of 2026-07-17) | Re-verify with |
|---|---|
| HEAD `93de005`, 104 commits — anything newer may have moved a frontier | `git -C C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai log --oneline -5` |
| Plan gating still unenforced (`getOrgAccess` consumers unchanged) | `Get-ChildItem C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\src -Recurse -Include *.ts,*.tsx ^| Select-String -Pattern "getOrgAccess" -List` |
| `/api/extension-waitlist` still unreferenced by any page | `Get-ChildItem C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\src -Recurse -Include *.ts,*.tsx ^| Select-String -Pattern "extension-waitlist" -List` |
| Sitemap still omits `/`; root metadata still generic | `Get-Content C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\src\app\sitemap.ts` then `Select-String -Path C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\src\app\layout.tsx -Pattern "title|description"` |
| No test/eval/analytics tooling yet | `Get-Content C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\package.json` |
| Worker still one-job-per-GET, no maxDuration | `Select-String -Path C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\src\app\api\process-jobs\route.ts -Pattern "limit\(1\)|maxDuration"` |
| LIMIT 15-vs-30 doc conflict still unresolved | `Select-String -Path C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\docs\supportcoach-ai-context.md,C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\docs\context.md -Pattern "LIMIT 30|LIMIT 15"` |
| context.md still frozen at 2026-05-01 (doc drift) | `Get-Content C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\docs\context.md -TotalCount 3` |
| KNOWN ISSUES list unchanged | `Select-String -Path C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\docs\context.md -Pattern "KNOWN ISSUES" -Context 0,12` |
