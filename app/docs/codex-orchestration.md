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
- Legacy items with `status = 'done'`: Cleaned up (all now 'completed')
- Records with `source_type = 'chat_transcript'`: 0 (fully fixed)
- Total analyses: ~52 active records + ~175 from earlier batches
- RLS: ENABLED on all 7 tables

**Worker (`src/app/api/process-jobs/route.ts`):**
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
- ✅ Landing page with hero, features, pricing
- ✅ RLS policies on all tables
- ✅ Pluralization fix across all pages
- ✅ Worker trigger button ("Process Now" with states)
- ✅ Production deployment on Vercel (supportcoach.io)
- ✅ Terms of Service page (`/terms`)
- ✅ Privacy Policy page (`/privacy`)
- ✅ Refund Policy page (`/refund`)
- ✅ Customer Support page (`/support`) with address and phone
- ✅ Paddle billing account approved

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
- Enabled on all 7 tables (organizations, organization_memberships, analysis_jobs, analysis_job_items, conversations, conversation_messages, chat_analyses)
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
STATUS: ✅ Paddle APPROVED, Stripe under review
- Paddle account approved and ready for integration
- Stripe application submitted, still under review

---

## REMAINING WORK

| Item | Effort | Owner |
|---|---|---|
| Paddle billing integration (checkout, webhooks, plan gating) | 2-3 days | Next priority |
| UI design polish | 1 day – 1 week | User decision on shadcn/ui direction pending |
| Stripe billing (if approved) | Optional — Paddle is primary | Backup |

---

## SCOPE LOCK

All MVP and post-MVP tasks are complete. The app is live in production. The orchestration guide is now a reference document. Future work (Paddle integration, UI polish, API integration) will be scoped in new task lists as needed.