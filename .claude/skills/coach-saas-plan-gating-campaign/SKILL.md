---
name: coach-saas-plan-gating-campaign
description: Load this skill when the task is to BUILD, plan, or resume plan-gating enforcement in the supportcoach-ai repo (SupportCoach AI Manager Dashboard) — making Professional/Enterprise features actually check the org's plan tier. Triggers include "plan gating", "feature gating", "gate the topics dashboard", "lock Professional features", "upgrade prompts", "lookback window dropdown", "enforce tiers", "starter users can see topics". It carries the verified as-built inventory (what gating already exists vs what is missing), the Section 14 blueprint mapped to concrete files, a ranked solution menu with obligations, fenced-off wrong paths (the trial=0 hierarchy trap, the subscription-status client-fetch 401 trap), and a measurable validation matrix. Prereq: load coach-saas-change-control first — this campaign never routes around it. For billing/webhook/Paddle failures use coach-saas-debugging-playbook; for what the plan constants mean use coach-saas-config-and-flags; for architecture invariants use coach-saas-architecture-contract; for past incident narratives use coach-saas-failure-archaeology; growth/SEO work is supportcoach-growth-frontier.
---

# Plan-gating enforcement campaign for supportcoach-ai

Everything below verified directly against the repo on 2026-07-17 (HEAD `93de005`, 104 commits, branch `main` only). Owner: Johny Patrick, solo dev, no reviewers. Production is live at https://www.supportcoach.io; push to `main` = instant Vercel deploy; there is no staging and no test suite — see `coach-saas-change-control` before touching anything.

## 0. The problem in one paragraph

The app sells three tiers — Starter $29, Professional $59, Enterprise $99 per agent/month (master doc Section 14, `app/docs/supportcoach-ai-context.md` lines 1784-1850) — and Paddle billing is fully live, but **nothing enforces the tiers**. Any paying Starter customer (or expired-trial-turned-Starter) can open the Topics Intelligence dashboard, drill-downs, and pattern cards that are sold as Professional features. The gating LOGIC exists (`app/src/lib/planAccess.ts`, feature flags per tier) but is consumed by exactly one route that almost nothing calls. Master doc Section 14 Implementation Notes #4 and #5 (lines 1846-1847) say it plainly: "API route gating: NOT YET" and "UI gating: NOT YET". This is item 3 of REMAINING BEFORE FULL LAUNCH in `app/docs/context.md` (line 126) and a 1-2 day item in codex-orchestration.md REMAINING WORK (line 451).

**Definitions** (used throughout): *plan gating* = checking the org's paid tier before serving a feature. *Lock* = the existing middleware behavior that blocks the whole app for expired trials/canceled subs (already built — NOT this campaign). *Lookback window* = how many days of prior delivered coaching the follow-through engine considers (30/90/365 by tier). *Fail open* = on error, grant access rather than deny. *Upsell* = an in-app "upgrade to Professional" prompt replacing a locked feature.

## 1. Phase 0 — authorization gate (do not skip)

Plan gating is an APPROVED work item but its TURN is an owner decision. As of the last docs update (2026-05-01), the docs' recommended next task is **Phase 2 Task 6b (agent coaching history view)**, and gating is "Scheduled after UI polish per agreed roadmap" (codex-orchestration.md line 451). The scope lock (codex-orchestration.md lines 881-887) requires: "New tasks must be added to this file before any code is written."

Gate 0.1 — confirm all of the following before writing any code:
1. The owner has explicitly asked for plan gating enforcement NOW, in this session.
2. You have read `app/docs/rules.md`, `app/docs/context.md`, and codex-orchestration.md (mandated order — see `coach-saas-change-control` Section 1).
3. You have written the task block (files, test checklist, commit message) INTO codex-orchestration.md as part of the change.
4. Savepoint committed (this is a >1 file change):

```powershell
git -C C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai add -A
git -C C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai commit -m "Pre-task savepoint: Plan gating enforcement"
```

If the owner asked for something else and you merely NOTICED gating is missing → report it, do not build it (the `/api/manager-insights` out-of-scope build was removed in `5c43c72`; do not repeat it).

## 2. Phase 1 — re-verify the current state (docs may have moved since 2026-07-17)

Run these; each has an EXPECTED result and a branch if you see something else.

| # | Command | EXPECTED (as of 2026-07-17) | If different |
|---|---|---|---|
| 1.1 | `Select-String -Path C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\docs\context.md -Pattern "Plan gating"` | Line ~126: "API routes and dashboard pages do not yet check plan tier" | If it says gating is DONE/partial → STOP, run 1.2-1.4 to map what shipped, then re-scope this campaign to the remainder |
| 1.2 | `Get-ChildItem C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\src\app\dashboard\topics -Recurse -Include *.tsx \| Select-String -Pattern "plan\|getOrgAccess\|subscription" ` | **No matches** — topics pages have zero plan awareness | Matches found → gating started; `git -C ...supportcoach-ai log --oneline -- app/src/app/dashboard/topics` to find the commits, read them before adding anything |
| 1.3 | `Get-ChildItem C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\src -Recurse -Include *.ts,*.tsx \| Select-String -Pattern "getOrgAccess" \| Select-Object Path -Unique` | Exactly 2 files: `lib/planAccess.ts` (definition) + `app/api/subscription-status/route.ts` (sole consumer) | More consumers → enforcement has begun; map before extending |
| 1.4 | `git -C C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai log --oneline -- app/src/lib/planAccess.ts` | Exactly 2 commits: `22dfbf2` (Paddle integration created it), `817d505` (Phase 2 Task 5 added window helpers) | New commits → read them; the solution menu below may already be partially chosen |
| 1.5 | `git -C C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai log --oneline -5` | HEAD `93de005` (2026-07-03) | Newer HEAD → re-read context.md CURRENT TASK before proceeding |

History note (verified via `git log --all --grep`): there is **no prior gating attempt, revert, or failed branch on record** for this work item. The fenced-off paths in Section 5 are derived from ADJACENT settled incidents (subscription-status 401, GoTrueClient duplication, scope violations) — not from a failed gating build. Do not invent a richer history than this.

## 3. As-built inventory — what exists vs what is missing (all verified 2026-07-17)

### 3a. Exists and works — do not rebuild
| Piece | Where | Notes |
|---|---|---|
| Feature-flag computation | `app/src/lib/planAccess.ts` — `getOrgAccess()` line 34, flags `canAccessTopics`/`canAccessCoachingInsights`/`canAccessPatternCards` (Professional+, level >= 2) and `canAccessFaqAi`/`canAccessIntegrations` (Enterprise, level >= 3), thresholds at lines 218-222 | Pure function of (org row, subscription row). Handles trialing → ALL flags true; past_due → locked; canceled-within-paid-period → still active |
| Tier ladder | `app/src/lib/paddle.ts` lines 41-46: `PLAN_HIERARCHY = { trial: 0, starter: 1, professional: 2, enterprise: 3 }` | NOTE trial = 0 — see trap 5.1 |
| App-wide LOCK (not feature gating) | `app/middleware.ts` — protectedPaths `/dashboard /upload /jobs /analysis` (line 61), expired/canceled → redirect `/select-plan` (line 147), billing page exempt when locked (143-146), FAIL-OPEN catch (149-153, rules.md rule 37) | Lock ≠ gating. Locked users see nothing; unlocked users currently see EVERYTHING |
| Lookback-window gating, server side | `getFollowthroughWindowDays()` (planAccess.ts 243-248: professional→90, enterprise→365, else 30) consumed by BOTH workers (`process-jobs/route.ts` ~852-862, `reanalyze-analysis/route.ts` ~538-545 — each fetches `organizations.plan` itself) and the agent page (`dashboard/agent/[name]/page.tsx` 128-133) | The data-cost side of window gating is ALREADY ENFORCED. What's missing is only the UI selector (Section 3b) |
| Hard cap on prior points | `COACHING_FOLLOWTHROUGH_LIMIT = 15` (planAccess.ts line 241), applied in `coachingFollowthroughFetch.ts` line 82 | Doc drift: master doc Section 10k line 1484 says "LIMIT 30"; code AND context.md (line 167) say 15. Code + context.md agree — treat 15 as truth, flag the master-doc line to the owner, do not change code to match a stale doc |
| Status endpoint | `app/src/app/api/subscription-status/route.ts` — sole `getOrgAccess` consumer; its only client caller is `dashboard/billing/page.tsx` line 33 | Known 401 issue from client-side fetch (rules.md rule 35 + past-mistakes list) — see trap 5.2 |

### 3b. Missing — the actual campaign scope (Section 14 blueprint → concrete surfaces)
| # | Sold feature (tier) | Enforcement surface(s) | Current state |
|---|---|---|---|
| G1 | Topic Intelligence Dashboard (Professional+, Section 9g line 929) | Page `app/src/app/dashboard/topics/page.tsx` (server component, queries Supabase directly) | No plan check at all |
| G2 | Coaching Insights by Topic + Pattern Cards (Professional+, Section 9h line 979) | Page `app/src/app/dashboard/topics/[topic]/page.tsx` | No plan check at all |
| G3 | Topic stats APIs | `app/api/topic-stats`, `app/api/topic-agent-stats`, `app/api/topic-coaching-stats` route.ts files | No plan check. Verified: NO code in `app/src` fetches these three routes (the pages compute stats server-side) — but they are live authenticated endpoints and remain a bypass if only the pages are gated |
| G4 | "Chats Needing Attention" view (Professional+ per Section 14 line 1824) | `app/src/app/dashboard/page.tsx` — `?view=attention` param (lines 294-297, 316) and the View `<select>` (lines 614-621) | No plan check; in-page conditional needed, not a route gate |
| G5 | Lookback window selector UI (Starter locked at 30 / Pro 30-90 / Ent 30-90-365) | `dashboard/agent/[name]/page.tsx` — currently NO dropdown exists (verified by grep); window is silently fixed to the plan default | UI selector was specced in Phase 2 Task 6 but 6a shipped without it; overlaps open Task 6b — coordinate, don't collide |
| G6 | "This Month"/"Last Month" ranges (Professional+) | Dashboard range `<select>` (lines 586-588) has only all/7d/30d | Feature itself NOT BUILT — nothing to gate. Out of scope (trap 5.6) |
| G7 | FAQ AI + Integrations (Enterprise) | Nowhere — features not built (Section 10e explicitly deferred) | Flags exist in planAccess.ts; features don't. Out of scope (trap 5.6) |

Minimum honest v1 of this campaign = **G1 + G2 + G3** (one coherent Professional wall). G4 and G5 are owner-choice extensions. G6/G7 are fenced off.

## 4. Phase 2 — solution menu (ranked; pick with the owner, record the decision in context.md KEY DECISIONS)

### Option A (RECOMMENDED): shared server-side access helper, gate at page + API route
Add one server-only helper (e.g. `getOrgAccessForCurrentOrg()` in `app/src/lib/planAccess.ts` or a new `app/src/lib/orgAccessServer.ts` — name it in the task block first, rule 5) that: resolves org via `getCurrentOrganization()` (`app/src/lib/currentOrganization.ts` — returns `{user, organizationId, role}` only, no plan), fetches the `organizations` row + latest `subscriptions` row (same two queries `subscription-status/route.ts` lines 43-63 already does), and returns `getOrgAccess(org, subscription)`. Then:
- Pages G1/G2: server component calls helper; if `!access.canAccessTopics` render an upsell panel linking to `/select-plan` (that path is in middleware skipPaths line 41 — always reachable). Prefer rendering an upsell over `redirect()` so the manager learns WHAT they're missing.
- APIs G3: after the existing auth check, `if (!access.canAccessTopics) return NextResponse.json({ error: "This feature requires the Professional plan." }, { status: 403 })` (proper JSON errors — rules.md rule 25).

Obligations if chosen: trial users MUST keep all flags true (already guaranteed by `getOrgAccess` — do not bypass it); canceled-within-paid-period must stay active (also already handled); decide fail-open vs fail-closed on helper DB error — **owner decision**; recommended default fail OPEN to match the rule 37 philosophy (a DB glitch must not hide features from paying customers), and record the choice in context.md; every new query filters `organization_id` (rule 14); no PII logging (rule 17).

### Option B: middleware path-based gating for /dashboard/topics
Extend `app/middleware.ts` to also check plan for `/dashboard/topics*`. Obligations: middleware already fetches org + subscription with the service-role key per request, so cost is marginal — but middleware fails open by design (149-153), cannot render an upsell (only redirect), cannot gate the three APIs' JSON shape distinctly, cannot do in-page gating (G4/G5), and grows the file on the FILES THAT MUST NOT BREAK list. Acceptable as a thin extra belt over Option A; wrong as the only mechanism. Rank: second.

### Option C: gate inside each of the 5 surfaces independently (copy-paste the two queries into every file)
Works, but duplicates the org+subscription fetch 5 times and future gates drift apart (this repo has already paid for duplicated logic once — the both-routes prompt incident, fix `36f5b8b`). Rank: third. Choose only if the owner explicitly wants zero new lib files.

### Option D: client-side gating (hide UI based on a client fetch) — REJECTED, see trap 5.2. Not a real gate (APIs stay open) and the natural implementation trips the known 401.

## 5. Fenced-off wrong paths (each with its evidence)

1. **The trial=0 trap.** `PLAN_HIERARCHY.trial = 0` (paddle.ts line 42-46). Any "simple" gate like `PLAN_HIERARCHY[org.plan] >= 2` LOCKS TRIAL USERS OUT of Professional features — but trials must have ALL features unlocked (Section 14 line 1788; context.md KEY DECISIONS "new signups start on trial with all features unlocked"; `getOrgAccess` trialing branches, planAccess.ts lines 72-84 and 164-176). Always go through `getOrgAccess`. Note the deliberate asymmetry: trial = all FEATURES, but only the Starter 30-day WINDOW (`getFollowthroughWindowDays` else-branch; context.md line ~166). Preserve both halves.
2. **Client fetch of `/api/subscription-status`.** Returns 401 from client-side fetch due to Route Handler cookie handling — documented known issue (context.md line 253), standing rule 35, and the past-mistakes list. Client components that need plan data use the shared Supabase BROWSER client (`app/src/lib/supabase.ts`) the way `TrialBanner.tsx` does (verified: it reads `organizations` + `subscriptions` directly). Server components/routes use the server pattern instead.
3. **Creating a second Supabase browser client** for any gating UI — "Multiple GoTrueClient instances" incident, fixes `5f13ff7`, `578d5ee`, `1bef1d9`, `5c35931`. One browser client exists; import it.
4. **"Fixing" middleware to fail closed** while you're in there — rule 37 is an owner-level product decision with an incident behind it. Leave it.
5. **Gating the analysis workers.** `process-jobs` and `reanalyze-analysis` are already plan-aware exactly as designed (window only). Core analysis is included in EVERY tier (Section 14 Starter list, lines 1798-1813) — do not add feature gates to the workers, and if you touch their plan plumbing at all, the change must land in BOTH routes (both-routes rule, `coach-saas-change-control` Section 4c).
6. **Gating features that don't exist** (G6 "This Month/Last Month", G7 FAQ AI / integrations). The flags `canAccessFaqAi`/`canAccessIntegrations` are aspirational. Building the features to have something to gate = scope violation (rules 2-4; the manager-insights removal `5c43c72` is the precedent).
7. **Schema changes.** None are needed — `plan`, `trial_ends_at`, `subscriptions` all exist (codex-orchestration.md VERIFIED STATUS lines 41-52). If you think you need SQL for this campaign, your design is wrong; re-read Section 4.
8. **Touching isolated files** `app/src/app/extension/page.tsx`, `app/src/app/api/extension-waitlist/route.ts` — different product, context.md ISOLATED FILES.
9. **Gating `/api/export`, manager reports, or CSV** — all Starter-included (Section 14 lines 1805-1808). Gating them would be a silent product change, not enforcement.

## 6. Phase 3 — implementation runbook (Option A shape)

1. Write the task block into codex-orchestration.md (files, tests, commit) and get owner sign-off on: scope (G1-G3 vs +G4/G5), fail-open/fail-closed, upsell copy.
2. Savepoint (Section 1).
3. Build the helper. Read `planAccess.ts`, `subscription-status/route.ts`, `currentOrganization.ts` FULLY first (rule 1).
4. Gate G1, G2 (pages), then G3 (three API routes). >3 files total → commit after EACH file (rule 9).
5. After each file, gate locally from `app/`:

```powershell
npm run lint
npm run build
```

EXPECTED: both exit 0, build ends with the route table and no type errors. If the build breaks: STOP, no cascading fixes, revert the one file with `git checkout HEAD~1 -- path/to/file` and report (rules 27-30). Known build gotcha: `planAccess.ts` imports `PLAN_HIERARCHY` from `./paddle` (relative); page files under `dashboard/` use deep relative imports (e.g. agent page line 10), API routes use `@/lib/...` — match the neighborhood you're editing.
6. Optional G4: in `dashboard/page.tsx`, when access lacks the flag, render the View select without the attention option and ignore `?view=attention` (users can type URLs — the param handling at lines 294-297 must be gated too, not just the dropdown).
7. Optional G5: coordinate with open Task 6b before touching `dashboard/agent/[name]/page.tsx` — same file, live task.
8. Update docs AS PART of the change (not after): context.md REMAINING item 3 + KEY DECISIONS entry, codex-orchestration.md task status, master doc Section 14 notes #4/#5 (lines 1846-1847) from "NOT YET" to done-with-date. Also flag (do not silently fix) the LIMIT 15-vs-30 drift at master doc line 1484.

## 7. Phase 4 — validation. Success is MEASURED, never eyeballed

### 7a. Static assertions (run from anywhere, read-only)
```powershell
Get-ChildItem C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "getOrgAccess" | Select-Object Path -Unique
```
EXPECTED after G1-G3: exactly 6 files — planAccess.ts, subscription-status, topics page, topics/[topic] page, and the 3 topic API routes share the helper (7 files if the helper is a new lib file). Fewer → a surface was missed; enumerate against the Section 3b table.

### 7b. Behavioral matrix (the real gate)
The dev server and production share ONE Supabase project — plan flips on the test org mutate live data. The documented test org is `8e71dc46-e674-4131-8709-506223a35d7e` (context.md line 259). All SQL below is owner-run in the Supabase SQL Editor, per house rules — never run it yourself unasked.

Plan-state setup blocks (labeled; the trial-reset pair is the verified pattern from context.md):
```sql
-- STATE trial (verified pattern):
UPDATE organizations SET plan='trial', trial_ends_at=now()+interval '14 days' WHERE id='8e71dc46-e674-4131-8709-506223a35d7e';
DELETE FROM subscriptions WHERE organization_id='8e71dc46-e674-4131-8709-506223a35d7e';
```
For paid states, a `subscriptions` row with `status='active'` and the target `plan` is required (org.plan alone without a subscription row evaluates to status "none" → locked by middleware — verified in both middleware.ts lines 128-140 and planAccess.ts lines 195-208). The subscriptions schema is NOT in git; before writing any INSERT, the owner verifies columns with:
```sql
SELECT column_name, data_type FROM information_schema.columns WHERE table_name='subscriptions' ORDER BY ordinal_position;
```
UNVERIFIED (2026-07-17): exact column list of `subscriptions`. Columns referenced by code: `organization_id, plan, status, seats, billing_interval, trial_end, current_period_end, cancel_at, created_at`. Build the INSERT from the query result, not from this list. The historically-proven alternative is a real checkout cancelled before the charge date (done 2026-03-25) — offer the owner both.

Then, logged into the test org in a browser (dev server `npm run dev` from `app/`, or production after deploy), record actual vs expected:

| Org state | /dashboard/topics | /dashboard/topics/[any] | GET /api/topic-stats (Network tab / fetch from console) | /dashboard (core) |
|---|---|---|---|---|
| trial (active) | 200, full topics UI | 200 | 200 JSON | 200 |
| starter (active sub) | Upsell panel (or redirect — per chosen design), NO topic data in DOM or network | Same | **403** `{"error":...}` | 200 — core untouched |
| professional (active sub) | 200, full topics UI | 200 | 200 JSON | 200 |
| enterprise (active sub) | 200 | 200 | 200 JSON | 200 |
| trial EXPIRED | redirect /select-plan (pre-existing lock — must be unchanged) | same | middleware behavior unchanged | redirect /select-plan |

Every cell is pass/fail by HTTP status + response body — nothing is "looks right". If G4 is in scope, add a column: starter + `?view=attention` → attention filtering NOT applied and option absent. Reset the test org to STATE trial when done (owner runs the trial block).

### 7c. Regression floor
1. `npm run build` exit 0. 2. Upload → analyze pipeline still completes for the test org on EVERY plan state (workers must be untouched; compare a fresh `chat_analyses` row appears). 3. Billing page still renders on every state (it is the locked-state escape hatch, middleware 143-146).

## 8. Phase 5 — promotion (routed through coach-saas-change-control, no shortcuts)

1. Final commit `"Task N: Plan gating enforcement — <scope>"` after per-file commits.
2. Docs synced in the same change (Section 6 step 8) — a change without doc sync is unfinished.
3. Hand the owner a numbered manual "Test:" checklist = the Section 7b matrix rows verbatim (exact URLs, exact expected statuses) plus the SQL state blocks. Nothing user-visible ships without the owner's own browser verification.
4. **Do NOT push.** `git push origin main` deploys to production instantly. Push only when the owner says the change should go live, and remind them in the handoff that push = deploy.
5. Prompts untouched? Then the both-routes rule was not triggered. If ANY worker file was edited (it should not have been — trap 5.5), state it explicitly and confirm both routes carry the identical change before handoff.

## When NOT to use this skill

- Any change-landing mechanics (savepoints, commit style, docs of record, blast radius) → `coach-saas-change-control` (prerequisite, not alternative).
- Billing is MISBEHAVING (checkout 400s, webhook silence, wrong plan after payment) → `coach-saas-debugging-playbook`; the two settled Paddle-dashboard sagas live in `coach-saas-failure-archaeology`.
- What `PLAN_HIERARCHY`, window constants, or `COACHING_FOLLOWTHROUGH_LIMIT` mean and how to tune them → `coach-saas-config-and-flags`.
- System invariants and data flow before coding → `coach-saas-architecture-contract`.
- Running builds/dev env → `coach-saas-build-env-run`; deeper verification procedure → `coach-saas-validation-and-qa`.
- Prompt/transcript semantics (coaching_points, follow-through statuses) → `transcript-analysis-domain-reference`.
- Pricing-page copy, SEO, conversion work → `supportcoach-growth-frontier`.
- Anything in the Chrome extension product → sibling repo `C:\Users\CHIST\Desktop\GitRepo\support-coach-extension` (`coach-ext-*` skills; note its backend gates subscriptions server-side with its own rules).

## Provenance and maintenance

Authored 2026-07-17 against HEAD `93de005`. Sources: `app/docs/context.md` (lines 118-131, 249-259), `app/docs/codex-orchestration.md` (lines 446-457, 881-887), `app/docs/supportcoach-ai-context.md` Section 14 (lines 1784-1850) + Sections 9g/9h/10k, `app/src/lib/planAccess.ts`, `app/src/lib/paddle.ts`, `app/middleware.ts`, `app/src/app/api/subscription-status/route.ts`, `app/src/lib/coachingFollowthroughFetch.ts`, both worker routes, `dashboard/page.tsx`, `dashboard/agent/[name]/page.tsx`, topics pages, and `git log` (commits cited inline: `22dfbf2`, `817d505`, `5c43c72`, `36f5b8b`, `1bef1d9`).

Volatile facts — re-verify before relying:

| Fact (as of 2026-07-17) | Re-verify with |
|---|---|
| Gating still unenforced; context.md REMAINING item 3 unchanged | `Select-String -Path C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\docs\context.md -Pattern "Plan gating"` |
| `getOrgAccess` consumed only by subscription-status | Section 2 command 1.3 |
| Topics pages have zero plan awareness | Section 2 command 1.2 |
| Section 14 notes #4/#5 still say "NOT YET" | `Select-String -Path C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\docs\supportcoach-ai-context.md -Pattern "NOT YET"` |
| `PLAN_HIERARCHY.trial` still 0 (trap 5.1 live) | `Select-String -Path C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\src\lib\paddle.ts -Pattern "trial: 0"` |
| Task 6b still open / agent page still selector-less | `Select-String -Path C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\docs\context.md -Pattern "Task 6b"` |
| LIMIT drift (code 15 vs master doc 30) unresolved | `Select-String -Path C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\src\lib\planAccess.ts -Pattern "COACHING_FOLLOWTHROUGH_LIMIT"` |
| Test org id still the documented one | `Select-String -Path C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\docs\context.md -Pattern "8e71dc46"` |
| No fetch() callers of the 3 topic APIs (G3 bypass claim) | `Get-ChildItem C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\src -Recurse -Include *.ts,*.tsx \| Select-String -Pattern "topic-stats\|topic-agent-stats\|topic-coaching-stats"` |
