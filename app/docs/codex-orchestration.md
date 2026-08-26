# SUPPORTCOACH AI — CODEX ORCHESTRATION PROMPT

## Role and Rules

You are building a SaaS product called SupportCoach AI. Before starting any task, read these files in order:
1. `docs/RULES.md` — standing orders (mandatory, read every time)
2. `docs/CONTEXT.md` — current progress and decisions
3. This file — task list and statuses
4. `docs/supportcoach-ai-context.md` — master prompt (read relevant sections as needed)

**Critical rules:**
- Read the full file before editing it. Do not assume contents.
- Make only the changes needed for the current task. Do not refactor or reorganize surrounding code.
- Rule 1g: Do not redesign or refactor working code.
- Rule 1j: Do not suggest features, enhancements, or scope changes. Build only what is specified. When a task is done, say "Done" and stop.
- Rule 1k: Use defensive string handling: `typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback`
- Rule 1n: Always pluralize correctly when displaying counts. Use `{count === 1 ? "chat" : "chats"}` pattern.
- All database queries must filter by `organization_id` for tenant isolation.
- All queries on `chat_analyses` must include `.eq('excluded', false)` unless the query is specifically for managing exclusions.
- Database changes must use `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` and `CREATE TABLE IF NOT EXISTS`. Never drop columns or tables.
- NEVER log customer emails, payment info, passwords, API keys, or PII.

**Version control — MANDATORY for every task:**
1. Before starting a task that modifies more than 1 file: `git add -A && git commit -m "Pre-task savepoint: Task N"`
2. If a task modifies more than 3 files: commit after each file change, not at the end.
3. After completing a task: `git commit -m "Task N: brief description"` then `git push origin main`
4. After pushing, update the task status in this file AND in `docs/CONTEXT.md`.

**If something breaks:**
1. STOP immediately. Do not attempt cascading fixes.
2. Report: what file was changed, what the error is.
3. The user can revert with: `git checkout HEAD~1 -- path/to/file`

**Context window management:**
If the conversation exceeds 50 messages or you notice context degradation, stop and tell the user: "Context is getting long. Recommend starting a fresh thread. Current progress is saved in the repo." Commit all work before stopping.

---

## VERIFIED STATUS — What Is Actually Done

**Database:**
- `transcript_hash` column on `analysis_job_items`: EXISTS
- `excluded` column on `chat_analyses`: EXISTS
- `coaching_context` column on `organizations`: EXISTS
- `plan` column on `organizations`: EXISTS (default 'trial')
- `trial_ends_at` column on `organizations`: EXISTS
- `subscriptions` table: EXISTS (with RLS enabled)
- `extension_waitlist` table: EXISTS (with RLS enabled, service role only)
- Legacy items with `status = 'done'`: Cleaned up (all now 'completed')
- Records with `source_type = 'chat_transcript'`: 0 (fully fixed)
- Total analyses: ~52 active records + ~175 from earlier batches
- RLS: ENABLED on all 9 tables (including subscriptions and extension_waitlist)

**Worker (`src/app/api/process-jobs/route.ts`) and Re-Analyze (`src/app/api/reanalyze-analysis/route.ts`):**
- ✅ Idempotency check (8a)
- ✅ Processing status claim (8b)
- ✅ source_type fix (8c)
- ✅ Item completion status (8d) — applied in worker
- ✅ Orphan line parsing (8e)
- ✅ Sender misattribution fix (8h) — knownSenderNames
- ✅ Structured transcript pre-formatting — buildStructuredTranscript()
- ✅ Full coaching prompt with scoring rubric, boolean criteria, factual accuracy rules, response time thresholds
- ✅ Misattributed message detection (Rule 8 in prompt)
- ✅ Company coaching context injection (9k) — fetches from organizations table and injects into system prompt
- ✅ Coaching opening variety — "this chat was really about" pattern explicitly banned
- ✅ Reduced timestamp obsession
- ✅ Evidence preservation instruction — maintains detailed coaching even when company context is present
- ✅ Abandoned chat detection (April 27, 2026) — all scores set to 7, attention low, brief no-coaching message when customer never replies after agent connects
- ✅ Screen sharing / remote session detection (April 27, 2026) — session URL + 5+ minute gap is treated as live session, gap not coached
- ✅ Transcript completeness awareness (April 27, 2026) — incomplete transcripts (remote session, channel switch, bot pre-answered, invisible handoff) acknowledged in coaching, only visible portions coached
- ✅ Hard timestamp citation limit (April 27, 2026) — max 2-3 timestamp citations per coaching message, only when timing is the actual coaching point

**Working features:**
- ✅ Upload pipeline with duplicate detection and auto-trigger
- ✅ Worker processing with structured transcript and company context
- ✅ AI analysis with refined prompt
- ✅ Dashboard with filters, attention view, agent filtering, date ranges
- ✅ Topic Intelligence Dashboard (`/dashboard/topics`)
- ✅ Topic drill-down (`/dashboard/topics/[topic]`)
- ✅ Topic stats API, topic agent stats API, topic coaching stats API
- ✅ Manager reports + PDF export
- ✅ CSV export
- ✅ Exclude/include from reports (toggle-exclude + ExcludeToggleButton)
- ✅ Auth flow (login, signup, onboarding, middleware)
- ✅ Job management pages (human-readable titles, "completed" badges)
- ✅ Reclassify topics route (exists, has been run)
- ✅ Company coaching context settings page (`/dashboard/settings`)
- ✅ Per-chat re-analyze button + API route
- ✅ Global error boundary + 404 page
- ✅ Landing page with hero, features, pricing, FAQ, footer
- ✅ Annual/monthly pricing toggle on landing page with "2 months free" badge
- ✅ "Most Popular" badge on Professional plan with green border highlight
- ✅ ROI stats bar on landing page ($40,000+/mo, 1,000+ hrs, 40x ROI)
- ✅ FAQ section on landing page (9 accordion questions)
- ✅ Footer with Terms, Privacy, Refund, Support links
- ✅ Auth-aware nav on landing page (logged-out vs logged-in views)
- ✅ AppNav component (`src/components/AppNav.tsx`) on all interior pages
- ✅ Live Agent Coach nav link on landing page (points to /extension)
- ✅ Extension marketing page at /extension (isolated from manager dashboard)
- ✅ Extension waitlist API at /api/extension-waitlist (isolated from manager dashboard)
- ✅ RLS policies on all tables
- ✅ Pluralization fix across all pages
- ✅ Worker trigger button ("Process Now" with states)
- ✅ Production deployment on Vercel (supportcoach.io)
- ✅ Terms of Service page (`/terms`)
- ✅ Privacy Policy page (`/privacy`)
- ✅ Refund Policy page (`/refund`)
- ✅ Customer Support page (`/support`) with address and phone
- ✅ Paddle billing account approved
- ✅ Paddle billing integration code (all files built and deployed)
- ✅ Paddle products and prices configured (3 products × 2 prices)
- ✅ Paddle webhook endpoint configured
- ✅ Paddle billing fully verified end-to-end (March 25, 2026) — checkout, webhooks, database updates all working
- ✅ Trial banner on dashboard
- ✅ Plan selection page with seat picker
- ✅ Billing management page
- ✅ Middleware subscription/trial lock check
- ✅ Onboarding sets trial_ends_at on new orgs
- ✅ Coaching delivery tracking (auto-mark on Copy + manual toggle + notes) — Phase 2 Tasks 1, 3, 4
- ✅ Structured `coaching_points` output from both analysis routes — Phase 2 Task 2
- ✅ AI follow-through detection with manager override — Phase 2 Task 5
- ✅ Agent page follow-through scorecard + repeated coaching cards + "Copy follow-up message" — Phase 2 Task 6a
- ✅ /extension self-serve trial funnel with demo video and per-agent pricing (June 2026)
- ✅ /extension OpenGraph link-preview metadata and branded OG image (June 2026)
- ✅ Privacy policy section covering the Chrome Extension (June 2026)
- ✅ sitemap.xml and robots.txt (July 2026)

**Not built (commonly assumed to exist):**
- ❌ `getAgentCoachingHistory()` / agent coaching history view — Phase 2 Task 6b, the only unbuilt Phase 2 item
- ❌ Lookback-window selector dropdown on the agent page — `windowDays` is derived from plan with no user-facing control
- ❌ Plan gating enforcement — Professional/Enterprise features remain accessible on all plans

---

## TASK LIST — ALL TASKS COMPLETE

### TASK 0: Remove manager-insights (cleanup)
STATUS: ✅ DONE

**Delete:** `src/app/api/manager-insights/route.ts` — remove the entire file.

**Edit:** `src/app/dashboard/page.tsx` — remove only these items:
- `ManagerInsightsResult` type definition
- `getManagerInsights()` function
- `const managerInsights = await getManagerInsights(aiSummaryPayload);` call
- `managerInsightsTitle` variable
- The entire "Manager Coaching Insights" panel JSX block (the `<div>` containing `managerInsightsTitle` and the `managerInsights` rendering)

Do NOT touch anything else in the dashboard file.

**Test:** Dashboard loads without errors. No "Manager Coaching Insights" panel visible. All other panels still work.

**Commit:** `git commit -m "Task 0: Remove duplicate manager-insights route and dashboard panel"`

---

### TASK 1: Run topic reclassification
STATUS: ✅ DONE

This is not a code task. The route at `/api/reclassify-topics` was triggered manually.

---

### TASK 2: Verify duplicate detection in create-analysis-job
STATUS: ✅ DONE

**Read:** `src/app/api/create-analysis-job/route.ts`

Check whether it:
1. Generates a SHA-256 hash of `transcript_text`
2. Stores the hash in `transcript_hash` on `analysis_job_items`
3. Checks for existing hash before inserting
4. Returns duplicate info to the user if match found

If all four are present → say "Already implemented" and skip.
If any are missing → implement per Section 8f of the master prompt. Edit only what's needed.

**Test:**
1. Upload a PDF — job created normally.
2. Upload same PDF again — rejected with duplicate message.
3. Upload 3 PDFs where 1 is a duplicate — job created with 2 items only.

**Commit:** `git commit -m "Task 2: Implement duplicate transcript detection at upload"`

---

### TASK 3: Production hardening — Job display names (Section 9i)
STATUS: ✅ DONE

**Read:** `src/app/jobs/page.tsx` and `src/app/jobs/[id]/page.tsx`

Replace raw UUID job titles with human-readable format: "Upload — Mar 12, 2026, 5:49 PM" using the job's `created_at` timestamp.

Also verify `src/app/jobs/[id]/page.tsx` uses `"completed"` not `"done"` for item status badges. Fix if needed.

**Test:** `/jobs` shows date-based titles. `/jobs/{id}` shows "completed" badges in green.

**Commit:** `git commit -m "Task 3: Human-readable job titles and verified status badges"`

---

### TASK 4: Production hardening — Worker trigger (Section 9i)
STATUS: ✅ DONE

**Read:** `src/components/WorkerTriggerButton.tsx`

Changes:
1. Rename button label to "Process Now"
2. Add states:
   - Default: "Process Now" — clickable
   - Running: "Processing..." — disabled with spinner/pulse
   - Complete: "Done ✓" briefly, then reset

**Read:** `src/app/upload/page.tsx` OR `src/app/api/create-analysis-job/route.ts`

Add automatic worker trigger — a fire-and-forget fetch to `/api/process-jobs` after job creation. The manual button remains as backup.

**Test:** Upload a PDF → worker triggers automatically. Button shows "Processing..." during run.

**Commit:** `git commit -m "Task 4: Rename worker button to Process Now with states, add auto-trigger"`

---

### TASK 5: Verify excluded filter coverage (Section 9j)
STATUS: ✅ DONE

The exclude feature is built. This task verifies ALL queries respect the `excluded` flag.

**Read each file** and check for `.eq('excluded', false)` or `.neq('excluded', true)` on `chat_analyses` queries:

- `src/app/dashboard/page.tsx`
- `src/app/dashboard/agent/[name]/page.tsx`
- `src/app/dashboard/topics/page.tsx`
- `src/app/dashboard/topics/[topic]/page.tsx`
- `src/app/api/team-summary/route.ts`
- `src/app/api/trend-data/route.ts`
- `src/app/api/manager-report/route.ts`
- `src/app/api/manager-report-pdf/route.ts`
- `src/app/api/topic-stats/route.ts`
- `src/app/api/topic-agent-stats/route.ts`
- `src/app/api/topic-coaching-stats/route.ts`
- `src/app/api/export/route.ts`

Report status of each file. Only edit files missing the filter.

**Test:** Exclude a chat → verify it disappears from dashboard stats, topics, and export. Still visible on analysis detail page.

**Commit:** `git commit -m "Task 5: Verified and fixed exclude filter coverage across all queries"`

---

### TASK 6: Pattern Cards UI (Section 9h)
STATUS: ✅ DONE

**Read:** `src/app/dashboard/topics/[topic]/page.tsx`

Check if pattern cards already exist with: agent name, topic, occurrence count, detected signals, narrative, recommendation, confidence level.

If complete → say "Already implemented" and skip.
If missing or incomplete → implement per Section 9h "Pattern Cards" specification in the master prompt:
- Template-based narratives (not AI calls)
- Confidence: High (7+), Medium (5–6), Low (3–4)
- Severity ordering for multiple signals
- Minimum 3 chats per agent+topic
- Sortable by confidence, occurrence count, agent, topic

**Test:** Navigate to a topic drill-down with data. Pattern cards appear with coaching recommendations.

**Commit:** `git commit -m "Task 6: Pattern cards with template-based coaching narratives"`

---

### TASK 7: Surface quick_summary and copy coaching message (Section 9b, 9c)
STATUS: ✅ DONE (already implemented, no code changes needed)

**Read:** `src/app/dashboard/page.tsx` — check if `quick_summary` is shown on chat cards.
**Read:** `src/app/analysis/[id]/page.tsx` — check if copy-to-clipboard exists for `copy_coaching_message`.

Only build what's missing. Skip what already exists.

**Test:** Dashboard cards show quick summary. Analysis page has working copy button for coaching message.

**Commit:** `git commit -m "Task 7: Surface quick summary and copy coaching message in UI"`

---

### TASK 8: Attention priority badges (Section 9d)
STATUS: ✅ DONE (already implemented, no code changes needed)

**Read:** `src/app/dashboard/page.tsx` — check if priority badges exist on chat cards.

If present → say "Already implemented" and skip.
If missing → add color-coded badges: high = red, medium = yellow, low = green.

**Test:** Dashboard chat cards show colored priority badges.

**Commit:** `git commit -m "Task 8: Attention priority badges on dashboard chat cards"`

---

### TASK 9: Global error boundary — no white screens
STATUS: ✅ DONE

**Create:** `src/app/error.tsx` — a Next.js App Router error boundary. This catches runtime errors on any page and shows a user-friendly message instead of a white screen.

The error page should:
- Show a simple message: "Something went wrong. Please try refreshing the page."
- Include a "Try Again" button that calls `reset()`
- Include a "Go to Dashboard" link
- Match the existing dark theme styling
- Log the error to console (but NEVER log user data, emails, or PII)

**Also create:** `src/app/not-found.tsx` — a custom 404 page. Shows "Page not found" with a link back to the dashboard. Matches the dark theme.

**Test:** Navigate to a non-existent URL like `/dashboard/fakepage` — should show the 404 page, not a white screen.

**Commit:** `git commit -m "Task 9: Global error boundary and 404 page"`

---

## POST-MVP TASKS (COMPLETED)

### Section 9k: Company Coaching Context
STATUS: ✅ DONE
- SQL migration applied: `coaching_context` column on `organizations`
- Settings page: `src/app/dashboard/settings/page.tsx`
- Worker integration: coaching context injected into OpenAI system prompt
- Bug fix applied: worker was not fetching coaching_context on first analysis — now fetches from organizations table before every OpenAI call
- Tested with Shakir/Jake chat — coaching now references company-specific processes

### Section 9l: Per-Chat Re-Analyze
STATUS: ✅ DONE
- API route: `src/app/api/reanalyze-analysis/route.ts`
- Analysis page button with confirmation prompt
- One chat at a time, no bulk — intentional cost control
- Tested — re-analyzed chats reflect updated coaching context

### RLS Security Policies
STATUS: ✅ DONE
- Enabled on all 9 tables (organizations, organization_memberships, analysis_jobs, analysis_job_items, conversations, conversation_messages, chat_analyses, subscriptions, extension_waitlist)
- Authenticated users restricted to own org data
- Anonymous access blocked
- Service role key bypasses (worker unaffected)

### Landing Page
STATUS: ✅ DONE
- Hero section, feature highlights, three-tier pricing
- Built by Codex at `src/app/page.tsx`

### Pluralization Fix
STATUS: ✅ DONE
- All count displays use correct singular/plural pattern across all pages

### Encoding Fix
STATUS: ✅ DONE
- Dashboard garbled Unicode characters replaced with clean ASCII

### Upload Page Polish
STATUS: ✅ DONE
- Click to Upload with drag-and-drop, centered Upload and Analyze button

### Prompt Improvements
STATUS: ✅ DONE
- Coaching opening variety (no more repetitive "this chat was really about" — pattern explicitly banned in prompt)
- Reduced timestamp obsession (only cite timing when it's a coaching point)
- Evidence preservation instruction (maintain detailed evidence-based coaching even when company context is present)
- Abandoned chat detection (April 27, 2026): when customer sends initial question, agent connects and responds, customer never replies — all scores set to 7, attention set to low, brief "no coaching needed" message generated, array fields kept minimal. Applied to both process-jobs and reanalyze routes.
- Screen sharing / remote session detection (April 27, 2026): when transcript contains a remote session URL (join.zoho.com, zoom.us, meet.google.com, teamviewer.com, anydesk.com) followed by a 5+ minute gap, the gap is treated as a live session and not coached on. Applied to both process-jobs and reanalyze routes.
- Transcript completeness awareness (April 27, 2026): when transcript is incomplete (remote session, channel switch to email/phone, bot answered before agent connected, invisible handoff), the AI explicitly acknowledges incompleteness in the coaching message and only coaches on visible portions. Applied to both process-jobs and reanalyze routes.
- Hard timestamp citation limit (April 27, 2026): max 2-3 timestamp citations per coaching message, only when timing is the actual coaching point. Quotes about content, tone, phrasing, empathy, or clarity must be without timestamps. Updated What You Did Well and Where to Improve subsections of the COPY COACHING MESSAGE FORMAT to enforce this. Applied to both process-jobs and reanalyze routes.

### Production Deployment
STATUS: ✅ DONE
- Deployed to Vercel (auto-deploys on git push)
- Domain supportcoach.io connected and live
- Environment variables configured in Vercel dashboard

### Legal / Compliance Pages
STATUS: ✅ DONE
- Terms of Service: `src/app/terms/page.tsx` → supportcoach.io/terms
- Privacy Policy: `src/app/privacy/page.tsx` → supportcoach.io/privacy
- Refund Policy: `src/app/refund/page.tsx` → supportcoach.io/refund
- Customer Support: `src/app/support/page.tsx` → supportcoach.io/support (includes registered address and phone number)

### Billing Provider
STATUS: ✅ Paddle APPROVED and LIVE, Stripe under review
- Paddle account approved, integration verified end-to-end, customers can subscribe
- Stripe application submitted, still under review (backup only)

### Paddle Billing Integration
STATUS: ✅ DONE — Fully verified end-to-end (March 25, 2026)
- SQL migration: subscriptions table + plan/trial_ends_at columns on organizations
- Paddle products created: Starter, Professional, Enterprise
- Paddle prices created: 6 total (3 monthly + 3 annual with 14-day trial)
- Paddle webhook endpoint configured: https://www.supportcoach.io/api/paddle-webhook (with www — non-www causes 308 redirect that Paddle does not follow)
- Default payment link configured in Paddle Checkout Settings: https://www.supportcoach.io/select-plan
- Environment variables set in .env.local and Vercel: PADDLE_API_KEY, PADDLE_WEBHOOK_SECRET, NEXT_PUBLIC_PADDLE_CLIENT_TOKEN, NEXT_PUBLIC_PADDLE_ENVIRONMENT
- Files created:
  - `src/lib/paddle.ts` — price ID mapping, webhook signature verification
  - `src/lib/planAccess.ts` — plan gating logic, feature access per tier, trial/subscription status
  - `src/app/api/paddle-webhook/route.ts` — processes subscription lifecycle events from Paddle
  - `src/app/api/subscription-status/route.ts` — returns org plan and access (server-side, has cookie issue with client-side fetch)
  - `src/app/select-plan/page.tsx` — plan selection with monthly/annual toggle, seat picker, Paddle checkout overlay
  - `src/components/TrialBanner.tsx` — trial countdown banner, uses Supabase browser client directly
  - `src/app/dashboard/billing/page.tsx` — current plan display, upgrade/cancel links
- Files modified:
  - `src/app/api/onboarding/route.ts` — sets plan='trial' and trial_ends_at=now()+14 days on new orgs
  - `src/app/onboarding/page.tsx` — redirects to /select-plan instead of /dashboard after org creation
  - `middleware.ts` — added subscription/trial lock check, redirects expired trials to /select-plan
  - `src/app/dashboard/page.tsx` — added TrialBanner import and component
- Resolution of earlier 400 error: default payment link URL was not saved in Paddle dashboard. Fix: set default payment link in Paddle Checkout Settings.
- Resolution of earlier webhook failures: webhook URL was set to non-www causing 308 redirect. Fix: switched to https://www.supportcoach.io/api/paddle-webhook.
- Full flow verified: checkout overlay → card processed → webhook delivered → organizations.plan updated to 'starter' → subscriptions table populated. Test subscription cancelled before April 8th charge date.
- Known issue: subscription-status API route returns 401 from client-side fetch (Route Handler cookie issue). Workaround in place: TrialBanner and select-plan page use Supabase browser client directly.

### Landing Page Polish (March 25, 2026)
STATUS: ✅ DONE
- Annual/monthly pricing toggle with "2 months free" badge
- Professional plan highlighted with green border and "Most Popular" badge
- All pricing card bullet dots changed to consistent teal
- ROI stats bar added above pricing toggle ($40,000+/mo, 1,000+ hrs, 40x ROI)
- FAQ section added with 9 accordion questions
- Footer added with Terms, Privacy, Refund, Support links and copyright
- `src/app/page.tsx` converted to "use client" for toggle state

### Auth-Aware Nav (March 25, 2026)
STATUS: ✅ DONE
- Landing page (/) has its own nav built in — logged-out shows Features/Pricing/Login/Get Started, logged-in shows Dashboard/Logout
- Logo on landing page links to / when logged out, /dashboard when logged in
- `src/components/AppNav.tsx` created — app-wide nav shown on all pages except /
- AppNav shows Upload/Dashboard/Settings/Logout on all interior pages
- Logo in AppNav always links to /dashboard
- Settings link points to /settings (not /dashboard/settings)
- `src/app/layout.tsx` updated to use AppNav
- Fixed multiple GoTrueClient instances bug — landing page now uses shared supabase client from `src/lib/supabase.ts` instead of creating a new instance

### Extension Landing Page (March 26, 2026)
STATUS: ✅ DONE
- `src/app/extension/page.tsx` — public-facing marketing landing page for the Chrome Extension product, lives at supportcoach.io/extension
- `src/app/api/extension-waitlist/route.ts` — public POST endpoint, inserts into extension_waitlist Supabase table
- Supabase table: `extension_waitlist` (id, email unique, company_name, team_size, created_at) — RLS enabled, service role only
- Page is fully self-contained — no shared nav, no dashboard auth, no shared components
- Page contains: hero, mock coaching card, 3 layers feature section, platform compatibility, demo video placeholder, waitlist form, footer CTA to /
- **These files are ISOLATED — do not modify unless explicitly asked**

### Live Agent Coach Nav Link (March 28, 2026)
STATUS: ✅ DONE
- LoggedOutNav: "Live Agent Coach" link added between Pricing and Login, points to /extension
- LoggedInNav: "Live Agent Coach" link added before Dashboard, points to /extension
- `src/app/page.tsx` updated — no other changes made to this file

### Trial Extension for Bangkok Travel
STATUS: ✅ DONE
- Trial extended to 30 days via SQL to cover Bangkok travel (April 6–17, 2026)
- SQL used: `UPDATE organizations SET plan='trial', trial_ends_at=now()+interval '30 days' WHERE id='8e71dc46-e674-4131-8709-506223a35d7e';`

### Extension Landing Page — Waitlist to Trial Funnel (June 24, 2026)
STATUS: ✅ DONE — commit `54102d3`
- Converted `/extension` from a waitlist capture page into a self-serve trial funnel
- Embedded the published demo video (youtu.be/_t77xhDO8B0)
- Removed the waitlist form; added per-agent pricing: $15/agent/mo monthly, $10/agent/mo annual (billed $120/yr), both anchored against a stated $20 post-launch rate. Launch-pricing banner with "lock in for the life of your subscription". 50c/day value framing.
- All CTAs point to `https://admin.supportcoach.io/signup` (14-day trial, no card). "Sign In" points to `https://admin.supportcoach.io/`. Defined as `SIGNUP_URL` / `ADMIN_URL` constants at the top of the page file.
- Footer links: Privacy, Terms, support email
- Internal `<a href="/">` converted to `next/link` to satisfy the build
- **Side effect:** `src/app/api/extension-waitlist/route.ts` is now orphaned — no caller remains. Route and `extension_waitlist` table both retained deliberately (table holds real signups).
- `src/app/privacy/page.tsx` — added section 9 "Chrome Extension (Live Agent Coach)": transient draft handling (not stored; 60s in-memory hash-keyed cache), OpenAI as sub-processor, Chrome Web Store Limited Use compliance. Sections renumbered 9→10, 10→11. Last updated bumped to June 23, 2026.

### Extension Link-Preview and Favicon (June 24, 2026)
STATUS: ✅ DONE — commits `ccbbb3b`, `4ed1ef6`
- Created `src/app/extension/layout.tsx` — server layout supplying title, description, canonical, OpenGraph and Twitter metadata for the /extension route. Needed because `page.tsx` is a client component and cannot export metadata.
- Created `public/og-extension.png` (2400x1260 flat teal) and `public/og-extension.svg`
- Replaced `src/app/favicon.ico` with `src/app/icon.png`; `src/app/layout.tsx` updated

### SEO — Sitemap and Robots (July 1 and 3, 2026)
STATUS: ✅ DONE — commits `0e8e9c2`, `93de005`
- `src/app/sitemap.ts` — public indexable pages only: /extension (priority 1), /support, /privacy, /terms, /refund. Gated app routes intentionally omitted.
- `src/app/robots.ts` — allow /, disallow /api, /dashboard, /settings, /upload, /jobs, /analysis, /onboarding, /select-plan. Sitemap URL declared.
- `/api` added to disallow on July 3 after a crawler was observed probing `/api/logout`
- **Standing rule:** a new PUBLIC page must be added to `sitemap.ts`; a new GATED route must be added to the `robots.ts` disallow list.

---

## REMAINING WORK

| Item | Effort | Owner |
|---|---|---|
| Phase 2 Task 6b — agent coaching history view | 0.5-1 day | Only unbuilt Phase 2 task. Read the AS-BUILT warning in Task 6 first. |
| Dashboard UI polish (interior pages) | 1 day – 1 week | User decision on shadcn/ui direction pending |
| Plan gating enforcement | 1-2 days | Scheduled after UI polish per agreed roadmap |
| Duplicate PDF link to existing analysis (Section 8f) | 0.5 day | Approved for build post-Bangkok |
| Password change flow | 1 day | Phase 2, post-Bangkok |
| Self-signup improvements | 1-2 days | Phase 2, post-Bangkok |
| Agent management | 2-3 days | Phase 2, post-Bangkok |
| Orphaned `extension-waitlist` route — keep, or retire deliberately | 0.25 day | Needs a decision, not a default |
| Stripe billing (if approved) | Optional — Paddle is primary | Backup |

---

## PHASE 2 TASKS — COACHING EFFECTIVENESS TRACKER

These tasks are scoped, designed, and approved for build. Reference Section 10k of `docs/supportcoach-ai-context.md` and the Coaching Effectiveness Tracker section in `docs/CONTEXT.md` for full design rationale.

**Architectural overview:**
The Coaching Effectiveness Tracker is a 6-task system that tracks specific behavioral coaching points across an agent's chats over time, automatically detects when previously-coached behaviors recur in new chats, and surfaces those patterns with auto-generated follow-up coaching messages the manager can paste verbatim.

**Core design decisions (locked):**
- **Chat-level delivery tracking** — Copy Message click marks all coaching points from that chat as delivered together (matches the Copy button reality, simpler UI). Per-point granularity not needed for v1.
- **Structured coaching points** — AI outputs `coaching_points: [{id, area, specific_behavior, recommended_behavior}]` alongside existing `copy_coaching_message`. Tags (area) stay generic for stats; specific_behavior + recommended_behavior are precise enough to check against future chats.
- **AI-driven follow-through detection with manager override** — When analyzing a new chat, the AI is given the agent's previously-delivered coaching points within the lookback window, and outputs per-point status (`followed_through` / `repeated` / `no_opportunity`) with evidence. Manager can override on the analysis page.
- **Auto-generated follow-up coaching message** — Templated string built from original coaching point + new chat where it recurred. Copy-to-clipboard button. No extra AI call needed.
- **Plan-gated lookback windows:** Starter = 30 days only. Professional = 30 or 90 days (default 90). Enterprise = 30, 90, or 365 days (default 365). Hard cap at 365 days for "All time" to prevent runaway costs and stale data ("All time" labeled in UI as "All time (up to 365 days)").

**Build order:** Tasks must be built in order — each builds on the previous. Tasks 1 and 2 are foundational. Tasks 3 and 4 add the manual control surface. Task 5 is the AI detection engine. Task 6 is the agent-facing UI that brings everything together.

---

### PHASE 2 TASK 1: Database schema + Copy auto-check (foundation)
STATUS: ✅ DONE

**Why this is first:** Every other Phase 2 task depends on these columns and tables existing. The Copy click is the highest-intent signal that coaching is about to happen, so we wire auto-marking on Copy in this task to start populating delivery data immediately.

**SQL migration to run in Supabase SQL Editor:**

```sql
-- Coaching delivery tracking columns on chat_analyses
ALTER TABLE chat_analyses ADD COLUMN IF NOT EXISTS coaching_delivered boolean DEFAULT false;
ALTER TABLE chat_analyses ADD COLUMN IF NOT EXISTS coaching_delivered_at timestamptz;
ALTER TABLE chat_analyses ADD COLUMN IF NOT EXISTS coaching_notes text;

-- Structured coaching points (populated by Task 2 prompt update)
ALTER TABLE chat_analyses ADD COLUMN IF NOT EXISTS coaching_points jsonb DEFAULT '[]'::jsonb;

-- Per-org auto-mark setting
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS auto_mark_coaching_delivered boolean DEFAULT true;

-- Follow-through assessment table (populated by Task 5)
CREATE TABLE IF NOT EXISTS coaching_followthrough (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  agent_name text NOT NULL,
  source_analysis_id uuid NOT NULL REFERENCES chat_analyses(id) ON DELETE CASCADE,
  source_coaching_point_id text NOT NULL,
  detected_in_analysis_id uuid NOT NULL REFERENCES chat_analyses(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('followed_through', 'repeated', 'no_opportunity')),
  evidence text,
  manager_override text CHECK (manager_override IS NULL OR manager_override IN ('followed_through', 'repeated', 'no_opportunity')),
  created_at timestamptz DEFAULT now(),
  UNIQUE (source_analysis_id, source_coaching_point_id, detected_in_analysis_id)
);

-- RLS on the new table
ALTER TABLE coaching_followthrough ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coaching_followthrough_org_isolation" ON coaching_followthrough
  FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM organization_memberships WHERE user_id = auth.uid()
  ));

-- Index for fast lookups by agent + org + date
CREATE INDEX IF NOT EXISTS idx_coaching_followthrough_org_agent
  ON coaching_followthrough(organization_id, agent_name, created_at DESC);
```

**Create:** `src/app/api/update-coaching-delivery/route.ts`

A POST endpoint that:
- Accepts JSON body: `{ analysis_id: string, delivered: boolean, notes?: string, source: 'auto' | 'manual' }`
- Verifies the user is authenticated
- Verifies the analysis belongs to the user's organization (resolve org via `currentOrganization.ts`)
- If `source === 'auto'`, fetch the org's `auto_mark_coaching_delivered` setting first. If false, return `{ success: true, skipped: true }` and do nothing. If true, proceed.
- If `source === 'manual'`, always proceed (manual saves bypass the auto-check setting).
- Updates `chat_analyses` row with: `coaching_delivered`, `coaching_delivered_at` (set to now() when delivered=true, null when delivered=false), `coaching_notes` (only if provided)
- Returns JSON: `{ success: true }` or `{ error: string }` with appropriate status codes
- Wraps DB call in try/catch
- NEVER logs PII

**Edit:** `src/components/CopyButton.tsx`

Read the full file first. Then:
- After successful clipboard copy, fire a silent fetch POST to `/api/update-coaching-delivery` with `{ analysis_id, delivered: true, source: 'auto' }`
- The `analysis_id` needs to be passed as a prop to CopyButton — check the parent (`src/app/analysis/[id]/page.tsx`) and add the prop where CopyButton is used
- The fetch is fire-and-forget. Wrap in try/catch so a failed call doesn't break the copy action.
- Do NOT change the existing copy behavior or UI — this is purely additive.

**Test:**
1. Run the SQL migration in Supabase. Verify all columns and the new table exist.
2. Open an analysis page. Click Copy Message.
3. Check the `chat_analyses` row in Supabase — `coaching_delivered` should be true, `coaching_delivered_at` should have a timestamp.
4. Verify the existing copy-to-clipboard still works visually (toast/check mark).
5. Verify nothing breaks if the user is logged out.

**Files modified:** Approximately 2 (CopyButton.tsx, analysis page) + 1 created (API route).

**Commit:** `git commit -m "Phase 2 Task 1: Coaching delivery schema, follow-through table, Copy auto-check"`

---

### PHASE 2 TASK 2: Prompt update for structured coaching points
STATUS: ✅ DONE

**Why this is second:** The follow-through detection in Task 5 needs structured coaching points to compare against. This task updates both analysis routes to output the new `coaching_points` array. No UI changes yet — this is purely a data layer change. Existing `copy_coaching_message` stays untouched (managers still copy the same message; coaching_points is additive structured data).

**Edit:** `src/app/api/process-jobs/route.ts` AND `src/app/api/reanalyze-analysis/route.ts`

Read the full file of each first. Both routes have the same OpenAI system prompt and JSON schema — apply the same change to both.

**Add to the system prompt (in the section that defines required output fields):**

```
COACHING POINTS — STRUCTURED OUTPUT

In addition to the existing copy_coaching_message, output a coaching_points array. Each point captures one specific behavioral instruction that can be checked against the agent's future chats.

Rules:
- Output 1 to 3 coaching points per chat. Quality over quantity.
- For abandoned chats (per existing rule), output an empty array: []
- For chats where coaching is genuinely "no improvement needed," output an empty array.
- Each point must be a discrete, observable behavior — not a generic tag.

Each coaching_point must have this shape:
{
  "id": "<a short kebab-case slug unique within this chat, e.g. 'acknowledge-frustration-before-logistics'>",
  "area": "<one of the existing improvement_areas tags, e.g. 'empathy', 'response_time', 'product_knowledge'>",
  "specific_behavior": "<one sentence describing exactly what the agent did in this chat that needs change. Reference the actual situation. Example: 'When the customer expressed frustration about the refund delay, the agent immediately explained the 5-7 day processing timeline without acknowledging the frustration.'>",
  "recommended_behavior": "<one sentence describing what the agent should do instead, in concrete terms the agent can apply in future chats. Example: 'Acknowledge the frustration first (\"I understand how frustrating this delay is\") before explaining the processing timeline.'>"
}

The specific_behavior must be precise enough that, given a different chat transcript later, you could check whether the agent did the same thing again or applied the recommended behavior.
```

**Update the JSON schema** the AI is instructed to return so it includes `coaching_points` as a required field (existing fields stay unchanged).

**Update the response handling code** in both routes to:
- Parse `coaching_points` from the AI response
- Validate it's an array, default to `[]` if missing or invalid
- Validate each point has the required fields, drop malformed entries silently
- Save to `chat_analyses.coaching_points` column (jsonb)

Do NOT touch any other prompt logic. Do NOT remove or change the existing `copy_coaching_message` generation.

**Test:**
1. Run a fresh analysis on a real chat that has coaching points.
2. Check the `chat_analyses` row — `coaching_points` should be an array of 1-3 structured objects with all four fields populated.
3. Check that `copy_coaching_message` is still generated identically to before.
4. Re-analyze a chat using the per-chat re-analyze button. Verify it also populates `coaching_points`.
5. Test on an abandoned chat — `coaching_points` should be `[]`.

**Files modified:** 2 (`src/app/api/process-jobs/route.ts`, `src/app/api/reanalyze-analysis/route.ts`)

**Commit:** `git commit -m "Phase 2 Task 2: AI prompt outputs structured coaching_points alongside copy_coaching_message"`

---

### PHASE 2 TASK 3: Manual delivery toggle + coaching notes on analysis page
STATUS: ✅ DONE

**Why this is third:** Managers who don't use the Copy button (e.g. they coach verbally or use their own template) need a way to manually mark coaching as delivered, and a place to add notes about what they actually said.

**Edit:** `src/app/analysis/[id]/page.tsx`

Read the full file first. Add a new section near the existing coaching message area:

- A checkbox or toggle labeled "Coaching delivered" — bound to `coaching_delivered` from the analysis row
- A timestamp display: "Delivered on [date]" if `coaching_delivered_at` is set
- A textarea labeled "Coaching notes (optional)" — bound to `coaching_notes`
- A "Save" button that POSTs to `/api/update-coaching-delivery` with `{ analysis_id, delivered, notes, source: 'manual' }`
- After save, show a brief confirmation ("Saved")
- Match existing dark theme styling

**Test:**
1. Open an analysis page. Toggle "Coaching delivered" on. Click Save. Reload page — toggle stays on, timestamp shows.
2. Add notes. Click Save. Reload — notes persist.
3. Toggle off. Save. Verify `coaching_delivered_at` is null in DB.
4. Verify the auto-check from Task 1 still works alongside this manual control.

**Files modified:** 1 (`src/app/analysis/[id]/page.tsx`)

**Commit:** `git commit -m "Phase 2 Task 3: Manual coaching delivery toggle and notes on analysis page"`

---

### PHASE 2 TASK 4: Settings toggle for auto-check behavior
STATUS: ✅ DONE

Completed: Settings page toggle wired to `organizations.auto_mark_coaching_delivered`; existing auto-mark API no-op behavior handles the backend.

**Why this is fourth:** Some managers want full manual control. This adds a per-org setting to disable the Copy auto-check from Task 1.

**Edit:** `src/app/settings/page.tsx` (or `src/app/dashboard/settings/page.tsx` — read both, find the actual settings page)

Read the full file first. Add a new toggle section:

- Section heading: "Coaching Tracking"
- A toggle labeled "Automatically mark coaching as delivered when I click Copy Message"
- Help text: "When enabled, clicking the Copy Message button on an analysis will mark coaching as delivered. Disable this if you prefer to manually toggle the delivered status yourself."
- Bound to `organizations.auto_mark_coaching_delivered`
- Save button that updates the org row via the existing settings save mechanism (do not invent a new save flow — use whatever pattern the existing coaching context settings use)
- Match existing styling

The API route from Task 1 already checks this setting when `source === 'auto'`, so no API changes needed here.

**Test:**
1. Open settings. Verify the new toggle appears, defaulted to ON.
2. Toggle it OFF. Save.
3. Open an analysis. Click Copy Message. Verify `coaching_delivered` does NOT change in DB.
4. Use the manual toggle from Task 3 — verify it still works.
5. Toggle setting back ON. Click Copy. Verify auto-mark works again.

**Files modified:** 1 (settings page)

**Commit:** `git commit -m "Phase 2 Task 4: Settings toggle for coaching delivery auto-check"`

---

### PHASE 2 TASK 5: Follow-through detection at analysis time
STATUS: ✅ DONE

**Why this is fifth:** With Tasks 1–4 done, structured coaching points are being generated and delivery is being tracked. Task 5 closes the loop — when analyzing a new chat, the AI checks whether previously-delivered coaching points recurred.

**Add to `src/lib/planAccess.ts`** (read the file first):

A constant export defining the lookback windows per plan:

```typescript
export const COACHING_FOLLOWTHROUGH_WINDOW_DAYS = {
  starter: 30,
  professional: 90,
  enterprise: 365,
} as const;

export function getFollowthroughWindowDays(plan: string): number {
  if (plan === 'professional') return 90;
  if (plan === 'enterprise') return 365;
  return 30; // starter and trial
}
```

Trial users get the Starter window (30 days) — they upgrade to unlock more.

**Edit:** `src/app/api/process-jobs/route.ts` AND `src/app/api/reanalyze-analysis/route.ts`

Read the full file of each first. Both routes need the same change.

Before the OpenAI call, after the agent name is identified:

1. Fetch the org's plan from `organizations` table (or accept it from a cached value if already loaded).
2. Use `getFollowthroughWindowDays(plan)` to get the lookback window.
3. Query `chat_analyses` for previously-delivered coaching points for this agent within the window:
   ```
   SELECT id, coaching_points, created_at
   FROM chat_analyses
   WHERE organization_id = $org
     AND agent_name = $agent
     AND coaching_delivered = true
     AND excluded = false
     AND created_at >= now() - interval '<window> days'
     AND id != <current analysis id>
   ORDER BY created_at DESC
   LIMIT 15
   ```
   The `LIMIT 15` is a safety cap — even on Enterprise, more than 15 historical coaching events is too much prompt context.
4. Flatten all `coaching_points` arrays into a single list with `{point_id, source_analysis_id, source_date, area, specific_behavior, recommended_behavior}`.

**Add to the system prompt** (only when there are previously-delivered points to check):

```
PREVIOUSLY DELIVERED COACHING — FOLLOW-THROUGH CHECK

This agent has been coached on the following specific behaviors in earlier chats. For each one, check whether the current chat shows:
- followed_through: the agent applied the recommended behavior (or the situation arose and the agent handled it correctly)
- repeated: the agent did the same thing the original coaching said NOT to do
- no_opportunity: the situation that the coaching applies to did not arise in this chat

Output a coaching_followthrough array. Each entry must have shape:
{
  "point_id": "<the original point_id>",
  "source_analysis_id": "<the source analysis id>",
  "status": "followed_through" | "repeated" | "no_opportunity",
  "evidence": "<one short sentence quoting or describing what in the current chat supports this status; for no_opportunity, briefly state why the situation didn't arise>"
}

Be honest. If the situation didn't arise, say no_opportunity — do not invent follow-through.

Previously delivered coaching points to check:
<list of {point_id, source_date, area, specific_behavior, recommended_behavior}>
```

**Update the JSON schema** to include `coaching_followthrough` as an optional array (empty array when no prior coaching exists).

**Process the AI response:**
- Parse `coaching_followthrough` from the response
- For each entry, validate `point_id` matches one of the points sent in
- Insert one row into `coaching_followthrough` table per valid entry, with the current analysis as `detected_in_analysis_id`
- Use `ON CONFLICT DO NOTHING` (or check for existing row first) to handle re-analyze idempotency

**Edit:** `src/app/analysis/[id]/page.tsx`

Read the full file first. Add a new "Previous Coaching Follow-Through" section, shown only if there are `coaching_followthrough` rows referencing this analysis as `detected_in_analysis_id`.

For each entry:
- Show the original specific_behavior + recommended_behavior + source date
- Show the AI's status (color-coded: green = followed_through, amber = repeated, gray = no_opportunity)
- Show the evidence quote
- Provide a manager override dropdown — manager can change status. On change, POST to a new helper endpoint that updates the `manager_override` column in `coaching_followthrough`.

**Create:** `src/app/api/update-followthrough-override/route.ts`

A POST endpoint that:
- Accepts `{ followthrough_id, override: 'followed_through' | 'repeated' | 'no_opportunity' | null }`
- Verifies auth + org scope
- Updates `coaching_followthrough.manager_override`
- Returns success/error

**Test:**
1. Find an agent with at least one delivered coaching point from a recent chat.
2. Upload and analyze a new chat for that same agent.
3. After analysis completes, open the new analysis page.
4. Verify a "Previous Coaching Follow-Through" section shows the prior point with a status.
5. Verify the `coaching_followthrough` table has the new row.
6. Use the manager override dropdown — verify the override saves.
7. Test on a Starter plan org — verify only last 30 days of coaching is included.
8. Verify analysis still completes if the agent has no prior delivered coaching (empty followthrough is fine).

**Files modified:** 4 (`src/lib/planAccess.ts`, `src/app/api/process-jobs/route.ts`, `src/app/api/reanalyze-analysis/route.ts`, `src/app/analysis/[id]/page.tsx`) + 3 created (`src/lib/coachingFollowthroughFetch.ts`, `src/app/api/update-followthrough-override/route.ts`, `src/components/FollowthroughOverrideSelect.tsx`)

**Commit:** `git commit -m "Phase 2 Task 5: Follow-through detection at analysis time with manager override"`

---

### PHASE 2 TASK 6: Agent page — coaching history, follow-through scorecard, repeat detection with auto-generated follow-up message
STATUS: ⏳ IN PROGRESS — Task 6a DONE (May 2, 2026, commit `bb04b7e`), Task 6b pending

Task 6a complete: agent page scorecard (Section A) and repeated coaching cards with templated
follow-up message copy button (Section B) are implemented. Task 6b remains pending: coaching
history view (Section C).

> ⚠️ **READ THIS BEFORE BUILDING 6b — THE SPEC BELOW IS NOT THE AS-BUILT CODE.**
> The helper names and shapes written in this task were the design intent. What actually shipped
> differs. The AS-BUILT column is authoritative — do not "fix" the code to match the spec.
>
> | Spec says | Actually shipped |
> |---|---|
> | `getAgentFollowthroughScorecard(supabase, orgId, agent, windowDays)` | `getAgentScorecard(organizationId, agentName, windowDays)` — no `supabase` arg, the module builds its own service-role client |
> | returns `{coached, followed, repeated, no_opportunity}` | returns `{followed_through, repeated, no_opportunity, total, followthrough_rate}` — no `coached` field |
> | `getAgentRepeatedCoachings(...)` | `getRepeatedCoachingForAgent(organizationId, agentName, windowDays)` |
> | `buildFollowupCoachingMessage()` exported from `src/lib/coachingFollowthrough.ts`, template constants exported at top of file | template is inline in `handleCopy()` inside `src/components/FollowupMessageButton.tsx`; no exported constants exist |
> | `getAgentCoachingHistory(...)` | **not built — this is Task 6b** |
>
> When building 6b, add `getAgentCoachingHistory(organizationId, agentName, windowDays)` to
> `src/lib/coachingFollowthrough.ts` following the AS-BUILT convention (positional args, no
> supabase parameter, service-role client from the module, try/catch returning `[]` on error) —
> NOT the `(supabase, ...)` signature written below.
>
> Sections A and B are already on the page. Task 6b adds Section C only. The window-selector
> dropdown described in Section A below is currently NOT a dropdown — the page derives a single
> `windowDays` from `getFollowthroughWindowDays(orgRow?.plan)` with no user-facing selector. If a
> selector is wanted, that is a separate scoped change, not part of 6b.

**Why this is last:** This is the payoff. With all upstream data flowing (delivery, structured points, follow-through assessments), the agent page becomes the single place a manager goes to see the longitudinal picture and grab pre-written follow-up coaching messages.

**Create:** `src/lib/coachingFollowthrough.ts`

Server-side helper exporting:

```typescript
export async function getAgentCoachingHistory(supabase, organizationId, agentName) {
  // Returns chronological list of analyses with coaching_points, delivered status, dates
}

export async function getAgentFollowthroughScorecard(supabase, organizationId, agentName, windowDays) {
  // Returns { coached: number, followed: number, repeated: number, no_opportunity: number }
  // Uses coaching_followthrough rows joined with chat_analyses to count
  // Manager overrides take precedence over AI status
}

export async function getAgentRepeatedCoachings(supabase, organizationId, agentName, windowDays) {
  // Returns array of repeat events:
  // { source_point: {...}, source_analysis_id, source_date, detected_in_analysis_id, detected_date, evidence }
  // One entry per (source_coaching_point, detected_in_analysis) pair where final status (override or AI) is 'repeated'
}

export function buildFollowupCoachingMessage(repeat: RepeatEvent, agentName: string): string {
  // Returns a templated coaching script ready to paste
  // Format:
  // "On <source_date>, I coached you that <recommended_behavior>.
  //  Looking at your chat from <detected_date>, I noticed the same pattern came up again — <evidence>.
  //  What's blocking you from applying the new approach? Let's work through it."
}
```

The threshold and template strings should be exported as constants at the top of the file so they can be tuned without rewriting logic.

**Edit:** `src/app/dashboard/agent/[name]/page.tsx`

Read the full file first. Add three new sections, in this order, above existing content (or as tabs — match what the page already does):

**Section A: Follow-Through Scorecard**
- Window selector dropdown — options gated by plan:
  - Starter: dropdown disabled, shows "30 days" (no other options)
  - Professional: 30 days / 90 days (default 90)
  - Enterprise: 30 days / 90 days / All time (up to 365 days) (default 365)
- Stat cards: Coached (N), Followed Through (N), Repeated (N), No Opportunity (N)
- Visual: green/amber/gray colored cards
- Use `getAgentFollowthroughScorecard()` helper

**Section B: Repeated Coaching**
- Lists every repeat event in the selected window using `getAgentRepeatedCoachings()`
- Each row card shows:
  - "⚠️ Repeated coaching"
  - Original coaching point (specific_behavior + recommended_behavior + source date with link to source analysis)
  - Repeated in: detected_date with link to detected analysis
  - Evidence quote
  - Two buttons:
    - **"Copy follow-up message"** — uses `buildFollowupCoachingMessage()` to put a pre-written script on the clipboard. Same UX as existing CopyButton (brief checkmark/toast).
    - "View original chat" — link to source analysis page
- If no repeats in window, show empty state: "No repeated coaching detected in this window."

**Section C: Coaching History**
- Chronological list (newest first) of all analyses for this agent within the selected window
- Filter: `excluded = false`, `organization_id = $org`, `agent_name = $name`
- Each row shows: date, link to analysis, improvement areas / coaching point areas, scores at time, delivered status (green check / gray dash), delivery date if delivered
- Use `getAgentCoachingHistory()` helper

**Test:**
1. Pick an agent with at least 2-3 analyzed chats and at least one delivered coaching point.
2. Upload a new chat for that agent that triggers a repeat detection (Task 5 should populate it).
3. Open the agent page.
4. Verify scorecard shows correct counts.
5. Verify Repeated Coaching section shows the repeat with both buttons.
6. Click "Copy follow-up message" — verify a complete coaching script is in the clipboard.
7. Paste it into a text editor and verify it reads naturally with all fields filled in.
8. Switch the window dropdown (if Pro/Enterprise) — verify counts and lists update.
9. On a Starter plan, verify dropdown is disabled at 30 days.
10. Verify excluded chats are filtered out.

**Files modified:** 1 (`src/app/dashboard/agent/[name]/page.tsx`) + 1 created (`src/lib/coachingFollowthrough.ts`)

**Commit:** `git commit -m "Phase 2 Task 6: Agent page coaching scorecard, repeated coaching with auto-generated follow-up message"`

---

## PHASE 3 TASKS — AUGUST 2026 BUG FIXES AND HARDENING

Approved by owner August 26, 2026 from the production feedback list. Build in order.

### PHASE 3 TASK 1: Strengthen Rule 8 — never coach on message appearance
STATUS: ✅ DONE (Aug 26, 2026) — as-built: Rule 8 forbiddance bullet + new factual-accuracy rule 9 ("Never Coach on Message Appearance") in BOTH `src/app/api/process-jobs/route.ts` and `src/app/api/reanalyze-analysis/route.ts`. Owner test pending: re-analyze Muibat chat #221584.

**Bug:** Production false coaching on Muibat chat #221584 — agent used the platform reply/quote
feature, PDF export flattened it, AI coached the agent for "malformed or misattributed text".
Rule 8 says "don't coach on quoted content" but never forbids coaching on the message's
APPEARANCE — the loophole the false coaching came through.

**Edit BOTH** `src/app/api/process-jobs/route.ts` AND `src/app/api/reanalyze-analysis/route.ts`
(duplicate prompts — both-routes rule):
1. Append to Rule 8 (Misattributed Messages and Reply/Quote Detection): when quoted/replied-to
   customer text is detected inside an agent message, treat the entire message as quote + original
   response; do NOT coach on the message looking confusing, malformed, or misattributed; do NOT
   mention the appearance in any coaching field; the PDF export commonly flattens reply structures
   and this is a known artifact, not an agent error.
2. Add new rule 9 "Never Coach on Message Appearance" to the FACTUAL ACCURACY RULES: coach only
   on content the agent actually authored, never on how a message looks; garbled/quoted/unusually
   structured messages are assumed export artifacts and silently ignored.

Prompt-only. Do NOT modify parseTranscriptMessages or buildStructuredTranscript.

**Test (owner):** Re-analyze Muibat chat #221584 (`SELECT id FROM chat_analyses WHERE file_name LIKE '%221584%';`)
— malformed-text coaching point gone. Spot-check 3-5 other re-analyses — legitimate coaching
(empathy, ownership, response time) unchanged. Only affects new/re-analyzed chats.

**Commit:** `Phase 3 Task 1: Rule 8 — never coach on message appearance (both workers)`

---

### PHASE 3 TASK 2: Upload — sequential file selection appends instead of replacing
STATUS: ✅ DONE (Aug 26, 2026) — as-built in `src/app/upload/page.tsx`: `processFileList` appends with name+size dedupe, `handleFileSelect` resets `event.target.value`, "Add more files" label, pluralization fixed on touched strings.

**Bug (corrects the older KNOWN ISSUES guess):** the file input HAS `multiple`; the real defects:
`processFileList` REPLACES `selectedFiles` (second pick discards the first), and the input value
is never reset so re-picking the same file doesn't fire `onChange`.

**Edit:** `src/app/upload/page.tsx` — append + dedupe (name+size) in `processFileList`; reset
`event.target.value` in `handleFileSelect`; rename "Choose different files" to "Add more files";
correct pluralization on the touched strings (rule 31). Cancel button already clears selection.

**Test (owner):** pick file A, then pick file B via Add more files → both listed. Pick A again → no
duplicate. Drag-drop a third → appended. Cancel clears. Upload processes all selected.

**Commit:** `Phase 3 Task 2: Upload selection appends across multiple picks`

---

### PHASE 3 TASK 3: Upload — job status polls to completion
STATUS: ✅ DONE (Aug 26, 2026) — as-built in `src/app/upload/page.tsx`: `loadRecentJobs(options?: { silent?: boolean })` + a 5-second polling `useEffect` over `recentJobs`; the Refresh button's onClick wrapped so the options param doesn't receive the MouseEvent.

**Bug:** `loadRecentJobs()` runs once right after the worker is triggered; a job shown "processing"
never flips to "completed" without manual refresh.

**Edit:** `src/app/upload/page.tsx` — add a polling effect: while any visible job is
pending/processing, silently re-fetch job status every 5 seconds (no loading flash); stop when
none are active.

**Test (owner):** upload a PDF, wait on the page — status badge flips to COMPLETED without refresh.

**Commit:** `Phase 3 Task 3: Poll job status on upload page until completion`

---

### PHASE 3 TASK 4: Repeat-coaching diagnosis + test-org window fix (SQL, owner-run)
STATUS: ⏳ WAITING ON OWNER — diagnosis + window-fix SQL blocks are in context.md ("REPEAT-COACHING DIAGNOSIS"); run in Supabase SQL Editor

**Diagnosis:** follow-through detection requires prior coaching that is delivered=true, same exact
agent_name, non-excluded, AND within the plan lookback window — the test org is plan='trial' →
30 days. Coaching history is from ~May 2026; any upload today finds ZERO qualifying prior points.
Detection also only runs at analysis time — historical chats are never retro-assessed.

**Read-only diagnosis SQL** (org `8e71dc46-e674-4131-8709-506223a35d7e`) — see context.md
"REPEAT-COACHING DIAGNOSIS" for the four queries (delivered points per agent, points within
window, followthrough rows by status, agent-name spellings).

**Window fix SQL:** setting `organizations.plan='enterprise'` ALONE locks the org out (middleware:
non-trial plan + no subscription row = locked). The fix pairs the plan change with a synthetic
active subscription row — SQL block in context.md. Revert SQL provided alongside.

**Test (owner):** after SQL, dashboard still loads (not locked out); upload a new chat for a
previously-coached agent → "Previous Coaching Follow-Through" appears on the new analysis.

---

### PHASE 3 TASK 5: Analysis page — follow-through section above coaching + repeat counter
STATUS: ✅ DONE (Aug 26, 2026) — as-built in `src/app/analysis/[id]/page.tsx`: follow-through block (both branches) moved above `CoachingMessageSection`; `repeatCounts` Map built from a `coaching_followthrough` history query; `formatOrdinal()` helper; encouraging amber line on repeated cards when the count reaches 2+.

Owner decision August 26, 2026: repeat coaching is a filter on how coaching gets delivered, so it
must be seen FIRST. This deliberately reverses the May 1, 2026 Task 5 polish decision that placed
follow-through below the coaching message.

**Edit:** `src/app/analysis/[id]/page.tsx`:
1. Move the "Previous Coaching Follow-Through" block (both branches, incl. the evaluated-no-action
   note) ABOVE the Coaching message section.
2. For each row whose final status is `repeated`, count prior `repeated` detections of the same
   source coaching point (same org, `created_at <=` this row's) and show an encouraging ordinal
   line when count >= 2, e.g. "This is the second time this has come up since coaching — worth a
   focused follow-up conversation." Supportive phrasing, never punitive.

**Test (owner):** open an analysis with follow-through rows → section renders above Coaching;
a point repeated twice shows "second time" line; no_opportunity rows still hidden; override
dropdown still works.

**Commit:** `Phase 3 Task 5: Follow-through section first + encouraging repeat counter`

---

### PHASE 3 TASK 6: Product Issues rollup page
STATUS: ✅ DONE (Aug 26, 2026) — as-built: `src/app/dashboard/product-issues/page.tsx` (default export `ProductIssuesPage`; helpers `formatLabel`, `getRiskClasses`, `formatDate`, `getRangeCutoffIso`); one "Product Issues" link added to the dashboard filter action row.

Consolidates 1-star drivers that are NOT the agent's fault (bugs, glitches, product limitations)
for the product team. Uses data that already exists: `product_limitation_chat = true`.

**Create:** `src/app/dashboard/product-issues/page.tsx` — auth + org resolution like the analysis
page; query `chat_analyses` (org filter + `.eq('excluded', false)`) where
`product_limitation_chat = true`; group by `chat_type`, sorted by count desc; each group lists
date, agent, customer, issue_summary, churn risk badge, link to the analysis. Range filter 30/90/all.

**Edit:** `src/app/dashboard/page.tsx` — add ONE "Product Issues" link in the filter action row
next to "Generate Coaching Report". No other dashboard changes (protected file).

**Test (owner):** /dashboard/product-issues lists only product-limitation chats for the org;
excluded chats absent; counts match a manual Supabase check.

**Commit:** `Phase 3 Task 6: Product Issues rollup page`

---

### PHASE 3 TASK 7: Scale readiness — atomic job claim
STATUS: ✅ DONE (Aug 26, 2026) — as-built in `src/app/api/process-jobs/route.ts` GET: conditional pending→processing claim via `.update().eq("id", job.id).eq("status", "pending").select().maybeSingle()`; losing invocations return `{ message: "Job claimed by another worker" }`. Crash-resume of processing jobs unchanged. Backlog table below remains open.

**Edit:** `src/app/api/process-jobs/route.ts` — the job-level claim is check-then-set (two
concurrent invocations both proceed). Make claiming a PENDING job atomic: conditional
`update({status:'processing'}).eq('id', job.id).eq('status','pending').select().maybeSingle()`;
if no row comes back, another worker won — return `{ message: "Job claimed by another worker" }`.
Jobs already in `processing` are still picked up (crash-resume behavior preserved); the EXISTING
per-item atomic claim remains the guard for concurrent workers on the same processing job.

**Test (owner):** upload a job, rapidly click Process Now twice / two tabs — job completes once,
no duplicate analyses, second invocation returns the claimed message.

**Commit:** `Phase 3 Task 7: Atomic job claim in process-jobs`

**SCALE READINESS BACKLOG (documented, build before external launch):**
| Item | Risk today | Fix when scheduled |
|---|---|---|
| `processed_files` counter races under concurrent workers on one job | Progress % may miscount; cosmetic | Recompute count from completed items instead of local counter |
| No cron — worker only runs when a browser triggers it | Stuck pending jobs if trigger fetch fails and user leaves | Vercel cron hitting /api/process-jobs every few minutes (needs vercel.json — owner decision, changes "no cron" design) |
| /api/process-jobs is unauthenticated GET doing expensive OpenAI work | Anyone can burn OpenAI spend by hammering it | Require a shared secret header or auth check |
| One job per invocation, items sequential | 1000 orgs uploading = long queue latency | Per-org fairness / parallel item processing within Vercel time limits |
| OpenAI rate limits / Vercel function timeout on huge jobs | Items fail mid-job (item claim makes this recoverable) | Batch-size cap per invocation + retry pass |

---

### PHASE 3 TASK 8: Docs anti-drift guardrails
STATUS: ✅ DONE (Aug 26, 2026) — as-built: rules.md rule 38 (new Documentation section); `.githooks/pre-push` warn-only hook; `.gitattributes` pins LF for hooks; `core.hooksPath=.githooks` set locally on the owner machine (per-machine step, documented in rule 38).

1. **Edit:** `docs/rules.md` — add rule 38 (Documentation): when marking a task DONE in any doc,
   record the AS-BUILT file paths and exported function names copied from the code, never the
   spec's proposed names. (The Task 6a naming drift is the incident behind this rule.)
2. **Create:** `.githooks/pre-push` (repo root) — warn-only hook: if the pushed range changes
   `app/src` or `app/middleware.ts` without changing `app/docs`, print a drift warning (push
   still proceeds). Activate locally with `git config core.hooksPath .githooks` (per-machine;
   documented here because git hooks don't travel with clones).

**Commit:** `Phase 3 Task 8: docs anti-drift rule + pre-push drift warning hook`

---

### PHASE 3 TASK 9: Per-agent coaching digest (on-demand, 14-day window)
STATUS: ✅ DONE (Aug 26, 2026) — as-built: `src/app/api/coaching-digest/route.ts` (GET `?agent=`, constants `DIGEST_WINDOW_DAYS = 14` / `DIGEST_CHAT_LIMIT = 10`, helpers `buildSystemPrompt`/`buildUserPrompt`, gpt-5.4 — the 9th call site); `src/components/CoachingDigestPanel.tsx` (default export `CoachingDigestPanel`, props `{ agentName }`); panel rendered after Repeated Coaching in `src/app/dashboard/agent/[name]/page.tsx`. Owner test pending (see Test below). Decisions locked August 26, 2026:
1. Trigger set: `attention_priority = 'high'` OR `churn_risk = 'high'` OR `customer_frustration_present = true` (proxy for problem chats — ratings unavailable, see blocking facts).
2. Cadence: v1 is an on-demand "Generate Coaching Digest (last 14 days)" button on the agent page — no cron dependency. Bi-weekly automation revisited when the cron decision (Task 7 backlog) lands.
3. Delivery: copy-to-clipboard, matching existing patterns.
4. Generation: ONE OpenAI call per digest (manager-clicked, cost-bounded like manager-report) — a template cannot produce the consolidated plan-of-action the owner asked for.

**Build spec:**
- **Create** `src/app/api/coaching-digest/route.ts` — GET `?agent=`; auth + org scope (update-coaching-delivery pattern); query `chat_analyses` org + exact agent + `.eq('excluded', false)` + last 14 days + the trigger-set `.or()` filter, newest first, LIMIT 10; one `gpt-5.4` call (9th call site); system prompt demands: supportive manager tone, consolidate duplicate themes (never "you were wrong in 3 places"), note repeat patterns encouragingly, exactly 3 concrete plan-of-action items with example phrasing, 250-400 words, plain ASCII only, no invented facts, reference chats by date. Returns `{ digest }`.
- **Create** `src/components/CoachingDigestPanel.tsx` — client: generate button with loading state, digest rendered in a box, Copy button with Copied! state, friendly error state.
- **Edit** `src/app/dashboard/agent/[name]/page.tsx` — render the panel after the Repeated Coaching section.

**Test (owner):**
1. Open an agent page for an agent with recent problem chats → click Generate Coaching Digest → digest appears with Opening / Patterns / What to keep doing / Your plan of action / Closing sections, 3 action items, ASCII only.
2. Copy Digest → paste into a text editor → reads naturally, chats referenced by date, no invented facts.
3. Agent with NO qualifying chats in 14 days → green "nothing to digest" note, no AI call made.
4. Logged out → API returns 401, page still renders.

Every two weeks, a per-agent summary of coaching from problem chats: where they're lagging,
reminders of what was missed, and an actionable plan — doubling down on suggestive phrasing so the
agent gets a plan of action, not a "you were wrong in 3 places" list.

**Blocking facts (verified August 26, 2026):**
- "1-star rated chats" cannot be the trigger — the Zoho SalesIQ PDF export does NOT contain the
  rating or the customer's written review (verified against a real production PDF; the transcript
  ends at the agent's "please rate" message). `conversations.rating_value/rating_type` columns
  exist but are always null. Rating data would require the SalesIQ API (Section 10c direction).
- There is no cron; "every two weeks" has no scheduler to run on.

**Open decisions for the owner:**
1. Trigger set proxy: `attention_priority='high'` OR `churn_risk='high'` OR
   `customer_frustration_present=true` within the 14-day window? (Recommended.)
2. Cadence mechanism: v1 as an on-demand "Coaching digest (last 14 days)" button on the agent page
   (no cron needed), vs waiting for the cron decision in Task 7's backlog?
3. Delivery: copy-to-clipboard (matches existing patterns) vs email later?
4. Generation: template from existing coaching_points/followthrough data (free) vs one AI call per
   digest (better prose, ~manager-report cost)?

---

### PHASE 3 TASK 10: Fix first-pass agent guess — read Operator from the PDF header
STATUS: ⏳ APPROVED (root cause confirmed by owner-run diagnosis SQL, August 26, 2026)

**Bug (supersedes the window-only diagnosis of Task 4):** `process-jobs` guesses the agent BEFORE
the AI call as the FIRST unique parsed sender, and Zoho transcripts open with the
"Contractor Foreman Support" bot greeting — so `fetchPriorDeliveredCoachingPoints` is queried for
the BOT (or the customer), finds nothing, and the follow-through prompt section is silently
omitted on nearly every upload. Evidence: diagnosis Query 1 shows delivered coaching through
Aug 25-26 (well inside every window), yet Query 3 shows only 11 follow-through rows ever —
traceable to May re-analyze tests (`reanalyze-analysis` uses the STORED agent_name and is
unaffected).

**Edit:** `src/app/api/process-jobs/route.ts` ONLY (reanalyze unaffected):
- Add `extractOperatorNameFromHeader(transcriptText)` — reads the SalesIQ header region (text
  before "Chat Duration :") for `Operator: <name>`, using the multi-space separator first and a
  known-next-field fallback; validates length/word-count/no-URL.
- `earlyAgentGuess` becomes: operator name from header, falling back to the existing
  first-unique-sender heuristic when the header has no Operator line.
- Downstream use unchanged (prior-coaching fetch + followthrough row agent_name).

Scope guard: do NOT modify `parseTranscriptMessages` or `buildStructuredTranscript` — the
extraction reads the RAW transcript text separately.

**Test (owner):** upload a genuinely new chat for an agent with recent delivered coaching →
"Previous Coaching Follow-Through" appears at the top of the new analysis; new
`coaching_followthrough` rows carry the real agent name, never "Contractor Foreman Support".

**Commit:** `Phase 3 Task 10: derive first-pass agent guess from the Operator header field`

---

## DEFERRED / REJECTED (August 26, 2026 triage — recorded so they aren't re-proposed blind)

- **Per-chat context box for re-analysis** (manager observations, agent's side): sound design,
  DEFERRED by owner as expensive. Natural insertion point when revived: optional textarea on the
  analysis page injected into the reanalyze prompt like coaching_context.
- **Rating-aware coaching**: impossible from PDF export (verified — rating not present). Requires
  SalesIQ API integration. Deferred until API direction (Section 10c) is picked up.
- **KB-as-lens chatbot** and **Master-database Q&A with KB lens + duplicate check**: not this
  product/repo — belong to the KB-owning system.
- **Supabase free-project keep-alive cron**: ops task outside this repo (GitHub Action or
  scheduled ping); needs the owner's list of project URLs.

## SCOPE LOCK

MVP and Phase 1 (Paddle billing, landing page, extension marketing page) are complete. Phase 2 (Coaching Effectiveness Tracker) is in progress per the task list above. Phase 3 (August 2026 bug fixes and hardening) is approved per the task list above.

The orchestration guide remains the source of truth for any future tasks. Do not build anything outside the documented task list. New tasks must be added to this file before any code is written.

UI polish, plan gating enforcement, duplicate PDF link, password change flow, self-signup improvements, agent management, and Stripe integration remain as separate work items to be scoped when their turn comes.
