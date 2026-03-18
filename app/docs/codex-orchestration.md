# SUPPORTCOACH AI — CODEX ORCHESTRATION PROMPT

## Role and Rules

You are building a SaaS product called SupportCoach AI. Read and follow the master development context at `docs/supportcoach-ai-context.md` before starting any task.

**Critical rules:**
- Rule 1a: Full file replacements only. Never partial snippets or diffs.
- Rule 1g: Do not redesign or refactor working code.
- Rule 1j: Do not suggest features, enhancements, or scope changes. Build only what is specified in this document. When a task is done, say "Done. What's next?" and stop.
- Rule 1k: Use defensive string handling: `typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback`
- All database queries must filter by `organization_id` for tenant isolation.
- All queries on `chat_analyses` must include `.eq('excluded', false)` unless the query is specifically for managing exclusions.

**Before editing any file:** Read the full current file first. Do not assume its contents.

---

## VERIFIED STATUS — What Is Actually Done

**Database:**
- `transcript_hash` column on `analysis_job_items`: EXISTS
- `excluded` column on `chat_analyses`: EXISTS
- Legacy items with `status = 'done'`: Cleaned up via SQL (all now 'completed')
- Records with `source_type = 'chat_transcript'`: 0 (fix 8c fully applied)
- Total analyses: ~52 active records + ~175 from earlier batches

**Worker (`src/app/api/process-jobs/route.ts`):**
- ✅ Idempotency check (8a) — applied
- ✅ Processing status claim (8b) — applied
- ✅ source_type fix (8c) — applied
- ✅ Item completion status (8d) — applied in worker
- ✅ Orphan line parsing (8e) — applied
- ✅ Sender misattribution fix (8h) — knownSenderNames applied
- ✅ Structured transcript pre-formatting — buildStructuredTranscript() applied
- ✅ Full coaching prompt with scoring rubric, boolean criteria, factual accuracy rules, response time thresholds
- ✅ Misattributed message detection (Rule 8 in prompt)

**Working features:**
- ✅ Upload pipeline
- ✅ Worker processing with structured transcript
- ✅ AI analysis with refined prompt
- ✅ Dashboard with filters, attention view, agent filtering, date ranges
- ✅ Topic Intelligence Dashboard (`/dashboard/topics`)
- ✅ Topic drill-down (`/dashboard/topics/[topic]`)
- ✅ Topic stats API (`/api/topic-stats`)
- ✅ Topic agent stats API (`/api/topic-agent-stats`)
- ✅ Topic coaching stats API (`/api/topic-coaching-stats`)
- ✅ Manager reports + PDF export
- ✅ CSV export
- ✅ Exclude/include from reports (toggle-exclude + ExcludeToggleButton)
- ✅ Auth flow (login, signup, onboarding, middleware)
- ✅ Job management pages
- ✅ Reclassify topics route (exists, needs to be run)

**Exists but must be REMOVED:**
- ❌ `src/app/api/manager-insights/route.ts` — duplicates existing routes, no org security, adds unnecessary AI cost
- ❌ Manager Coaching Insights panel in `src/app/dashboard/page.tsx` — powered by the above route

---

## TASK LIST — Execute In Order

### TASK 0: Remove manager-insights (cleanup)

**Delete file:** `src/app/api/manager-insights/route.ts`

**Modify file:** `src/app/dashboard/page.tsx`
Remove these items:
- `ManagerInsightsResult` type definition
- `getManagerInsights()` function
- `const managerInsights = await getManagerInsights(aiSummaryPayload);` call
- `managerInsightsTitle` variable
- The entire "Manager Coaching Insights" panel JSX block (the `<div>` containing `managerInsightsTitle` and the `managerInsights` rendering)

Do NOT touch anything else in the dashboard file. All other panels, filters, and features must remain.

**Test:** Dashboard loads without errors. No "Manager Coaching Insights" panel visible. All other panels still work.

---

### TASK 1: Run topic reclassification

This is not a code task — it's an API call. The route already exists at `/api/reclassify-topics`.

**Action:** The user will trigger this manually via browser or curl. Codex does not need to do anything here — skip to Task 2.

---

### TASK 2: Verify duplicate detection in create-analysis-job

**File:** `src/app/api/create-analysis-job/route.ts`

Read the full file. Check whether it:
1. Generates a SHA-256 hash of `transcript_text`
2. Stores the hash in `transcript_hash` on `analysis_job_items`
3. Checks for existing hash before inserting
4. Returns duplicate info to the user if match found

If all four are present and correct → skip this task, report "Already implemented."
If any are missing → implement per Section 8f of the master prompt. Provide the complete file.

**Test:**
1. Upload a PDF — job created normally.
2. Upload same PDF again — rejected with duplicate message.
3. Upload 3 PDFs where 1 is a duplicate — job created with 2 items only.

---

### TASK 3: Production hardening — Job display names (Section 9i)

**Files:** `src/app/jobs/page.tsx`, `src/app/jobs/[id]/page.tsx`

Read both files. Replace raw UUID job titles with human-readable format: "Upload — Mar 12, 2026, 5:49 PM" using the job's `created_at` timestamp.

Also verify that `src/app/jobs/[id]/page.tsx` uses `"completed"` not `"done"` for item status badges. If it still references `"done"`, fix it.

**Test:** Go to `/jobs` — job titles show dates, not UUIDs. Go to `/jobs/{id}` — items show "completed" with green badges.

---

### TASK 4: Production hardening — Worker trigger (Section 9i)

**File:** `src/components/WorkerTriggerButton.tsx`

Read the full file. Make these changes:
1. Rename button label from "Run Worker Manually" (or "Run Worker") to "Process Now"
2. Add button states:
   - Default: "Process Now" — clickable
   - While running: "Processing..." — disabled with spinner/pulse
   - After completion: "Done ✓" briefly, then reset to "Process Now"

**File:** `src/app/upload/page.tsx` OR `src/app/api/create-analysis-job/route.ts`

Add automatic worker trigger after job creation. A fire-and-forget fetch to `/api/process-jobs` after the job is successfully created. The manual button remains as a backup.

**Test:** Upload a PDF → worker triggers automatically without clicking "Process Now". Button shows "Processing..." during worker run.

---

### TASK 5: Soft delete — verify excluded filter coverage (Section 9j)

The exclude/include feature is built and working. This task verifies that ALL queries across the app respect the `excluded` flag.

**Read each of these files** and confirm they have `.eq('excluded', false)` or `.neq('excluded', true)` on `chat_analyses` queries:

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

For each file, report: "Has exclude filter" or "MISSING exclude filter."
Only modify files that are missing the filter. Provide complete file replacements for any that need fixing.

**Test:** Exclude a chat from reports. Verify it disappears from dashboard stats, topic stats, and export. Verify it still appears on its analysis detail page.

---

### TASK 6: Pattern Cards UI (Section 9h)

Read Section 9h of the master prompt carefully — specifically the "Pattern Cards" specification.

**Check:** Does `src/app/dashboard/topics/[topic]/page.tsx` already display pattern cards with template-based narratives and recommendations? If yes, verify they match the spec (agent name, topic, occurrence count, detected signals, narrative, recommendation, confidence level). Report what exists vs what's missing.

If pattern cards are not yet built or are incomplete:

**Implementation:**
- Pattern cards appear within the topic drill-down page
- Generated from existing data — no new API routes needed
- Template-based narratives per Section 9h specification
- Confidence levels: High (7+), Medium (5–6), Low (3–4)
- Severity ordering for multiple signals
- Sortable by confidence, occurrence count, agent, topic
- Minimum 3 chats per agent+topic before generating a card

**Test:** Navigate to a topic drill-down with enough data. Pattern cards should appear with agent names, signal counts, and coaching recommendations.

---

### TASK 7: Surface quick_summary and copy coaching message (Section 9b, 9c)

**Check:** Does the dashboard already show `quick_summary` on chat cards? Does the analysis detail page have a copy-to-clipboard button for `copy_coaching_message`?

Read `src/app/dashboard/page.tsx` and `src/app/analysis/[id]/page.tsx` to verify.

If `quick_summary` is already visible on chat cards in the dashboard → skip that part.
If copy-to-clipboard for coaching message is already on the analysis page → skip that part.
Only build what's missing.

**Test:** Dashboard chat cards show quick summary text. Analysis detail page has a working "Copy Coaching Message" button.

---

### TASK 8: Attention priority badges (Section 9d)

**Check:** Does the dashboard already display attention priority badges on chat cards? Read `src/app/dashboard/page.tsx` to verify.

If badges are already present → skip this task.
If missing → add color-coded priority badges (high = red, medium = yellow, low = green) to each chat card in the dashboard.

**Test:** Dashboard chat cards show colored priority badges.

---

## AFTER ALL TASKS

When all 9 tasks (0–8) are complete, the MVP feature set is functionally done. Remaining work is:
- Production deployment (Vercel)
- Landing page
- Stripe billing integration (Section 14 — not current sprint)

Do not build any of these unless the user explicitly requests them.

---

## SCOPE LOCK REMINDER

This document defines the complete task list. Do not add tasks, suggest improvements, propose refactors, or recommend "nice to have" features. Execute the tasks in order. When a task is done, say "Done. What's next?" and stop. If a task is already complete, say "Already implemented" and move to the next one.