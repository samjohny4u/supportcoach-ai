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

**Worker (`src/app/api/process-jobs/route.ts`) and Re-Analyze (`src/app/api/reanalyze/route.ts`):**
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
- API route: `src/app/api/reanalyze/route.ts`
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

---

## REMAINING WORK

| Item | Effort | Owner |
|---|---|---|
| Dashboard UI polish (interior pages) | 1 day – 1 week | User decision on shadcn/ui direction pending |
| Plan gating enforcement | 1-2 days | Scheduled after UI polish per agreed roadmap |
| Duplicate PDF link to existing analysis (Section 8f) | 0.5 day | Approved for build post-Bangkok |
| Coaching Effectiveness Tracker (Phase 2) | 3-5 days | See Phase 2 task list below |
| Password change flow | 1 day | Phase 2, post-Bangkok |
| Self-signup improvements | 1-2 days | Phase 2, post-Bangkok |
| Agent management | 2-3 days | Phase 2, post-Bangkok |
| Stripe billing (if approved) | Optional — Paddle is primary | Backup |

---

## PHASE 2 TASKS

These tasks are scoped, designed, and approved for build. Reference Section 10k of `docs/supportcoach-ai-context.md` and the Coaching Effectiveness Tracker section in `docs/CONTEXT.md` for full design rationale.

**Architectural overview:** The Coaching Effectiveness Tracker is a 4-layer system that tracks whether coaching is being delivered, whether agents are improving, and surfaces when the same coaching points are being repeated with no improvement. Layers must be built in order — each builds on the previous.

**Build order:**
1. Phase 2 Task 1 — Database schema + auto-check on Copy
2. Phase 2 Task 2 — Manual delivery toggle + coaching notes on analysis page
3. Phase 2 Task 3 — Settings toggle for auto-check behavior
4. Phase 2 Task 4 — Coaching history view per agent
5. Phase 2 Task 5 — Repeat pattern detection + repeated coaching flag

---

### PHASE 2 TASK 1: Database schema + Copy auto-check (Layer 3 foundation)
STATUS: ⏳ NOT STARTED

**Why this is first:** Every other Phase 2 task depends on the `coaching_delivered` column existing and being populated. This task adds the column and starts populating it from the highest-intent signal (the Copy Message click).

**SQL migration to run in Supabase SQL Editor:**

```sql
ALTER TABLE chat_analyses ADD COLUMN IF NOT EXISTS coaching_delivered boolean DEFAULT false;
ALTER TABLE chat_analyses ADD COLUMN IF NOT EXISTS coaching_delivered_at timestamptz;
ALTER TABLE chat_analyses ADD COLUMN IF NOT EXISTS coaching_notes text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS auto_mark_coaching_delivered boolean DEFAULT true;
```

**Create:** `src/app/api/update-coaching-delivery/route.ts`

A POST endpoint that:
- Accepts JSON body: `{ analysis_id: string, delivered: boolean, notes?: string }`
- Verifies the user is authenticated
- Verifies the analysis belongs to the user's organization (resolve org via `currentOrganization.ts`)
- Updates `chat_analyses` row with: `coaching_delivered`, `coaching_delivered_at` (set to now() when delivered=true, null when delivered=false), `coaching_notes` (only if provided)
- Returns JSON: `{ success: true }` or `{ error: string }` with appropriate status codes
- Wraps DB call in try/catch
- NEVER logs PII

**Edit:** `src/components/CopyButton.tsx`

Read the full file first. Then:
- After successful clipboard copy, fire a silent fetch POST to `/api/update-coaching-delivery` with `{ analysis_id, delivered: true }`
- The analysis_id needs to be passed as a prop to CopyButton — check the parent (`src/app/analysis/[id]/page.tsx`) and add the prop where CopyButton is used
- Auto-check ONLY fires if the org's `auto_mark_coaching_delivered` setting is true — fetch this from the org row before firing. If you cannot resolve org client-side cleanly, fire the call always and let the API route check the org setting and silently no-op if disabled.
- The fetch is fire-and-forget (no await needed for UI). Wrap in try/catch so a failed call doesn't break the copy action.
- Do NOT change the existing copy behavior or UI — this is purely additive.

**Test:**
1. Run the SQL migration in Supabase. Verify all 4 columns exist.
2. Open an analysis page. Click Copy Message.
3. Check the `chat_analyses` row in Supabase — `coaching_delivered` should be true, `coaching_delivered_at` should have a timestamp.
4. Verify the existing copy-to-clipboard still works visually (toast/check mark).
5. Verify nothing breaks if the user is logged out (the API route should reject the call cleanly).

**Files modified:** Approximately 2 (CopyButton.tsx, analysis page) + 1 created (API route).

**Commit:** `git commit -m "Phase 2 Task 1: Coaching delivery tracking schema and Copy auto-check"`

---

### PHASE 2 TASK 2: Manual delivery toggle + coaching notes on analysis page (Layer 3 completion)
STATUS: ⏳ NOT STARTED

**Why this is second:** Managers who don't use the Copy button (e.g. they coach verbally or use their own template) need a way to manually mark coaching as delivered. They also need a place to add notes about what they actually said.

**Edit:** `src/app/analysis/[id]/page.tsx`

Read the full file first. Add a new section near the existing coaching message area:

- A checkbox or toggle labeled "Coaching delivered" — bound to `coaching_delivered` from the analysis row
- A timestamp display: "Delivered on [date]" if `coaching_delivered_at` is set
- A textarea labeled "Coaching notes (optional)" — bound to `coaching_notes`
- A "Save" button that POSTs to `/api/update-coaching-delivery` with the current toggle and notes value
- After save, show a brief confirmation ("Saved")
- Match existing dark theme styling

**Test:**
1. Open an analysis page. Toggle "Coaching delivered" on. Click Save. Reload page — toggle stays on, timestamp shows.
2. Add notes. Click Save. Reload — notes persist.
3. Toggle off. Save. Verify `coaching_delivered_at` is null in DB.
4. Verify the auto-check from Task 1 still works alongside this manual control.

**Files modified:** 1 (`src/app/analysis/[id]/page.tsx`)

**Commit:** `git commit -m "Phase 2 Task 2: Manual coaching delivery toggle and notes on analysis page"`

---

### PHASE 2 TASK 3: Settings toggle for auto-check behavior
STATUS: ⏳ NOT STARTED

**Why this is third:** Some managers want full manual control. This adds a per-org setting to disable the Copy auto-check from Task 1.

**Edit:** `src/app/settings/page.tsx` (or `src/app/dashboard/settings/page.tsx` — read both, find the actual settings page)

Read the full file first. Add a new toggle section:

- Section heading: "Coaching Tracking"
- A toggle labeled "Automatically mark coaching as delivered when I click Copy Message"
- Help text: "When enabled, clicking the Copy Message button on an analysis will mark coaching as delivered. Disable this if you prefer to manually toggle the delivered status yourself."
- Bound to `organizations.auto_mark_coaching_delivered`
- Save button that updates the org row via existing settings save mechanism (do not invent a new save flow — use whatever pattern the existing coaching context settings use)
- Match existing styling

**Edit:** `src/app/api/update-coaching-delivery/route.ts`

If you implemented Task 1 with the API checking the org setting, no change needed.
If you implemented Task 1 with the client checking the setting, ensure the API also checks it as a defense-in-depth — when `auto_mark_coaching_delivered` is false AND the request is the silent auto-fire from CopyButton (you'll need a flag to distinguish auto vs manual), the API silently no-ops with success. Manual saves from Task 2 always go through.

**Suggested approach:** Add a `source: 'auto' | 'manual'` field to the API request body. CopyButton sends `source: 'auto'`. The manual save from Task 2 sends `source: 'manual'`. The API only checks the org setting when source is 'auto'.

**Test:**
1. Open settings. Verify the new toggle appears, defaulted to ON.
2. Toggle it OFF. Save.
3. Open an analysis. Click Copy Message. Verify `coaching_delivered` does NOT change in DB.
4. Use the manual toggle from Task 2 — verify it still works.
5. Toggle setting back ON. Click Copy. Verify auto-mark works again.

**Files modified:** 2 (settings page + API route)

**Commit:** `git commit -m "Phase 2 Task 3: Settings toggle for coaching delivery auto-check"`

---

### PHASE 2 TASK 4: Coaching history view per agent (Layer 1)
STATUS: ⏳ NOT STARTED

**Why this is fourth:** With delivery tracking populated by Tasks 1–3, the agent page can now show a meaningful longitudinal view.

**Edit:** `src/app/dashboard/agent/[name]/page.tsx`

Read the full file first. Add a new "Coaching History" section (either as a tab or a section below existing content — match what the page already does).

The section shows a chronological list (newest first) of all chats analyzed for this agent, where each row displays:
- Date of analysis (`created_at`)
- Link to the chat analysis page (`/analysis/[id]`)
- The improvement areas flagged (from existing `improvement_areas` or equivalent field — read the file to see what field name is used)
- Scores at time of analysis (overall score and any sub-scores already shown elsewhere on this page)
- Coaching delivered status: green check if `coaching_delivered = true`, gray dash if false
- Delivery date if delivered

Query requirements:
- Filter by `organization_id`
- Filter by agent name
- Include `.eq('excluded', false)`
- Order by `created_at` descending
- No pagination needed for v1 — show all (we can add pagination later if needed)

**Test:**
1. Navigate to an agent page that has multiple analyzed chats.
2. Verify the Coaching History section shows all chats in chronological order.
3. Verify the delivered status reflects the actual DB state.
4. Click a row — verify it navigates to the analysis page.
5. Exclude a chat — verify it disappears from the history.

**Files modified:** 1 (`src/app/dashboard/agent/[name]/page.tsx`)

**Commit:** `git commit -m "Phase 2 Task 4: Coaching history view per agent"`

---

### PHASE 2 TASK 5: Repeat pattern detection + repeated coaching flag (Layers 2 + 4)
STATUS: ⏳ NOT STARTED

**Why this is last:** Requires data from Tasks 1–4 to be meaningful. This is the payoff — the system that surfaces "you've coached this 5 times with no improvement."

**Build a server-side helper:** `src/lib/coachingPatterns.ts`

A function `detectAgentPatterns(organizationId: string, agentName: string)` that:
- Queries all `chat_analyses` for that org + agent + `excluded = false`, ordered by `created_at` ascending
- Builds a frequency map of improvement areas across those analyses
- Returns an array of patterns where the same improvement area appears 3+ times, with shape:
  ```
  {
    area: string,
    occurrences: number,
    coached_count: number,        // how many times coaching_delivered=true on those chats
    avg_score_first_3: number,    // avg overall score on first 3 occurrences
    avg_score_last_3: number,     // avg overall score on last 3 occurrences
    no_improvement: boolean       // true if coached_count >= 3 AND last_3 not better than first_3 by margin (e.g. < 0.5 improvement)
  }
  ```
- Threshold and margin values should be exported as constants at the top of the file so they can be tuned without rewriting logic

**Edit:** `src/app/dashboard/agent/[name]/page.tsx`

Read the full file first. Above the Coaching History section from Task 4, add a "Patterns" section that:
- Calls `detectAgentPatterns()` server-side
- For each pattern returned, renders a card showing:
  - The improvement area
  - "Flagged in [N] chats over [date range]"
  - "Coaching delivered [M] of [N] times"
  - If `no_improvement` is true, show a flag: "⚠️ Repeated coaching with no measurable improvement"
- If no patterns meet the threshold, show: "No repeat patterns detected for this agent."
- Use a clear visual treatment for the no_improvement flag (e.g. amber border) — but do NOT prescribe an action. The flag is informational only.

**Test:**
1. Pick an agent with at least 3 analyses where the same improvement area appears.
2. Verify the pattern card appears with correct counts.
3. Mark coaching delivered on those analyses (use the toggle from Task 2).
4. Verify the "Coaching delivered M of N times" updates.
5. Verify the no_improvement flag appears only when the threshold conditions are met.
6. Verify an agent with no repeats shows the empty state message.

**Files modified:** 1 (`src/app/dashboard/agent/[name]/page.tsx`) + 1 created (`src/lib/coachingPatterns.ts`)

**Commit:** `git commit -m "Phase 2 Task 5: Repeat pattern detection and repeated coaching flag"`

---

## SCOPE LOCK

MVP and Phase 1 (Paddle billing, landing page, extension marketing page) are complete. Phase 2 (Coaching Effectiveness Tracker) is in progress per the task list above.

The orchestration guide remains the source of truth for any future tasks. Do not build anything outside the documented task list. New tasks must be added to this file before any code is written.

UI polish, plan gating enforcement, duplicate PDF link, password change flow, self-signup improvements, agent management, and Stripe integration remain as separate work items to be scoped when their turn comes.