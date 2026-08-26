---
name: coach-saas-failure-archaeology
description: The settled-battle chronicle for supportcoach-ai (SupportCoach AI Manager Dashboard) — every major investigation, dead end, rejected fix, and revert in the repo's 104-commit history, each recorded as symptom → root cause → evidence → status. Load this BEFORE re-investigating any symptom that sounds familiar (garbled Unicode/mojibake characters, Paddle checkout 400, Paddle webhook silently not firing, "Multiple GoTrueClient instances", 401 from /api/subscription-status, coaching output ignoring company context, AI coaching stuffed with timestamps, React hydration error 418, bigint vs string analysis ids) and before proposing to delete odd artifacts (app/gitlog.txt, the unused react-markdown dependency, the pnpm-lock.yaml) or to "add back" removed features like /api/manager-insights. For LIVE triage of a currently-broken system use coach-saas-debugging-playbook; to ship a fix use coach-saas-change-control; for design invariants use coach-saas-architecture-contract; for env/build mechanics use coach-saas-build-env-run; for tunable values use coach-saas-config-and-flags.
---

# Failure archaeology for supportcoach-ai

Every incident below was verified directly against `git log`/`git show` and the docs of record (`app/docs/rules.md`, `app/docs/context.md`, `app/docs/codex-orchestration.md`) on 2026-07-17. History as of that date: single branch `main`, 104 commits, HEAD `93de005` (2026-07-03). Owner: Johny Patrick, solo dev. Purpose of this file: **no one re-fights a settled battle, and no one mistakes an open wound for a settled one.**

How to use it: find your symptom, read the battle, follow the evidence commands, respect the status. Statuses used:

- **SETTLED** — root cause found, fix landed, do not re-litigate without new evidence.
- **SETTLED, RESIDUAL RISK** — fix landed but a known gap remains; the gap is documented.
- **OPEN** — known issue, never diagnosed or never developed. There is no hidden history to find — the owner confirmed some known issues never reached development. Do not invent one.

Inspect any commit cited here (PowerShell 5.1 — never chain with `&&`):

```powershell
git -C C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai show --stat <hash>
git -C C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai show <hash> -- <path>
```

## Battle 1: The Unicode war (2026-03-18, 12+ commits, one full revert)

**Symptom:** Garbled character sequences (mojibake such as `ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢` where a bullet `•` or arrow `→` should be) appearing in the dashboard, the manager report, the jobs pages, the upload page, and later the extension page.

**Root causes (two distinct ones, which is why the first six fixes failed):**
1. **Source files themselves contained mojibake literals.** JSX like `` ` • ${excludedCount} excluded` `` was sitting in `dashboard/page.tsx` as `ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢` — UTF-8 bytes re-encoded as if Latin-1, at least twice over. Worse, each editing round-trip re-corrupted the file further: compare the sanitizer regex in `59eff43` (patterns like `Ã¢â‚¬Â¢`) with the SAME regex one commit later in `d916c9a` — the mojibake strings literally grew longer between commits. Fixing the rendering could never fix corrupted source.
2. **The AI itself emits Unicode bullets/dashes** in team-summary and report text, so even clean source showed garbage after the next AI call.

**The dead ends, in order (all 2026-03-18, all on the manager report first):**

| Commit | Attempt | Why it failed |
|---|---|---|
| `59eff43` | Regex-replace mojibake bullets in `sanitizeReport()` (route + page) | Targeted the visible garbage, not the corrupted file; the edit round-trip corrupted the prompt strings further (see `–` → mojibake in its own diff) |
| `d916c9a` | Re-fix regex; also restore `POST` on `/api/manager-report` (a previous edit had flipped it to `GET`, breaking the page) | Collateral repair mid-war; encoding still broken |
| `838f571` | Render report via `react-markdown` (added the dependency, and with it `pnpm-lock.yaml`) | Rendering-layer fix for a source/data-layer problem |
| `823cbec` | Remove the bullet substitution "causing UTF-8 corruption" | Substitution wasn't the cause |
| `30615be` | Pass raw markdown string directly to ReactMarkdown (deleted 59 lines) | Same category error |
| `2566750` | Sanitize bullets/dashes at render time | Same category error |

**The turning point:** `56feb79` — mid-war, the owner created `RULES.md` and `CONTEXT.md` ("safety guardrails"). The docs-of-record system this repo runs on was born from this incident. Then `1bdf54d` **"Revert encoding fix attempts - restored dashboard to post-Task-3 clean state"** — full revert to the last known-good state, abandoning all six attempts.

**The settlement (round two, same day and after):** stop sanitizing, use plain ASCII everywhere.
- `8be2601` replaced every garbled literal in `dashboard/page.tsx` with ASCII (`•` → `-`).
- Page-by-page arrow fixes: `e825354`, `3895f83`, `b47f87c`, `2030015` (upload page), later `dc70208` (extension page). Note `fe0cb53` is an EMPTY commit (no files) — the arrow fix it names actually landed in `3895f83`.
- `fa88735` added one line to the team-summary prompt (`app/src/app/api/team-summary/route.ts` line 42 today): "Use only plain ASCII characters. The UI adds its own formatting."
- Docs closed it out: `06ceab0`.

**Status: SETTLED, RESIDUAL RISK.** No mojibake exists in `app/src` today (verified: `Select-String` for `Ã¢` finds nothing). BUT: context.md KNOWN ISSUES claims "the API route strips them" — **that is doc drift; it is false as of 2026-07-17.** `team-summary/route.ts` contains NO stripping code (only the prompt instruction), and `manager-report/route.ts`'s `sanitizeReport()` lost its bullet-replace in the war (it now only strips filler lines like "If helpful, I can also..."). The only defense against AI-emitted Unicode is the prompt instruction. If garbled bullets reappear in the team summary, that is this residual gap — not a new bug. The rule that survives: **AI-facing text and JSX literals stay plain ASCII** (see coach-saas-change-control Section 5).

**War debris still in the tree (do not "clean up" without owner approval):**
- `app/gitlog.txt` — a UTF-16 dump of `git log` accidentally committed inside the revert `1bdf54d`; still in HEAD. Harmless. Cleanup candidate only.
- `react-markdown` `^10.1.0` still in `app/package.json` but used NOWHERE in `app/src` (verified) — orphaned by the revert. The report page uses a custom `renderInlineMarkdown`. Removal is an owner decision.
- `app/pnpm-lock.yaml` — born in `838f571` alongside `package-lock.json`; canonical package manager remains UNVERIFIED. Touch neither lockfile unasked.

## Battle 2: The timestamp-obsession war (2026-03-18 → 2026-04-27)

**Symptom:** AI coaching messages decorated nearly every observation with timestamps (8+ citations per message), reading like a surveillance log instead of coaching.

**Timeline of attempts (all on `process-jobs/route.ts` only — this predates the both-routes rule):**
1. `a93430c` (Mar 18) — commit message claims "reduced timestamp obsession" but the diff touches ONLY `upload/page.tsx`. The prompt language "Only cite timestamps when timing is actually a coaching point" existed by then; this message overstates its diff.
2. `72ffac2` (Mar 25) — added a "TIMESTAMP CITATION LIMIT — CRITICAL" block: max 3-4 citations.
3. `b19f159` (Mar 25) — the limit made the AI drop coaching detail and bullet structure, so a "Reducing timestamps does NOT mean reducing detail" addendum was bolted on, duplicating the whole block inside itself.
4. `fab824b` (Mar 25) — **reverted to the original short instruction.** Read its diff: despite carrying the IDENTICAL commit message as `72ffac2` ("Limit timestamp citations to 3-4"), it deletes the entire CRITICAL block. The bloated two-stage prompt was judged worse than the original.
5. `2fa4997` (Apr 27) — the settlement: "HARD LIMIT: no more than 2-3 timestamp citations in the entire coaching message," applied to BOTH `process-jobs` AND `reanalyze-analysis` in one commit, alongside abandoned-chat detection, screen-sharing detection, and transcript-completeness awareness. Verified present today at `process-jobs/route.ts` lines ~1188 and ~1261, `reanalyze-analysis/route.ts` lines ~820 and ~893.

**Status: SETTLED** at 2-3 citations, both routes, with the companion rule "quotes about content/tone/phrasing/empathy/clarity must be WITHOUT timestamps" (context.md KEY DECISIONS). Do not re-tune without owner sign-off, and any change goes to BOTH routes (coach-saas-change-control Section 4c).

**Meta-lesson from this battle: commit messages in this repo can lie.** `fab824b` says "limit" but is a revert; `a93430c` claims prompt work its diff doesn't contain; `fe0cb53` is empty. When history matters, read the diff, not the message.

## Battle 3: Out-of-scope /api/manager-insights (removed, do not resurrect)

**Symptom:** A "Manager Coaching Insights" dashboard panel and `/api/manager-insights` route existed that nobody asked for.

**Root cause:** ChatGPT built it outside the approved scope; it duplicated existing team-summary/report functionality (context.md KEY DECISIONS: "Manager-insights route removed (duplicated existing routes)").

**Evidence:** `5c43c72` "Task 0: Remove duplicate manager-insights route and dashboard panel" — deletes the 110-line route and 118 lines of dashboard panel. rules.md PAST MISTAKES: "ChatGPT built `/api/manager-insights` outside the approved scope — never build features not in the orchestration prompt or master prompt." The SCOPE lock in rules.md exists because of this.

**Status: SETTLED.** It is the founding precedent for scope discipline (it is literally Task 0). If someone asks for "AI manager insights on the dashboard," the answer is: that feature was deliberately removed; new scope goes through the docs first.

## Battle 4: The Paddle checkout 400 saga (2026-03-24)

**Symptom:** Paddle checkout overlay returned HTTP 400 on every attempt; nobody could subscribe.

**Dead ends (all code-side, all found nothing wrong):**

| Commit | Isolation step |
|---|---|
| `d68bbd5` | Removed email pre-fill from checkout — still 400 |
| `1c92b1d` | Removed `customData` — still 400 |
| `7b331d6` | Stripped to minimal checkout with debug logging — still 400 |

**Root cause:** Not in the code at all. **The default payment link URL was never saved in Paddle dashboard → Checkout Settings.** Fix: set it to `https://www.supportcoach.io/select-plan`. Recorded in context.md ("Root cause of 400 error: default payment link URL was not saved in Paddle dashboard") and codex-orchestration.md. `2d3a9a7` then stripped the debug logging and restored full checkout settings — deliberate, because the debug logs risked PII (rules 17-19).

**Real code bugs fixed along the way (same day, genuinely needed but none was the 400):**
- `5fc138d` — `select-plan/page.tsx` had been created under `src/app/api/` where a page never renders; moved to `src/app/select-plan/`.
- `5f13ff7` — `Paddle.Initialize()` was called with an `environment` (lowercase) parameter the Paddle v2 SDK does not accept; removed. Also removed an ad-hoc `createClient(...)` Supabase instance in select-plan (see Battle 6).
- `de6731c` — subscription-status auth had used `createServerComponentClient` from `@supabase/auth-helpers-nextjs`, which doesn't exist in the installed packages; switched to `createSupabaseServer` from `src/lib/supabaseServer.ts` (rules.md PAST MISTAKES).

**Status: SETTLED.** The standing lesson (codified in coach-saas-change-control Section 4d): **when billing misbehaves, audit Paddle dashboard state BEFORE touching code** — payment link, webhook URL, 3 products x 2 prices. Dashboard config is invisible to git, so any dashboard change must be recorded in context.md.

## Battle 5: The webhook www-redirect saga (2026-03-25)

**Symptom:** Checkout succeeded, card processed — but `organizations.plan` never updated and `subscriptions` stayed empty. The webhook appeared to fire into a void. No error anywhere in the app.

**Root cause:** Zero code involved. The webhook URL in the Paddle dashboard was set to non-www `https://supportcoach.io/api/paddle-webhook`. The non-www host 308-redirects to www, **and Paddle does not follow redirects** — so every event died silently on the redirect.

**Fix:** Point the webhook at `https://www.supportcoach.io/api/paddle-webhook` (with www). There is no fix commit — it was a dashboard change; the record lives in context.md lines 62-63 and 292 and codex-orchestration.md ("non-www causes 308 redirect that Paddle does not follow"), synced by docs commits `4ece029`/`230ea3c`. Full flow then verified end-to-end 2026-03-25: overlay → card → webhook → `organizations.plan='starter'` → `subscriptions` row; test subscription cancelled before the April 8 charge date.

**Status: SETTLED. The www host is load-bearing.** If webhook events ever go missing again: check the delivery log in the Paddle dashboard and the exact URL FIRST. Related standing rules: webhook signature verified first, post-validation errors still return 200 (rules 32-33; nuance in coach-saas-change-control Section 5).

## Battle 6: GoTrueClient session conflicts / duplicate Supabase browser clients (2026-03-24/25)

**Symptom:** "Multiple GoTrueClient instances" console warning; auth session conflicts, worst on the landing page (nav showing wrong logged-in/out state).

**Root cause:** Several client components each created their own Supabase browser client (`createClient(...)` inline, including a dynamic `import("@supabase/supabase-js")` inside select-plan) instead of sharing one. Multiple GoTrue instances fight over the same auth storage.

**Fix sequence:** `5f13ff7` (removed the duplicate in select-plan/billing) → `5c35931` (select-plan + TrialBanner read org/subscription via the browser client) → `578d5ee` (auth-aware landing nav, removed `NavBar.tsx`) → `1bef1d9` "use shared supabase client on landing page to prevent session conflict" → `f1a0749` (created `AppNav.tsx`: app nav on all pages except `/`, landing handles its own).

**Status: SETTLED.** The invariant: **`app/src/lib/supabase.ts` holds the ONLY `createBrowserClient` call** (verified 2026-07-16 by the change-control author; re-verify command in the provenance table). Never instantiate a second browser client. Codified in context.md KEY DECISIONS line 295 and rules.md rule 35.

## Battle 7: /api/subscription-status 401 from client fetch (settled workaround, route is vestigial)

**Symptom:** `/api/subscription-status` returns 401 when fetched from client components, though the user is logged in.

**Root cause:** Next.js Route Handler cookie handling on client-side fetches — the auth cookie context doesn't reach the handler the way server components get it. Diagnosed during the Paddle build (`de6731c` fixed the server-side auth call; the client-side 401 remained).

**Fix (workaround, made permanent):** client pages read org/subscription via the Supabase browser client directly — `5c35931`. Promoted to standing rule 35 in rules.md. The route file still exists (`app/src/app/api/subscription-status/route.ts`) but client code must not call it.

**Status: SETTLED as a workaround.** The underlying Route Handler cookie behavior was never fixed — context.md still lists it under KNOWN ISSUES. Sibling issue, **OPEN**: "Supabase RLS returns 406 on client-side subscriptions query — non-blocking, page works without it" (context.md line 254). Never diagnosed; no commits exist for it.

## Battle 8: Coaching-context injection missing on first analysis (2026-03-22)

**Symptom:** Manager saved company coaching context in settings (Section 9k), but first-pass analyses ignored it; only the per-chat re-analyze (Section 9l) produced context-aware coaching.

**History:** `22dbcea` (Task 9k) added the settings page and worker prompt injection; `f4c79f0` (Task 9l) added re-analyze. Re-analyze worked; the batch worker didn't. Fix: `36f5b8b` "Inject company coaching context into worker on first analysis" — restructured `process-jobs/route.ts`: fetches `organizations.coaching_context` early with a try/catch that never blocks analysis, and injects a prominent `=== COMPANY COACHING CONTEXT ===` ground-truth section into the system prompt. `493f699` followed up with the "this chat was really about" opening ban and the evidence-preservation instruction (coaching detail must not soften when context is present — visible today at `process-jobs/route.ts` line ~952 and `reanalyze-analysis/route.ts` line ~584).

**Nuance (be precise if you dig here):** the docs say the worker "was not fetching coaching_context on first analysis" (codex-orchestration.md Section 9k). The pre-fix code at `36f5b8b^` actually DID fetch and interpolate it — but buried after the JSON output example with weak framing. The exact failure mechanism (fetch never populating vs. prompt placement too weak for the model to use) is not fully recoverable from the diff; the behavioral evidence was the owner's Shakir/Jake chat test. The settled lesson stands regardless: **prompt features must be verified end-to-end by inspecting AI OUTPUT on BOTH routes, not by code review of one** — the origin of the both-routes rule (coach-saas-change-control Section 4c).

**Status: SETTLED.**

## Battle 9: Next.js App Router naming slips (small, recurring pattern)

Two separate incidents where files existed but pages 404'd because App Router only routes `page.tsx`:
- `22dfbf2` created `select-plan/page.tsx` under `src/app/api/` → moved by `5fc138d`.
- `7ed5765` created `privacy/privacy-page.tsx`, `terms/terms-page.tsx`, `refund/refund-page.tsx` → renamed to `page.tsx` by `95124d7`.

**Status: SETTLED.** If a new page 404s, check the filename is exactly `page.tsx` and the directory is not under `api/` before debugging anything else.

## Battle 10: Phase 2 hotfixes (2026-04-30 → 05-01)

| Symptom | Root cause | Evidence | Status |
|---|---|---|---|
| CopyButton auto-mark broke: analysis id rejected | `analysis.id` is **bigint at runtime** (arrives as number); CopyButton expected string | `97588a2` casts `String(analysis.id)`; commit `0060288` message names the "bigint schema lesson" — but its diff only logged the upload bug; **the bigint lesson never made it into the docs** | SETTLED (cast); see schema note below |
| React hydration error #418 on analysis page | `toLocaleDateString()` renders differently server vs client | `c5621bc` — replaced with `toISOString().split("T")[0]` | SETTLED — but a SOFT residual #418 remains (context.md line 257): page works, cause undiagnosed, deferred to UI-polish pass. **OPEN** |
| Could not clear coaching notes | API only updated `coaching_notes` when provided; client omitted empty string | `84357bf` — client always sends notes incl. `""`; API updates only when `source === 'manual'` | SETTLED — this exact contract is listed under FILES THAT MUST NOT BREAK |
| "Copy Coaching Message" heading confusing | Title described the action, not the content | context.md line 258; `0829ef0` (Task 5 polish) | SETTLED — renamed "Coaching" |

**Schema discrepancy worth knowing (UNVERIFIED, schema is not in git):** the Phase 2 Task 1 SQL recorded in the docs declares `source_analysis_id uuid ... REFERENCES chat_analyses(id)`, yet the bigint hotfix proves `chat_analyses.id` is a number at runtime. The SQL actually run in Supabase may have differed from the doc copy. If you ever write SQL joining `chat_analyses.id`, check the real column type in Supabase first — do not trust the doc's `uuid`.

**Phase 2 trap laid deliberately (not a bug — a warning in the docs):** the analysis page hides `no_opportunity` follow-through rows as a DISPLAY-ONLY filter. context.md line 308 mandates that agent scorecards count ALL three statuses. Do not inherit the filter into scorecard code.

## Battle 11: Minor two-round fixes worth not repeating

- **OG preview image** for `/extension`: `ccbbb3b` (first branded OG image) looked blurry in link previews → `4ed1ef6` "sharper OG preview image (2x, flat teal)". Lesson: render OG images at 2x. SETTLED.
- **Crawler probing `/api/logout`** (2026-07-03, the newest incident): `0e8e9c2` added sitemap/robots; crawlers then probed API routes, including hitting `/api/logout`. `93de005` disallowed `/api` in robots.txt. SETTLED.
- **AppNav leaking onto the extension page**: `dc70208` hid it with a `.hide-dashboard-nav header { display: none !important; }` hack in `globals.css` (plus ASCII fixes). SETTLED but fragile — the extension page's isolation depends on this CSS class.

## Doc-drift ledger (docs of record that were wrong, and one that still is)

The docs are the trusted record here, but they have drifted before. Known corrections:

| Drift | Corrected by | Status |
|---|---|---|
| Re-analyze route documented as `src/app/api/reanalyze/route.ts`; real path `reanalyze-analysis/route.ts` | Doc sync 2026-04-30 (context.md line 280) | Fixed |
| Master doc Sections 12/13 carried outdated Paddle status | `967d789` | Fixed |
| context.md claims the team-summary API route "strips" Unicode | Found in this skill's verification 2026-07-17 — NO strip code exists in the route; prompt instruction only | **STILL WRONG in context.md as of 2026-07-17** |
| "bigint schema lesson" promised in `0060288`'s commit message | Never written to any doc | Lesson exists only in commit messages `97588a2`/`0060288` |

When a doc and the code disagree: the code is reality; flag the drift to the owner and fix the doc AS PART of your change (change-control step 9). Never silently code to the drifted doc.

## Open issues with NO development history (owner-confirmed)

These are in context.md KNOWN ISSUES and have never been investigated. There are no commits to archaeologize — do not go hunting for them, and do not invent past attempts:

1. Upload page accepts only ONE file despite UI saying "file(s)" and duplicate-detection supporting multiple. Suspected (undiagnosed): missing `multiple` attribute or drag-handler reading only the first file. Deferred by owner (`0060288`). **OPEN.**
2. First save on settings page shows `NEXT_REDIRECT`, works on second click. **OPEN.**
3. Supabase RLS 406 on client-side `subscriptions` query. **OPEN.**
4. VS Code false TypeScript error "Cannot find module @/components/AppNav" — stale editor cache, does not affect the Vercel build. **OPEN (cosmetic).**
5. Lingering soft hydration #418 on the analysis page (Battle 10). **OPEN.**
6. AI team summary may still emit Unicode bullets (Battle 1 residual). **OPEN.**
7. Plan gating unenforced — Professional/Enterprise features reachable on all plans; deliberate sequencing, not a bug (context.md REMAINING #3). Build work routes to `coach-saas-plan-gating-campaign`. **OPEN by design.**

## When NOT to use this skill

- The system is broken RIGHT NOW and you need triage steps → `coach-saas-debugging-playbook` (it should route back here when a symptom matches a settled battle).
- You are about to make/ship a change → `coach-saas-change-control` (mandatory; nothing here authorizes routing around it).
- You need design invariants and data flow → `coach-saas-architecture-contract`.
- Env setup, build, run → `coach-saas-build-env-run`. Flags/thresholds/constants → `coach-saas-config-and-flags`.
- Verification procedure detail → `coach-saas-validation-and-qa`. Transcript/prompt domain semantics → `transcript-analysis-domain-reference`.
- Plan-gating build work → `coach-saas-plan-gating-campaign`; SEO/growth → `supportcoach-growth-frontier`.
- Incidents in the Chrome extension product (Zoho/Zendesk coaching, Railway backend) → sibling repo `C:\Users\CHIST\Desktop\GitRepo\support-coach-extension`, skill `coach-ext-failure-archaeology`. (This repo only hosts the extension's marketing page/waitlist — those are the ISOLATED FILES.)

## Provenance and maintenance

Authored 2026-07-17 from: full `git log --oneline` (104 commits) with `git show` on every commit cited above; `app/docs/rules.md` (PAST MISTAKES), `app/docs/context.md` (KNOWN ISSUES, KEY DECISIONS), `app/docs/codex-orchestration.md` (VERIFIED STATUS, task blocks); current source spot-checks on `team-summary/route.ts`, `manager-report/route.ts`, `process-jobs/route.ts`, `reanalyze-analysis/route.ts`, `dashboard/report/page.tsx`, `package.json`. Battles 4/5 root causes live only in docs (Paddle dashboard config is invisible to git) — trusted as the docs of record. Style/structure sibling: `coach-saas-change-control`.

Volatile facts — re-verify before relying on them (PowerShell 5.1, one command per line):

| Fact (as of 2026-07-17) | Re-verify with |
|---|---|
| HEAD `93de005`, 104 commits, `main` only | `git -C C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai rev-list --count HEAD` then `git -C C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai log --oneline -3` |
| No mojibake in src; no Unicode strip code in team-summary route | `Get-ChildItem C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\src -Recurse -Include *.ts,*.tsx \| Select-String -Pattern "Ã¢"` and `Select-String -Path C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\src\app\api\team-summary\route.ts -Pattern "replace\|ASCII"` |
| Timestamp hard limit (2-3) present in BOTH routes | `Select-String -Path C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\src\app\api\process-jobs\route.ts,C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\src\app\api\reanalyze-analysis\route.ts -Pattern "2-3 timestamp"` |
| `react-markdown` still an unused dependency | `Select-String -Path C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\package.json -Pattern "react-markdown"` then `Get-ChildItem C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\src -Recurse -Include *.tsx,*.ts \| Select-String -Pattern "ReactMarkdown"` |
| `app/gitlog.txt` war debris still tracked | `git -C C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai ls-files app/gitlog.txt` |
| Both lockfiles still present | `Get-ChildItem C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app -Filter *lock*` |
| KNOWN ISSUES list unchanged (open items 1-6 above) | `Select-String -Path C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\docs\context.md -Pattern "KNOWN ISSUES" -Context 0,12` |
| context.md still (wrongly) claims the route strips Unicode | `Select-String -Path C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\docs\context.md -Pattern "API route strips"` |
| `/api/subscription-status` route still exists but is client-forbidden | `Test-Path C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\src\app\api\subscription-status\route.ts` |

If new commits have landed past `93de005`, mine them the same way before trusting any "newest incident" claim here.
