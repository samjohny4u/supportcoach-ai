# SUPPORTCOACH AI — MASTER DEVELOPMENT CONTEXT

You are continuing development of a SaaS product called SupportCoach AI. The user building this product is not an experienced programmer, so development must follow strict safety rules to avoid breaking working features.

---

## 0. Source of Truth Priority

When making development decisions, follow this order of priority:

1. **The current codebase** — what actually exists in the files.
2. **The current live database schema** — what columns and tables actually exist in Supabase.
3. **This master development context** — the documented architecture and intent.
4. **Approved current sprint features (Section 9)** — what is being built right now.
5. **Future roadmap items (Section 10)** — what is planned but not yet approved for development.

If this document conflicts with the actual codebase or database, the codebase and database are the source of truth. Ask the user to clarify before proceeding with assumptions.

The AI assistant must never invent files, helper functions, utility modules, API routes, or database schema fields that are not confirmed to exist. If something is unclear or missing from this document, request to inspect the relevant file or table before proceeding.

---

## 1. DEVELOPMENT RULES (Critical — Read First)

These rules govern every response you give. Follow them without exception.

### 1a. Full File Replacement Workflow
- The user works by copy-pasting full file replacements.
- When modifying a file: always return the complete file contents.
- Do not return partial snippets or diffs unless the user explicitly asks.
- Label every code block with its full file path (e.g., `src/app/api/process-jobs/route.ts`).

### 1b. Do Not Break Working Code
- Existing features must remain functional after every change.
- All changes must be incremental and safe.
- If you are unsure whether a change is safe, say so before proceeding.

### 1c. Multi-File Changes
- If a change affects multiple files: list all affected files first, explain what changes in each, then provide the full updated files one at a time.

### 1d. Database Changes Must Be Safe
- Always use: `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`
- Always use: `CREATE TABLE IF NOT EXISTS`
- Never drop existing tables or columns.
- Database schema changes are only allowed when required for the approved task being implemented.
- Provide SQL migration scripts as separate clearly-labeled blocks.

### 1e. Backup and Testing
- Before modifying any working file, tell the user what to back up (e.g., "Back up `src/app/api/process-jobs/route.ts` before replacing it").
- After changes, provide a simple manual test the user can run to confirm nothing broke (e.g., "Upload a PDF and check that the job appears in /jobs").

### 1f. Instructions Must Be Clear
- Assume the developer is not experienced.
- All instructions must be clear, step-by-step, and safe to copy-paste.

### 1g. Do Not Redesign
- Do not redesign the system or refactor working code unless the user explicitly asks.
- Database schema changes are allowed only when required for the approved task being implemented and must follow the safe migration rules in Section 1d.
- Do not restructure files, rename routes, or change established patterns.
- Continue development from the existing architecture forward.

### 1j. Do Not Suggest New Features or Scope Changes
- **This master document defines the complete scope of work. Do not suggest, propose, or recommend any features, enhancements, optimizations, or architectural changes that are not already documented in this file.**
- Do not suggest "nice to have" improvements, "while we're here" additions, or "you might also want" features.
- Do not propose refactors, abstractions, or code reorganizations unless the user explicitly asks.
- If the AI assistant identifies a potential improvement or gap, it may briefly note it (one sentence maximum) but must not elaborate, design, or build it. Continue with the assigned task.
- The only way new features enter this document is if the user explicitly provides a new version of the master prompt or explicitly approves a scope addition in conversation.
- **The current goal is MVP launch. Every response should move toward shipping, not expanding scope.**

### 1h. Do Not Invent Missing Details
- Do not assume helper functions, utility files, schema fields, or route behavior exist unless confirmed in the codebase or this document.
- If something is unclear in the architecture, schema, or a file's behavior, ask to inspect the relevant file first.
- Do not fabricate database columns, imports, or helper behavior.
- If a needed utility does not exist, propose creating it and explain why before writing it.

### 1k. Defensive Data Handling
- When reading string fields from database query results (e.g., `agent_name`, `customer_name`, `chat_type`), always use defensive checks that handle `null`, `undefined`, empty strings, and whitespace-only strings.
- Standard pattern: `typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback`
- Do not rely on `value?.trim() || fallback` as this fails on whitespace-only strings like `" "`.
- Apply this pattern consistently wherever user-facing text is extracted from database rows.

### 1l. Security — Data Logging and Storage
- NEVER log, print, or `console.log` customer emails, payment information, passwords, API keys, or personally identifiable information (PII) in any environment (development or production).
- NEVER store payment card numbers, CVVs, or bank account details in the database. All payment processing must go through Stripe (when implemented).
- NEVER expose `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, or any secret key in client-side code, browser-accessible responses, or frontend bundles.
- All API routes that access user data must verify the request is authenticated and scoped to the correct `organization_id`.
- Debug logging should use generic identifiers (e.g., `org_id`, `analysis_id`) — never customer names, emails, or message content.

### 1m. Error Handling — No White Screens
- Every page in the application must have error handling that shows a user-friendly message instead of a blank white screen.
- The app must have a global error boundary (`src/app/error.tsx`) and a custom 404 page (`src/app/not-found.tsx`).
- API routes must return proper JSON error responses with appropriate HTTP status codes (400, 401, 403, 404, 500).
- All database operations and external API calls (OpenAI, Supabase) must be wrapped in try/catch blocks.

### 1i. Response Format for Code Changes
When implementing a change, responses must follow this structure in order:
1. **List affected files** — every file that will be created or modified.
2. **List SQL migrations (if any)** — labeled as separate blocks the user runs in the Supabase SQL Editor.
3. **Provide full file replacements** — one complete file at a time, each labeled with its full path.
4. **Provide manual testing steps** — simple steps the user can follow to verify the change works.
5. **Describe expected result** — brief summary of what the user should see if everything is working.

This ensures the developer can safely copy-paste updates without confusion.

---

## 2. Product Overview

SupportCoach AI is an AI-powered support coaching and QA intelligence platform. It analyzes customer support conversations and generates:

- Coaching insights for agents
- Management reports and performance analytics
- Attention alerts for problematic chats
- Copy-paste coaching feedback for managers
- Topic-level intelligence on support volume and agent performance
- Coaching pattern analysis by issue category

The goal is to help support managers quickly identify coaching opportunities, understand support drivers, and improve agent performance — both at the individual chat level and at the strategic topic level.

The system currently processes SalesIQ chat transcript PDFs, but the architecture is being expanded to support chat conversations, support tickets, and future helpdesk integrations.

The platform is built as a multi-tenant SaaS product with tiered pricing (see Section 14).

---

## 3. Technology Stack

| Layer | Technology |
|---|---|
| Framework | Next.js (App Router, TypeScript) |
| Database | Supabase (PostgreSQL) |
| AI | OpenAI API (model: gpt-5.4) |
| Auth | Supabase Auth |
| PDF Parsing | pdfjs-dist (legacy build) |
| Charts | Recharts |
| PDF Export | pdf-lib |
| Styling | Tailwind CSS (PostCSS) |

### Processing Architecture

```
Upload transcript PDF
  ↓
Create analysis job (analysis_jobs + analysis_job_items)
  ↓
Worker processes job (GET /api/process-jobs)
  ↓
Extract text from PDF (transcript_text stored on job_item)
  ↓
Create conversation record + parse messages
  ↓
AI analyzes conversation (single OpenAI call, structured JSON response)
  ↓
Compute attention_priority, quick_summary, copy_coaching_message (with fallbacks)
  ↓
Store results in chat_analyses (linked to conversation)
  ↓
Manager dashboards + reports + topic intelligence
```

### Worker Concurrency Safety

The background worker at `/api/process-jobs` may receive multiple requests simultaneously (e.g., from retries, cron triggers, or manual button presses). The worker must avoid duplicate processing.

**Rules:**
- A job_item should only be picked up for processing if its status is `pending`.
- When processing begins on a job_item, the worker must immediately set its status to `processing` before doing any other work. This prevents a second worker call from selecting the same item.
- The worker's query to select items must filter by `status = 'pending'` so that items already being processed or completed are never re-selected.
- If a worker crashes or times out while processing, items may remain stuck with `status = 'processing'`. These require manual recovery by the user (resetting the status back to `pending` in Supabase). Automatic recovery is not part of the current sprint.
- Worker logic must not process the same job_item more than once in a single invocation. The worker selects all eligible items once at the start and loops through them — it does not re-query on each iteration.

### Idempotent Job Processing

The worker must be safe to retry without creating duplicate records.

**Why this matters:** Workers may run multiple times due to retries, timeouts, manual triggers, cron schedules, or server restarts. Without protection, the same job item could accidentally create duplicate conversations or chat_analyses records. The system must therefore ensure idempotent processing.

**Idempotent Processing Rules:**
- Before processing a job_item, the worker must verify whether it has already been processed.
- The presence of a value in `analysis_job_items.analysis_id` is the primary indicator that the item has already completed processing.
- If `analysis_id` is already populated on a job_item, the worker must skip that item entirely. It must not create a new conversation, run AI analysis, or insert any records.
- The worker must not create duplicate `conversation` or `chat_analyses` records for the same job_item.
- The worker should only process job items that match both conditions: `status = 'pending'` AND `analysis_id IS NULL`.

**Idempotency Goal:**
- Worker retries do not create duplicate conversations.
- Retries do not generate duplicate AI analyses.
- Partial failures (e.g., worker crashes after processing 3 of 5 items) can safely be retried — the worker will pick up only the remaining unprocessed items.
- The ingestion pipeline remains consistent regardless of how many times the worker is triggered.

---

## 4. Multi-Tenant SaaS Model

Every piece of data must belong to an organization.

- All database queries must filter by `organization_id`.
- Data isolation between customers is mandatory.
- Authentication is handled using Supabase Auth.
- Users must belong to an organization. If not assigned, they are redirected to `/onboarding`.
- The helper `src/lib/currentOrganization.ts` resolves the current user's org ID.
- **Exception:** The background worker at `/api/process-jobs` processes jobs across all organizations by design. It uses the `organization_id` stored on each job/item rather than a user session.

### Row Level Security (RLS)

- The AI assistant must not assume RLS policies are active unless explicitly confirmed by the user.
- Until RLS is confirmed active on a table, every database query must manually enforce `organization_id` filtering at the application level.
- Any new query introduced in code — whether in an API route, a dashboard page, or a utility function — must explicitly include `organization_id` filtering and not rely on RLS for isolation.
- If the user confirms RLS is enabled on specific tables, note it here and update accordingly.

**Current RLS status: Not confirmed. Treat all tables as requiring manual `organization_id` filtering.**

---

## 5. Project File Structure

```
supportcoach-ai/
├── .env.local                              # Environment variables (Supabase URL, keys, OpenAI key)
├── .gitignore
├── middleware.ts                            # Auth middleware (redirects unauthenticated users)
├── next.config.ts
├── package.json
├── tsconfig.json
├── eslint.config.mjs
├── postcss.config.mjs
│
├── docs/
│   └── supportcoach-ai-context.md          # This master context file
│
├── public/
│   ├── pdf.worker.mjs                      # PDF.js web worker for client-side parsing
│   ├── file.svg
│   ├── globe.svg
│   ├── next.svg
│   ├── vercel.svg
│   └── window.svg
│
└── src/
    ├── lib/
    │   ├── supabase.ts                     # Client-side Supabase instance
    │   ├── supabaseServer.ts               # Server-side Supabase instance (used in API routes)
    │   └── currentOrganization.ts          # Helper to get org ID for current user
    │
    ├── components/
    │   ├── CopyButton.tsx                  # Reusable copy-to-clipboard button component
    │   ├── TempChart.tsx                   # Recharts-based trend chart component
    │   └── WorkerTriggerButton.tsx         # Button to manually trigger job processing
    │
    └── app/
        ├── layout.tsx                      # Root layout
        ├── page.tsx                        # Landing / home page
        ├── globals.css                     # Global Tailwind styles
        ├── favicon.ico
        │
        ├── login/page.tsx                  # Login page
        ├── signup/page.tsx                 # Signup page
        ├── onboarding/page.tsx             # Org setup for new users
        ├── upload/page.tsx                 # PDF upload interface
        │
        ├── dashboard/
        │   ├── page.tsx                    # Main manager dashboard (stats, filters, chat list)
        │   ├── report/page.tsx             # AI-generated manager report view
        │   └── agent/[name]/page.tsx       # Single-agent detail view
        │
        ├── jobs/
        │   ├── page.tsx                    # List of analysis jobs
        │   └── [id]/page.tsx              # Single job detail + progress view
        │
        ├── analysis/
        │   └── [id]/page.tsx              # Single chat analysis detail view
        │
        └── api/
            ├── signup/route.ts             # User registration
            ├── logout/route.ts             # Session logout
            ├── onboarding/route.ts         # Create organization for new user
            ├── create-analysis-job/route.ts # Creates job + items from uploaded PDFs
            ├── process-jobs/route.ts       # **WORKER** — processes pending jobs (main pipeline)
            ├── analyze/route.ts            # Direct single-transcript analysis (legacy/utility)
            ├── job-status/route.ts         # Poll job progress
            ├── team-summary/route.ts       # Aggregated team stats for dashboard
            ├── trend-data/route.ts         # Time-series trend data for charts
            ├── manager-report/route.ts     # AI-generated manager report
            ├── manager-report-pdf/route.ts # PDF export of manager report
            ├── export/route.ts             # Data export endpoint
            └── reclassify-topics/route.ts  # One-time chat_type re-classification (Fix 8g)
```

### File Placement Rules

- New API routes → `src/app/api/{route-name}/route.ts`
- New pages → `src/app/{page-name}/page.tsx`
- New shared components → `src/components/{ComponentName}.tsx`
- New utility/helper functions → `src/lib/{name}.ts`
- New dashboard sub-pages → `src/app/dashboard/{sub-page}/page.tsx`
- Database migrations → Provide as labeled SQL blocks (user runs in Supabase SQL Editor)

---

## 6. Current Database Schema

### analysis_jobs
Tracks background processing jobs.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| organization_id | uuid | Required — tenant isolation |
| status | text | pending, processing, completed, failed |
| total_files | integer | |
| processed_files | integer | |
| created_at | timestamp | |

### analysis_job_items
Individual files belonging to a job.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| job_id | uuid | FK → analysis_jobs.id |
| organization_id | uuid | Required — tenant isolation |
| file_name | text | |
| transcript_text | text | Raw extracted PDF text stored at upload time |
| status | text | pending, processing, completed, failed. Note: legacy data may contain "done" — treat as equivalent to completed. New records must use completed. |
| analysis_id | uuid | FK → chat_analyses.id (set after analysis). Also used as the idempotency check — if populated, the item has been fully processed. |
| transcript_hash | text | SHA-256 hash of transcript_text content. Used for duplicate detection at upload time (see Fix 8f). NULL for legacy rows uploaded before this feature. |
| created_at | timestamp | |

### chat_analyses
Stores AI analysis results.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| organization_id | uuid | Required — tenant isolation |
| conversation_id | uuid | FK → conversations.id |
| file_name | text | Original uploaded file name |
| agent_name | text | Extracted by AI or inferred from messages |
| customer_name | text | Extracted by AI or inferred from messages |
| chat_type | text | AI-classified category (e.g., "Billing Issue", "Technical Issue") |
| issue_summary | text | |
| what_you_did_well | text[] | Array of strength observations |
| improvement_areas | text[] | Array of improvement observations |
| what_this_chat_really_was | text | AI's deeper analysis of the conversation |
| how_this_could_be_handled | text[] | Array of alternative handling suggestions |
| summary_strengths | text[] | Concise strength summary for reports |
| summary_improvements | text[] | Concise improvement summary for reports |
| quick_summary | text | 10-second coaching summary for managers |
| copy_coaching_message | text | Ready-to-paste coaching message |
| attention_priority | text | high, medium, low |
| empathy | integer | Score 1–10 |
| clarity | integer | Score 1–10 |
| ownership | integer | Score 1–10 |
| resolution_quality | integer | Score 1–10 |
| professionalism | integer | Score 1–10 |
| churn_risk | text | low, medium, high |
| deleted_message | boolean | Agent deleted a message during chat |
| missed_confirmation | boolean | Agent didn't confirm resolution |
| premature_close | boolean | Chat closed before customer was satisfied |
| product_limitation_chat | boolean | Issue was a product limitation |
| customer_frustration_present | boolean | Customer showed frustration signals |
| escalation_done_well | boolean | Agent handled escalation properly |
| source_type | text | See allowed values in Section 6f. Note: legacy data may contain "chat_transcript" — new records must use "chat". |
| source_platform | text | See allowed values in Section 6f |
| excluded | boolean | Soft delete flag. Default false. When true, record is hidden from all dashboard aggregations, reports, and exports. Data is preserved for audit. See Section 9j. |
| created_at | timestamp | |

### conversations
One row per conversation. Populated by the worker during processing.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| organization_id | uuid | Required — tenant isolation |
| job_id | uuid | FK → analysis_jobs.id |
| job_item_id | uuid | FK → analysis_job_items.id |
| source_type | text | See allowed values in Section 6f |
| source_platform | text | See allowed values in Section 6f |
| file_name | text | |
| customer_name | text | Updated after AI analysis with inferred name |
| agent_name | text | Updated after AI analysis with inferred name |
| rating_value | numeric | |
| rating_type | text | e.g., star, csat, nps |
| priority_label | text | Set to computed attention_priority after analysis |
| raw_transcript_text | text | Full raw text (fallback if parsing fails) |
| parsed_success | boolean | |
| created_at | timestamp | |
| updated_at | timestamp | |

### conversation_messages
One row per message. Populated by the worker during processing.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| conversation_id | uuid | FK → conversations.id |
| organization_id | uuid | Required — tenant isolation |
| message_index | integer | Order of message in conversation |
| sender_name | text | Nullable — null for unparseable lines |
| sender_role | text | agent, customer, system, unknown |
| message_text | text | |
| message_timestamp | text | Nullable — stored as extracted string |
| message_type | text | message, note, system |
| raw_line | text | Original unparsed line(s) |
| created_at | timestamp | |

### 6e. Table Relationships (Foreign Key Chain)

```
analysis_jobs
  └── analysis_job_items (via job_id)
        └── conversations (via job_item_id)
              ├── chat_analyses (via conversation_id)
              └── conversation_messages (via conversation_id)
```

- Each conversation links to exactly one analysis_job_item via `job_item_id`.
- Each chat_analyses row links to exactly one conversation via `conversation_id`.
- Each conversation_message belongs to exactly one conversation via `conversation_id`.
- All tables enforce `organization_id` for tenant isolation.

### 6f. Allowed Enum Values

| Column | Allowed Values | Notes |
|---|---|---|
| source_type | chat, ticket, email | New records must use `chat`. Legacy data may contain `chat_transcript`. |
| source_platform | salesiq, zendesk, intercom, freshdesk, hubspot, manual | Only `salesiq` used currently |
| attention_priority | high, medium, low | See Section 7b for current logic |
| sender_role | agent, customer, system, unknown | `unknown` used when role cannot be inferred |
| message_type | message, note, system | |
| rating_type | star, csat, nps | Extensible later |
| churn_risk | low, medium, high | Stored as text, not boolean |
| job_item status | pending, processing, completed, failed | Legacy data may contain `done` |

---

## 7. IMPLEMENTED — Current Working Features

These features are live and working. Do not break them.

### 7a. Upload Pipeline
PDF upload → text extraction → `transcript_text` stored on `analysis_job_items` → analysis job creation. Files: `src/app/upload/page.tsx`, `src/app/api/create-analysis-job/route.ts`

### 7b. Background Worker
The worker at `src/app/api/process-jobs/route.ts` is a GET endpoint that:

1. Selects one job with status `pending` or `processing`.
2. Sets job status to `processing`.
3. Fetches all pending items for that job.
4. For each item:
   - Validates `organization_id` and `transcript_text` exist.
   - Parses transcript into messages using `parseTranscriptMessages()`.
   - Creates a `conversations` record with `raw_transcript_text` and `parsed_success`.
   - Stores `conversation_messages` if parsing produced results.
   - Calls OpenAI (gpt-5.4, temperature 0.2) with a single structured JSON prompt.
   - Parses the AI response; marks item failed if JSON parsing fails.
   - Builds `quick_summary`, `copy_coaching_message`, and `attention_priority` using AI values with local fallback functions.
   - Updates the conversation with inferred participant names and priority label.
   - Inserts `chat_analyses` linked to the conversation.
   - Updates the job item with `analysis_id` and status.
   - Increments `processed_files` on the job.
5. After the loop, checks for remaining pending items. If none, sets job to `completed`.

**Current attention_priority logic** uses a point-scoring system:

| Signal | Points |
|---|---|
| customer_frustration_present | +2 |
| premature_close | +2 |
| missed_confirmation | +1 |
| product_limitation_chat | +1 |
| churn_risk = "medium" | +1 |
| churn_risk = "high" | +3 |
| empathy <= 4 | +2 |
| empathy <= 6 (but > 4) | +1 |
| resolution_quality <= 4 | +2 |
| resolution_quality <= 6 (but > 4) | +1 |
| ownership <= 4 | +1 |

Result: Score ≥ 5 = `high`, Score ≥ 2 = `medium`, else `low`.

If the AI provides `attention_priority` directly, the AI value is used instead.

**Current quick_summary fallback logic:** If the AI doesn't provide one, the worker builds a summary from flags (frustration, low empathy, weak resolution, premature close, missed confirmation). If no flags, returns a generic positive message.

**Current copy_coaching_message fallback logic:** If the AI doesn't provide one, the worker builds a message from `summary_strengths` / `what_you_did_well` and `summary_improvements` / `improvement_areas`, addressed to the agent by name.

### 7c. Manager Dashboard
- Analyzed chat counts, agent filtering, date filtering
- Team average scores (1–10 scale), score bar visualizations
- AI-generated team summary via `/api/team-summary`
- Trend charts via `/api/trend-data` and TempChart component
- Top chat types, coaching patterns, flag summaries
- Agent leaderboard with links to single-agent views
- Recent analyzed chats list
- Export CSV link, Generate Coaching Report link
- Dashboard does not filter by `source_type` or `source_platform` — safe to change these values in the worker.
- Files: `src/app/dashboard/page.tsx`, `src/app/api/team-summary/route.ts`, `src/app/api/trend-data/route.ts`, `src/components/TempChart.tsx`

**Known Limitation — Selection Bias in Aggregate Stats:**
The current dashboard computes aggregate statistics (frustration rate, premature close rate, average scores, etc.) from all uploaded/analyzed chats. However, during the pre-integration phase, managers typically upload only problem chats or chats selected for coaching review — not a representative sample of all support conversations. This creates a significant selection bias: the dashboard may show alarming aggregate stats (e.g., 69% frustration rate) that do not reflect actual team performance (e.g., the real 5-star rate may be 94%+).

This is a known limitation during the build phase. It will be partially resolved when helpdesk API integrations (Section 10c) allow the system to ingest all conversations automatically. In the interim, a manual benchmark feature is planned (Section 10g) to allow managers to provide their actual overall stats so the dashboard can frame analyzed chats in proper context.

**Important for AI assistants:** Do not treat aggregate stats from analyzed chats as representative of overall team health. When building dashboard features, keep in mind that the analyzed pool may be a small, negatively-skewed subset of total support volume. Avoid language in UI copy or AI-generated summaries that implies the stats represent the full team picture unless the system has confirmed full-volume data (e.g., via API integration or manual benchmark comparison).

### 7d. Manager Reports
AI-generated structured leadership reports including: Team Health, Top Strengths, Coaching Opportunities, Risk Patterns, Agents Needing Attention, Manager Focus Next. Single-agent reports adjust wording appropriately. Files: `src/app/dashboard/report/page.tsx`, `src/app/api/manager-report/route.ts`

### 7e. PDF Report Export
File: `src/app/api/manager-report-pdf/route.ts`

### 7f. Auth Flow
Login, Signup, Logout, Org onboarding for new users, middleware-based route protection. Files: `src/app/login/page.tsx`, `src/app/signup/page.tsx`, `src/app/onboarding/page.tsx`, `src/app/api/signup/route.ts`, `src/app/api/logout/route.ts`, `src/app/api/onboarding/route.ts`, `middleware.ts`

### 7g. Job Management Pages
- `src/app/jobs/page.tsx` — Job list page. Displays jobs with progress bars and status badges. Does not reference item-level statuses — only job statuses (completed, processing, pending). Safe to change item status values without affecting this file.
- `src/app/jobs/[id]/page.tsx` — Job detail page. Displays individual job items with status badges and "View Analysis →" links. This file references `item.status === "done"` in two places:
  1. Badge styling — `"done"` maps to green emerald styling.
  2. Fallback message — when `analysis_id` is missing on a `"done"` item, shows "Analysis link not available for older processed items."
- If the worker's completion status is changed from `"done"` to `"completed"`, this file must be updated to match. This is a confirmed multi-file dependency.

### 7h. Current API Routes

| Route | Method | Purpose | Status |
|---|---|---|---|
| /api/signup | POST | User registration | ✅ Working |
| /api/logout | POST | Session logout | ✅ Working |
| /api/onboarding | POST | Create organization | ✅ Working |
| /api/create-analysis-job | POST | Create job + items from PDFs | ✅ Working |
| /api/process-jobs | GET | Worker — processes pending jobs | ✅ Working (needs fixes in Section 8) |
| /api/analyze | POST | Direct single-transcript analysis | ✅ Working (legacy) |
| /api/job-status | GET | Poll job progress | ✅ Working |
| /api/team-summary | POST | Aggregated team stats (AI-powered) | ✅ Working |
| /api/trend-data | GET | Time-series data for charts | ✅ Working |
| /api/manager-report | POST | Generate AI manager report | ✅ Working |
| /api/manager-report-pdf | POST | Export manager report as PDF | ✅ Working |
| /api/export | GET | CSV data export | ✅ Working |
| /api/topic-stats | POST | Topic-level aggregated stats (Section 9g) | ✅ Working |
| /api/topic-agent-stats | POST | Agent performance within a topic (Section 9g) | ✅ Working |
| /api/topic-coaching-stats | POST | Coaching insights by topic (Section 9h) | ✅ Working |
| /api/toggle-exclude | POST | Soft delete — toggle excluded flag on chat_analyses (Section 9j) | ✅ Working |
| /api/reclassify-topics | POST | One-time re-classification of chat_type on existing records (Fix 8g) | ✅ Built, needs to be run |

When adding new API routes, place them at `src/app/api/{route-name}/route.ts` and add them to this table.

---

## 8. PENDING FIXES — Confirmed Issues from Code Inspection

The following issues were identified by inspecting the actual codebase against this document. They should be addressed in the current sprint. No SQL migrations are needed. No new files are needed.

### 8a. Add Idempotency Check to Worker (Critical)
**File:** `src/app/api/process-jobs/route.ts`
**Location:** Item selection query (the `.from("analysis_job_items")` call that fetches pending items for the job).
**Current behavior:** Filters by `status = 'pending'` only.
**Required:** Add `.is("analysis_id", null)` to the query so it selects only items where `status = 'pending'` AND `analysis_id IS NULL`. This prevents duplicate processing on retry.

### 8b. Add `processing` Status Claim (Critical)
**File:** `src/app/api/process-jobs/route.ts`
**Location:** Top of the `for (const item of items)` loop, immediately after `try {` and before `const transcriptText`.
**Current behavior:** No status update before work begins. A concurrent worker call could select the same items.
**Required:** Immediately set `status = 'processing'` on the current item via a Supabase update before doing any other work on that item.

### 8c. Fix `source_type` Value
**File:** `src/app/api/process-jobs/route.ts`
**Locations:** Two places — the `conversations` insert and the `chat_analyses` insert, both containing `source_type: "chat_transcript"`.
**Current behavior:** Uses `"chat_transcript"` which is not in the allowed enum values.
**Required:** Change both to `"chat"`. No other files filter by `source_type` — confirmed safe by inspecting the dashboard.

### 8d. Fix Item Completion Status (Multi-File)
This is a multi-file change. Both files must be updated together.

**File 1:** `src/app/api/process-jobs/route.ts`
**Location:** The job item update after successful analysis, where `status: "done"` is set alongside `analysis_id`.
**Change:** Replace `"done"` with `"completed"`.

**File 2:** `src/app/jobs/[id]/page.tsx`
**Location 1:** Badge styling conditional — `item.status === "done"` maps to green emerald styling.
**Change:** Replace `"done"` with `"completed"`.
**Location 2:** Fallback message conditional — `item.status === "done"` shows the "Analysis link not available" message.
**Change:** Replace `"done"` with `"completed"`.

No other files reference the `"done"` status value.

### 8e. Improve Partial Parsing (Orphan Lines)
**File:** `src/app/api/process-jobs/route.ts`
**Location:** Inside the `parseTranscriptMessages` function, in the `if (!matched)` block, specifically the `else` branch (when there is no current message to append to).
**Current behavior:** Orphan lines stored with `sender_role: "unknown"` and `message_type: "message"`.
**Required:** Change the `else` branch to use `sender_role: "system"` and `message_type: "system"` to distinguish these as unparseable content. The `if (current)` branch (appending to a previous message) remains unchanged.

### 8h. Fix Sender Misattribution from Inconsistent PDF Spacing (Parser Fix)

**Problem:** The `parseTranscriptMessages()` function in `src/app/api/process-jobs/route.ts` relies on 2+ spaces between a sender name and their message text to identify who sent each message. However, `pdfjs-dist` sometimes extracts text with only 1 space between the sender name and the message content. When this happens, the parser fails to extract the sender and attributes the message to the previous sender — causing the AI to coach the wrong person on the wrong content.

**Evidence from chat #214494:**
- `Fernando Arispe Mendoza   Hello Muibat, how are you?...` — 2+ spaces, parsed correctly as Fernando's message
- `Fernando Arispe Mendoza Yes, we frequently include...` — 1 space, parser failed, attributed to Muibat (previous sender)

**Fix:** The parser now builds a `knownSenderNames` set from successfully parsed messages. When the multi-space split fails, it checks whether the segment text starts with a known sender name. If it does, it extracts the sender and message correctly even without multi-space separation.

**Prompt-level safety net:** Factual Accuracy Rule 8 added to the AI prompt — instructs the AI to detect when a message attributed to one person reads like it was written by the other, and to treat it as likely quoted or misattributed content rather than coaching on it.

**Files affected:** `src/app/api/process-jobs/route.ts` (parser fix + prompt rule)

**No schema changes needed.**

**Problem:** All 175+ existing `chat_analyses` records were processed with the old AI prompt that had no `chat_type` classification guidance. The resulting values are unusable for the Topic Intelligence Dashboard (Section 9g) — they include vague categories like "Support", "Technical Issue", "Unknown", "Abandoned Chat", and "Workflow Confusion" instead of module-level topics.

**Fix:** Create a one-time API route or script that re-classifies only the `chat_type` field on existing `chat_analyses` records without re-running the full analysis.

**New file:** `src/app/api/reclassify-topics/route.ts`

**How it works:**
1. Query all `chat_analyses` records for the current organization (or all orgs if run as an admin utility).
2. For each record, retrieve the linked `conversations.raw_transcript_text` via `conversation_id`.
3. Send a lightweight OpenAI call with a minimal prompt that asks ONLY for the `chat_type` classification. Do not request scores, coaching messages, boolean flags, or any other fields.
4. Update the `chat_type` column on the `chat_analyses` record with the new classification.
5. Do not modify any other column on the record — all existing coaching feedback, scores, and flags must be preserved.

**Lightweight prompt for re-classification:**
```
You are classifying a customer support chat transcript for a SaaS product used by contractors.

Return ONLY a JSON object with one field:
{ "chat_type": "" }

chat_type rules:
- Must be a short, consistent category name describing the product module or issue type.
- Use general module-level categories, not overly specific descriptions.
- Always use Title Case.
- Always use the shortest accurate category name.
- If a chat covers multiple topics, choose the primary one.
- Good examples: "Billing", "Integrations", "Permissions", "Scheduling", "Reporting", "Documents", "Projects", "Change Orders", "Estimates", "API", "Account Management", "Notifications", "Sync Issues", "User Access", "Mobile App", "Data Import", "Payments", "Contracts", "Timesheets", "Daily Logs", "Feature Request", "Project Settings"
- Bad examples: "Customer asking about invoice discrepancy" (too specific), "Support" (too vague), "Technical Issue" (too vague), "Unknown" (meaningless), "Abandoned Chat" (that's an outcome, not a topic), "Workflow Confusion" (that's a symptom, not a topic)
```

**Implementation rules:**
- Use `gpt-5.4` with `temperature: 0.2` (consistent with the main worker).
- Process records in batches (e.g., 10 at a time) to avoid rate limits and timeouts.
- Add a short delay between batches (e.g., 500ms) to be safe with API rate limits.
- Log progress (e.g., "Re-classified 50 of 175 records").
- If the AI returns an invalid response for a record, skip it and log the error — do not fail the entire batch.
- This route should be a POST endpoint that accepts `organization_id` as a parameter.
- This is a one-time migration utility. After it runs successfully, it can be removed from the codebase or left inactive.

**No schema changes needed.** The `chat_type` column already exists on `chat_analyses`.

**Testing after implementation:**
1. Run the re-classification route for your organization.
2. Check `/dashboard/topics` — confirm topics now show module-level categories (e.g., "Change Orders", "Project Settings", "Feature Request") instead of vague labels like "Support" or "Unknown".
3. Verify that all other fields on the re-classified records are unchanged (scores, coaching messages, flags).
4. Check a few individual analysis views to confirm coaching feedback is still intact.

**Problem:** If a user uploads the same transcript PDF twice (or the same content under a different filename), the system creates two separate job items, two separate conversations, and two separate analyses. Both feed into dashboard metrics, topic intelligence, coaching pattern cards, and manager reports — silently doubling the weight of that conversation in all aggregations. There is currently no check for duplicate content.

**Detection approach:** Generate a content hash of the extracted `transcript_text` at upload time, before the job item is created. Check whether that hash already exists for the same organization. If it does, reject the duplicate and inform the user.

**File affected:** `src/app/api/create-analysis-job/route.ts` — this is where job items are created from uploaded PDFs. The duplicate check must happen here, after text extraction but before the `analysis_job_items` insert.

**SQL migration required:**

```sql
-- Add content hash column for duplicate detection
ALTER TABLE analysis_job_items ADD COLUMN IF NOT EXISTS transcript_hash text;

-- Create index for fast duplicate lookups within an organization
CREATE INDEX IF NOT EXISTS idx_job_items_org_hash 
ON analysis_job_items (organization_id, transcript_hash);
```

**Implementation rules:**
- Hash the `transcript_text` content using a standard algorithm (e.g., SHA-256). Do not hash the filename — different filenames can contain identical content.
- Before inserting a new `analysis_job_items` row, query: `SELECT id, file_name FROM analysis_job_items WHERE organization_id = ? AND transcript_hash = ? LIMIT 1`.
- If a match is found, skip that file and include it in the response as a duplicate. Do not insert a job item for it. Inform the user which file was skipped and which existing file it matched (e.g., "Skipped 'chat_feb12.pdf' — identical content already uploaded as 'chat_feb12_copy.pdf'").
- If all files in an upload are duplicates, do not create the `analysis_jobs` record at all.
- If some files are duplicates and some are new, create the job with only the new files. Set `total_files` to the count of non-duplicate files.
- The hash column should be populated for all new uploads going forward. Existing rows will have `transcript_hash = NULL` — this is acceptable. Duplicate detection only applies to new uploads.
- This check is scoped per organization — the same transcript uploaded by two different organizations is allowed (they are separate tenants).

**What this does NOT do:**
- It does not retroactively deduplicate existing data. If duplicates already exist in the database, they remain.
- It does not detect near-duplicates or partial overlaps — only exact content matches.
- It does not affect the worker (`process-jobs/route.ts`) — the worker processes whatever job items exist. Deduplication happens upstream at upload time.

**Testing after implementation:**
1. Upload a PDF and confirm the job is created normally.
2. Upload the same PDF again — confirm the system rejects it with a clear message identifying it as a duplicate.
3. Upload a batch of 3 PDFs where one is a duplicate of a previously uploaded file — confirm the job is created with only 2 items and `total_files = 2`.
4. Confirm the dashboard counts have not increased from the duplicate upload attempts.

---

## 9. NOT YET IMPLEMENTED — Approved Features for Current Sprint

Most of the infrastructure for the original sprint features is already built in the worker (as confirmed by code inspection). The remaining work is primarily UI integration, plus new dashboard views for topic intelligence and coaching-by-topic.

### 9a. Conversation + Message Storage — ✅ ALREADY IMPLEMENTED IN WORKER
The worker already creates `conversations` records and `conversation_messages` rows. Tables are populated during processing. The fixes in Section 8 improve robustness.

### 9b. 10-Second Coaching Summary — ✅ ALREADY IMPLEMENTED IN WORKER
The worker already generates `quick_summary` via AI with a local fallback function. **Remaining work:** Surface this field in the dashboard UI and/or analysis detail view.

### 9c. Copy Coaching Message — ✅ ALREADY IMPLEMENTED IN WORKER
The worker already generates `copy_coaching_message` via AI with a local fallback function. **Remaining work:** Add a copy-to-clipboard button in the dashboard or analysis detail view.

### 9d. Attention Priority — ✅ ALREADY IMPLEMENTED IN WORKER
The worker already computes `attention_priority` using a point-scoring system with AI override. **Remaining work:** Display priority badges in the dashboard, add a "Chats Needing Attention" filtered view.

### 9e. Team Health Dashboard Enhancements
The dashboard already supports "All Time", "Last 7 Days", and "Last 30 Days" via the range filter. **Remaining work:** Add "This Month" and "Last Month" options if desired. Custom date ranges are not required.

### 9i. Production Hardening — Job UX (MVP Required)

**These items must be addressed before launch. They are not new features — they are polish items that prevent the product from appearing unfinished to paying customers.**

**Job display names:**
The `/jobs` page and `/jobs/[id]` page currently display raw UUIDs as job titles (e.g., "Job c7d08243-6a74-4f80-968e-d585335cde84"). This is not acceptable for a customer-facing product. Replace with a human-readable format such as "Upload — Mar 12, 2026, 5:49 PM" using the job's `created_at` timestamp, or a sequential job number per organization. No schema changes needed — this is a display-only change using existing data.

**Worker trigger automation:**
The `WorkerTriggerButton.tsx` component currently requires users to manually trigger the background worker after uploading transcripts. For MVP launch, the worker must be triggered automatically. Two approaches:
- **Option A (simpler):** Call `/api/process-jobs` automatically from the upload flow after job creation completes. This can be a fire-and-forget fetch call from `create-analysis-job/route.ts` or from the upload page after the job is created.
- **Option B (production-grade):** Set up a cron job (e.g., via Vercel Cron) that calls `/api/process-jobs` every 30–60 seconds. This handles retries and multi-job queues automatically.

For MVP, Option A is sufficient. The manual trigger button in `WorkerTriggerButton.tsx` must be renamed from "Run Worker Manually" to **"Process Now"** — this is the customer-facing label. The component remains available in the UI as a manual trigger option alongside any automated processing.

**Button states:**
- Default: "Process Now" — clickable
- While worker is running: "Processing..." — disabled, with a loading indicator (spinner or pulse animation)
- After completion: Returns to "Process Now" or transitions to a success state like "Done ✓" briefly before resetting

**Files likely affected:** `src/app/jobs/page.tsx`, `src/app/jobs/[id]/page.tsx`, `src/app/upload/page.tsx` or `src/app/api/create-analysis-job/route.ts`, `src/components/WorkerTriggerButton.tsx`

**Dependencies:** None. Can be built independently of other sprint items.

### 9j. Soft Delete — Exclude Analysis from Reports (MVP Required)

**Purpose:** Allow managers to exclude individual chat analyses from all dashboard stats, reports, topic intelligence, and coaching insights without permanently deleting the data.

**Why this is MVP-required:** Paying customers will inevitably upload test transcripts, duplicates, or chats that produce inaccurate analysis. Without a way to exclude these, dashboard stats become polluted and untrustworthy. Running SQL in Supabase is not an option for customers.

**Implementation approach — soft delete via `excluded` flag:**

**SQL migration:**
```sql
ALTER TABLE chat_analyses ADD COLUMN IF NOT EXISTS excluded boolean DEFAULT false;
```

**How it works:**
- A new boolean column `excluded` on `chat_analyses`, defaulting to `false`.
- When a manager clicks "Exclude from reports" on an analysis detail page, the column is set to `true`.
- When a manager wants to restore it, they click "Include in reports" and the column is set back to `false`.
- The data is never deleted — it remains in the database for audit purposes.

**Dashboard query changes:**
Every query that aggregates or displays `chat_analyses` data must add `.eq('excluded', false)` (or the equivalent WHERE clause) to filter out excluded records. This includes:
- `src/app/dashboard/page.tsx` — main dashboard stats, chat list
- `src/app/api/team-summary/route.ts` — team summary aggregation
- `src/app/api/trend-data/route.ts` — trend chart data
- `src/app/api/manager-report/route.ts` — AI-generated reports
- `src/app/api/topic-stats/route.ts` — topic intelligence
- `src/app/api/topic-agent-stats/route.ts` — agent-by-topic stats
- `src/app/api/topic-coaching-stats/route.ts` — coaching insights
- `src/app/api/export/route.ts` — CSV export
- `src/app/dashboard/topics/page.tsx` — topic dashboard (if querying directly)
- `src/app/dashboard/topics/[topic]/page.tsx` — topic drill-down (if querying directly)
- Any other page or route that reads from `chat_analyses`

**UI changes:**
- `src/app/analysis/[id]/page.tsx` — add an "Exclude from Reports" button. When excluded, show "Excluded from Reports" badge and an "Include in Reports" button to restore.
- Excluded analyses should still be viewable on the analysis detail page — they are just hidden from aggregations.
- Optionally: show excluded count on the dashboard (e.g., "Showing 173 of 175 chats — 2 excluded").

**API route for toggling:**
- New route: `src/app/api/toggle-exclude/route.ts` — POST endpoint accepting `analysis_id` and `excluded` (boolean). Updates the `chat_analyses` record. Must filter by `organization_id`.

**Important:** This is NOT a hard delete. Do not delete rows from `chat_analyses`, `conversations`, or `conversation_messages`. The `excluded` flag only affects whether the record appears in aggregated views and reports.

**No cascading changes needed.** The `conversations` and `conversation_messages` tables are unaffected. Only `chat_analyses` queries are filtered.

**Files affected:** SQL migration + `src/app/api/toggle-exclude/route.ts` (new) + `src/app/analysis/[id]/page.tsx` + all files listed above that query `chat_analyses`.

**Dependencies:** None. Can be built independently.
The worker already handles parsing at a basic level. The parsing logic should be understood as producing one of three outcomes:

**Complete success:**
- All messages parsed correctly.
- `conversations.parsed_success = true`.
- All `conversation_messages` rows stored.

**Partial success:**
- Some messages parsed, some lines could not be parsed.
- `conversations.parsed_success = true`.
- Successfully parsed messages stored as normal `conversation_messages`.
- Unparseable orphan lines stored with `sender_role = 'system'` and `message_type = 'system'` (after fix 8e is applied).
- AI analysis uses raw transcript text to ensure completeness.

**Complete failure:**
- No messages could be parsed.
- `conversations.parsed_success = false`.
- No `conversation_messages` rows created.
- AI analysis still attempted using `conversations.raw_transcript_text`.
- `analysis_job_items.status` set to `completed` (not `failed`) since analysis still ran.
- The dashboard still displays the analysis — parsing failure only affects future message-level features.

In all cases, the raw transcript text is stored in `conversations.raw_transcript_text` as a fallback.

### 9g. Topic / Module Intelligence Dashboard (NEW — Professional Tier Feature)

**Purpose:** Automatically categorize support chats by issue topic so managers can understand what customers are contacting support about most often and how well agents handle those issues.

**Plan tier:** Professional and above (see Section 14). During the build phase, accessible to all users — gating will be added when billing infrastructure is ready.

**Data foundation:** This feature reads from existing data. The `chat_analyses.chat_type` field already contains the AI-classified topic for every analyzed conversation. No worker changes are required. No new database tables are required for v1.

**Topic classification approach:**
- Topics are dynamic and company-agnostic — they are not hardcoded.
- The AI already classifies each chat into a `chat_type` during analysis (e.g., "Billing Issue", "Technical Issue", "Integration Problem", "Permissions", "Scheduling", "Reporting", etc.).
- For v1, the dashboard aggregates directly on the existing `chat_type` values.
- **Known limitation:** The AI may produce inconsistent topic names (e.g., "Billing Issue" vs "Billing" vs "Billing Question"). This is acceptable for v1. Topic normalization (either AI-based grouping or a managed topic list per org) is a future enhancement — do not build it now unless the user explicitly asks.

**Dashboard view — Topic Overview (`/dashboard/topics` or tab within existing dashboard):**

For each topic/module the system must show:
- Total number of chats classified under that topic
- Percentage of overall support volume
- Average coaching scores (empathy, clarity, ownership, resolution_quality, professionalism)
- Customer frustration rate (percentage of chats with `customer_frustration_present = true`)
- Escalation rate (percentage of chats with `escalation_done_well` flagged)
- Premature close rate
- Churn risk distribution (count of low, medium, high per topic)
- Attention priority distribution (count of high, medium, low per topic)

**Agent performance by topic:**

For each topic, managers can drill down to see:
- Which agents handle the most chats in that topic
- Average performance scores by agent within the topic
- Agents who perform well vs those needing improvement (relative to the topic average)

**Issue pattern detection:**

The system identifies (from aggregated boolean flags and scores):
- Topics with high customer frustration rates
- Topics with frequent premature closes
- Topics with low resolution quality scores
- Topics flagged as product limitations (`product_limitation_chat = true`)

**Implementation approach:**
- New API route: `src/app/api/topic-stats/route.ts` — Accepts `organization_id` and optional date range. Queries `chat_analyses` grouped by `chat_type` with aggregated scores, counts, and flag percentages.
- New API route: `src/app/api/topic-agent-stats/route.ts` — Accepts `organization_id`, `chat_type`, and optional date range. Returns per-agent breakdown within a specific topic.
- New dashboard page: `src/app/dashboard/topics/page.tsx` — Topic overview with drill-down to agent-level detail.
- All queries must filter by `organization_id`.
- Uses Recharts for visualizations (consistent with existing dashboard).

**Dependencies:** None. Reads from existing schema. Should be built after Section 8 fixes are applied.

### 9h. Coaching Insights by Topic (NEW — Professional Tier Feature)

**Purpose:** Allow managers to understand how well agents handle specific types of issues at a strategic level, rather than reviewing chats individually.

**Plan tier:** Professional and above (see Section 14). During the build phase, accessible to all users — gating will be added when billing infrastructure is ready.

**Data foundation:** Like Feature 9g, this reads from existing data. The `chat_analyses` table contains all coaching scores, boolean flags, and improvement areas — grouped by `chat_type` and `agent_name`. No worker changes are required. No new database tables are required for v1.

**Relationship to Feature 9g:** Features 9g and 9h share the same data foundation and the same topic normalization challenge. They can be built as separate tabs or sections within the same topic dashboard page, or as separate pages. The decision on layout should be made during UI implementation. The API routes may overlap — if a single route can serve both, do not create unnecessary duplicate routes.

**Topic-level coaching analysis:**

For each topic/module the system summarizes:
- Average coaching scores (empathy, clarity, ownership, resolution_quality, professionalism) for all chats in that topic
- Most common `improvement_areas` values across chats in that topic (frequency-ranked)
- Most common `summary_improvements` values across chats in that topic
- Most common `summary_strengths` / `what_you_did_well` values across chats in that topic
- Boolean flag rates: `missed_confirmation`, `premature_close`, `deleted_message`, `customer_frustration_present`, `escalation_done_well`

**Coaching pattern detection:**

The system highlights patterns such as:
- Topics where `missed_confirmation` rate is above average
- Topics where empathy scores are consistently low
- Topics where `premature_close` rate is high
- Topics where ownership scores drop
- Topics where escalation handling is poor

Detection logic: Compare each topic's flag rate or average score against the org-wide average. If a topic's rate is significantly worse (e.g., >1.5x the org average for flags, or >1 point below average for scores), surface it as a pattern. The exact thresholds can be tuned — start with these defaults and adjust based on user feedback.

**Agent coaching breakdown by topic:**

Managers can view:
- Average coaching scores by agent within a topic
- Improvement trends over time (using `created_at` on `chat_analyses`)
- Agents whose scores in a specific topic are below the topic average
- Agents who consistently perform well in specific topics

**Team-wide coaching trends:**

Managers see:
- Most common `improvement_areas` across all topics (the team's top coaching gaps)
- Recurring training gaps — topics where multiple agents score below average
- Improvement areas that appear in more than one topic (cross-cutting coaching needs)

**Implementation approach:**
- If Feature 9g's API routes already provide sufficient data (scores, flags, agent breakdowns per topic), extend them rather than creating new routes.
- If additional aggregation is needed (e.g., frequency-ranked improvement areas, pattern detection), create: `src/app/api/topic-coaching-stats/route.ts` — Accepts `organization_id`, optional `chat_type`, and optional date range. Returns coaching-specific aggregations.
- Dashboard UI can be a tab within the topic dashboard page (9g) or a separate page at `src/app/dashboard/topics/coaching/page.tsx` — decide during implementation.
- Pattern detection logic (comparing topic rates to org averages) should be computed in the API route, not on the client.
- All queries must filter by `organization_id`.

**Minimum data threshold:** For coaching insights to be meaningful, the UI should indicate when a topic or agent has fewer than 5 analyzed chats. Display the data but include a note like "Based on limited data (N chats)" so managers don't over-index on small samples.

**Pattern Cards — Per-Agent-Per-Topic Coaching Intelligence:**

In addition to the aggregate views described above, the system must generate individual pattern cards that surface specific, actionable coaching insights for each agent+topic combination where repeated issues are detected.

A pattern card is generated when an agent has 3 or more analyzed chats within a topic AND at least one signal exceeds the detection thresholds (flag rate >1.5x org average, or score >1 point below org average).

Each pattern card displays:
- Agent name
- Topic name
- Number of chats contributing to the pattern (occurrence count)
- Detected signals (e.g., "premature_close in 5 of 7 chats", "resolution_quality avg 2.8 vs org avg 5.4")
- Pattern narrative summary — a natural-language sentence explaining what the pattern means
- Coaching recommendation — a specific, actionable suggestion for the manager to use
- Confidence level: High (7+ occurrences), Medium (5–6 occurrences), Low (3–4 occurrences)

**Pattern narrative and coaching recommendation generation — Template-Based (v1):**

For the MVP, narratives and recommendations are generated using deterministic templates, not AI calls. This is free, fast, and predictable. AI-generated narratives may be added as a future enhancement (v2) but should not be built now.

Template logic maps detected signals to pre-written narratives and recommendations. Examples:

Signal: `premature_close` rate is high
- Narrative template: "{agent_name} frequently closes {topic} conversations before confirming resolution ({count} of {total} chats)."
- Recommendation template: "Before closing {topic} chats, confirm resolution by asking: 'Does that resolve the issue for you, or would you like me to check anything else?'"

Signal: `customer_frustration_present` rate is high
- Narrative template: "Customer frustration is frequently present in {agent_name}'s {topic} conversations ({count} of {total} chats)."
- Recommendation template: "When handling {topic} issues, acknowledge the customer's frustration early with empathy statements before moving to resolution."

Signal: `resolution_quality` average is low
- Narrative template: "{agent_name}'s resolution quality in {topic} conversations averages {avg} out of 10, which is {diff} points below the team average."
- Recommendation template: "Focus on providing complete resolutions in {topic} chats — ensure all aspects of the customer's issue are addressed before closing."

Signal: `ownership` average is low
- Narrative template: "{agent_name} shows low ownership in {topic} conversations, averaging {avg} out of 10."
- Recommendation template: "Encourage taking ownership in {topic} chats by using phrases like 'I'll take care of this for you' and following through on commitments."

Signal: `missed_confirmation` rate is high
- Narrative template: "{agent_name} frequently misses confirming resolution in {topic} conversations ({count} of {total} chats)."
- Recommendation template: "Build a habit of confirming resolution before closing — ask the customer to confirm the issue is fully resolved."

Signal: `empathy` average is low
- Narrative template: "Empathy levels in {agent_name}'s {topic} conversations average {avg} out of 10, which is {diff} points below the team average."
- Recommendation template: "Practice acknowledging the customer's situation before jumping to solutions — phrases like 'I understand how frustrating this must be' can significantly improve the interaction."

When multiple signals are detected for the same agent+topic, the pattern card shows the primary signal (highest severity) as the main narrative, with additional signals listed below. Severity order: `customer_frustration_present` > `premature_close` > low `resolution_quality` > low `empathy` > `missed_confirmation` > low `ownership`.

**Pattern Cards UI location:**

Pattern cards should appear in one of the following locations (decide during implementation):
- A dedicated section within the coaching insights page/tab (preferred — keeps all coaching intelligence together)
- A standalone page at `/dashboard/coaching-patterns`
- As expandable rows within the agent-by-topic drill-down view

Pattern cards should be sortable by: confidence level, occurrence count, agent name, topic. Managers should be able to filter by agent or topic.

**Future enhancement (v2 — not current sprint):** Replace template-based narratives with AI-generated narratives using a secondary OpenAI call that takes the aggregated stats for an agent+topic and produces richer, more contextual coaching insights. This would follow the same pattern as `/api/team-summary` and `/api/manager-report` which already make on-demand AI calls for synthesis. Do not build v2 unless the user explicitly requests it.

**Dependencies:** Should be built after or alongside Feature 9g, since they share data and potentially UI structure.

---

## 10. NOT YET IMPLEMENTED — Future Roadmap (Not Current Sprint)

These items are not part of the current build. Do not implement them unless the user explicitly asks. The architecture should remain compatible with them.

### 10a. Smart Coaching Search
Future queries like: "show chats where empathy missed", "show refund conversations", "show escalation examples", "show negative ratings." Requires message-level storage (already implemented in the worker).

### 10b. Coaching History
Track whether agents repeat mistakes over time. Will require a new `coaching_records` table. Not designed yet.

### 10c. Helpdesk Integrations
Future integrations with: Zendesk, Intercom, Freshdesk, HubSpot. The `source_type` and `source_platform` fields exist to support this later. No integration code should be built now.

**Critical dependency:** The Unfair Rating Detection feature (Section 10h) MUST be built and working before any helpdesk API integration goes live. Without it, automated ingestion of all conversations will flood agent metrics with unfair ratings (~40% of 1-star chats are product-directed, not agent-directed), making the coaching data unreliable. Do not ship API integration without unfair rating handling in place.

### 10d. Observability (Future Enhancement)
Future versions of the system may introduce logging and monitoring capabilities such as:
- Worker processing duration per job and per item
- OpenAI token usage tracking per analysis call
- Transcript parsing failure rates over time
- AI response validation failures (e.g., malformed JSON from OpenAI)

These are not part of the current sprint and should not be implemented unless the user explicitly requests them. Do not add logging infrastructure, metrics tables, or monitoring code unless asked.

### 10e. AI-Generated FAQ Suggestions from Chat Data (Enterprise Tier Feature)

**Purpose:** Automatically discover frequently asked questions from real customer conversations and suggest FAQ entries based on actual support volume. This is a premium feature planned for the Enterprise tier (see Section 14).

**Plan tier:** Enterprise only. This feature requires new architecture patterns, new database tables, and a cross-conversation AI analysis pipeline. It should not be built until the core platform (Sections 7–9) is stable, billing infrastructure is in place, and the user explicitly approves it for development.

**Why this is a roadmap item (not current sprint):**
- It requires cross-conversation AI analysis — fundamentally different from the current single-conversation-per-worker-call pattern.
- It needs new database tables (`faq_suggestions`, linking tables to source chats).
- The clustering logic (grouping semantically similar questions) may require embedding-based similarity or a separate batch AI call.
- The approval workflow (review, edit, approve, publish) is a full CRUD interface.
- Scope is significantly larger than Features 9g and 9h.

**Core capabilities (design intent — not a build specification):**
- AI analyzes chat transcripts across an organization to identify repeated customer questions.
- Similar questions are clustered together (e.g., "Why is my invoice different from the estimate?" + "My invoice total is higher than expected" → one FAQ suggestion).
- Questions are grouped by topic/module (linking to `chat_type`).

**Suggested FAQ generation (design intent):**

For each detected question cluster the system would generate:
- FAQ question (canonical phrasing)
- Draft answer based on successful agent responses
- Related topic/module
- Links to example chats that produced the question
- Confidence level based on frequency

**FAQ insights panel (design intent):**

Managers would see:
- Most frequently asked questions
- Questions associated with customer frustration
- Questions associated with escalations
- Questions not currently answered in the knowledge base (if KB integration exists)

**Approval workflow (design intent):**

Suggested FAQs can be:
- Reviewed by managers
- Edited for accuracy
- Approved for publishing
- Rejected / dismissed

This ensures accuracy before they appear in documentation.

**Architectural considerations for future implementation:**
- Will likely need a batch processing job (separate from the current per-conversation worker) that runs periodically (e.g., weekly) across all analyzed chats for an org.
- May need an embeddings approach for question clustering (e.g., OpenAI embeddings + cosine similarity). This would introduce a new dependency.
- New database tables needed (at minimum): `faq_suggestions` (id, organization_id, question, answer_draft, topic, status, source_chat_ids, confidence, created_at, updated_at) and potentially `faq_question_clusters` for the grouping layer.
- The approval workflow requires a new UI page with CRUD operations — this is a mini-app within the app.
- Quality risk: AI-generated FAQ answers based on agent responses may inherit agent mistakes. The design should pull answers preferentially from high-scoring chats.

**Business value:**
- Improves self-service documentation based on real customer behavior
- Reduces repetitive support tickets over time
- Aligns knowledge base content with actual support volume
- Provides measurable ROI through ticket deflection metrics

**Do not build any part of this feature until explicitly approved by the user. Do not create tables, API routes, or UI pages for this feature proactively.**

### 10g. Manual Benchmark Input — Team Health Context (Future Enhancement)

**Purpose:** Allow managers to input their actual overall support stats so the dashboard can frame the analyzed (coaching) pool in proper context, addressing the selection bias problem described in Section 7c.

**Why this is needed:** Before API integrations are live, managers upload only problem chats or chats selected for coaching. This means aggregate dashboard stats (frustration rate, average scores, etc.) are computed from a negatively-skewed sample and do not represent actual team performance. For example, a team with a 94% five-star rate and 4,000+ monthly chats may upload 110 one-star chats for coaching — the dashboard would show alarming stats that misrepresent reality.

**Design intent (not a build specification):**

A lightweight settings or configuration page (e.g., `/dashboard/settings` or a modal) where managers can input:
- Total monthly chat volume (e.g., 4,000)
- Star rating distribution (e.g., 94% five-star, 3% four-star, 1.5% three-star, 0.5% two-star, 1% one-star)
- Optionally: total agents on the team, average CSAT score

**How it would be used:**
- The dashboard would display a **context banner** showing: "Showing coaching analysis for 110 chats (2.75% of your ~4,000 monthly conversations). Your reported 5-star rate is 94%."
- Aggregate stats sections would be labeled as "Coaching Pool Stats" rather than implying they represent overall team health.
- AI-generated summaries (team summary, manager reports) would be instructed to acknowledge the coaching pool context — e.g., "Based on 110 chats selected for review" rather than "Based on your team's performance."
- When API integration is live and full-volume data is available, the manual benchmark becomes optional/supplementary, and the dashboard can switch to showing real aggregate stats alongside coaching-focused stats.

**Database considerations:**
- Would likely need a new table (e.g., `organization_benchmarks`) or additional columns on the `organizations` table to store the manually entered stats.
- Fields might include: `monthly_chat_volume`, `five_star_pct`, `four_star_pct`, `three_star_pct`, `two_star_pct`, `one_star_pct`, `benchmark_updated_at`.
- All queries must filter by `organization_id`.

**Plan tier:** This feature benefits all tiers. Consider making it available at the Starter level since it addresses a fundamental data integrity concern.

**Do not build this feature until the user explicitly requests it.** The current dashboard remains functional — this is a context/framing improvement, not a functional gap.

### 10h. Unfair Rating Detection & Adjusted Scoring (Pre-API Integration — Required)

**Purpose:** Automatically detect when a customer's low rating reflects dissatisfaction with the product rather than the agent's performance, and separate those ratings from agent coaching metrics so scores are fair and trustworthy.

**Why this is critical:** Real-world data from the user's team shows that approximately 40% of 1-star rated chats are unfair to the agent — the customer rated the product experience (bugs, limitations, missing features) rather than the agent's handling of the conversation. Some ratings even explicitly state this (e.g., "The agent was helpful but your software is terrible"). The team currently removes these manually. When API integration (Section 10c) goes live and ingests all conversations automatically, this manual process won't scale. Without automated handling, agent scores will be artificially deflated and coaching insights will be unreliable, undermining trust in the entire platform.

**This feature MUST be built before API integration goes live.** It is not optional — without it, API integration will flood agent metrics with unfair data.

**Decided — Scoring approach:**
When a rating is detected as unfair (product-directed rather than agent-directed), the system must support two views:
- **Adjusted scores (default):** Agent metrics, averages, topic stats, coaching insights, and dashboard aggregates exclude chats flagged as unfair-rated. This is the default view across all dashboards and reports.
- **Raw scores (toggle):** Managers can switch to a "raw" view that includes all chats regardless of rating fairness. This provides full transparency and allows managers to audit the system's decisions.

Both views must be available wherever agent scores are displayed: the main dashboard (Section 7c), agent detail pages, topic intelligence (Section 9g), coaching insights by topic (Section 9h), manager reports (Section 7d), and any future reporting features.

**Open Decision — Detection and approval mechanism:**
The user has not yet decided how unfair ratings should be detected and confirmed. The following options are under consideration:

- **Option A: AI flags + manager approval.** The AI flags chats as potentially unfair-rated during analysis. Managers see a review queue and approve or reject each suggestion. Only approved flags affect adjusted scores. This is the most trustworthy approach but requires a review queue UI, per-chat state management, and is more complex to build.

- **Option B: Fully automated.** The AI decides during analysis whether a rating is unfair, and the flag takes effect immediately with no human review. Simpler to build but less transparent. Risk of false positives affecting scores without oversight.

- **Option C: Flag only, manual exclusion.** The AI flags suspicious ratings. Managers manually mark individual chats as excluded from scoring. Maximum control but doesn't scale well — similar to the current manual process.

**Do not build any of these options until the user explicitly chooses one.** The scoring approach (adjusted vs raw) and the data model should be designed to work with any of the three options.

**Data foundation — what already exists:**
- `chat_analyses.product_limitation_chat` (boolean) — already flags when the issue involved a product limitation. This is related but not sufficient: a product limitation chat can still have a fair agent rating.
- `chat_analyses.customer_frustration_present` (boolean) — indicates frustration signals, but doesn't distinguish product-directed vs agent-directed frustration.
- `conversations.rating_value` and `conversations.rating_type` — store the customer's rating.

**What will be needed (design intent — not a build specification):**

AI analysis changes:
- Add a new field to the OpenAI prompt response: `rating_fairness` — with values like `fair`, `unfair_product`, `unfair_unclear`, or a similar classification.
- Optionally add `rating_fairness_reason` — a short AI-generated explanation of why the rating was flagged (e.g., "Customer explicitly stated the agent was helpful but rated 1 star due to a software bug").
- This extends the existing single OpenAI call — no additional API calls needed.

Database changes:
- New column on `chat_analyses`: `rating_fairness` (text) — stores the AI's classification.
- New column on `chat_analyses`: `rating_fairness_reason` (text) — stores the AI's explanation.
- If Option A (manager approval) is chosen: additional column `rating_fairness_confirmed` (boolean or text) — stores whether a manager has reviewed and confirmed/overridden the AI's classification. Default `null` (unreviewed).
- These columns must be added using safe migration rules (Section 1d).

Dashboard changes:
- All aggregate score queries must support an `exclude_unfair` parameter (default `true`) that filters out chats where the rating was classified as unfair (and confirmed, if Option A).
- A toggle in the dashboard UI switches between adjusted and raw views.
- The adjusted view should show a subtle indicator of how many chats were excluded (e.g., "Showing adjusted scores — 47 chats excluded due to unfair ratings").
- If Option A: A review queue page where managers can see flagged chats, read the AI's reasoning, and approve/reject.

Impact on other features:
- Section 7c (Dashboard): Aggregate stats must respect the adjusted/raw toggle.
- Section 9g (Topic Intelligence): Topic-level stats must respect the toggle.
- Section 9h (Coaching by Topic): Coaching insights must respect the toggle.
- Section 7d (Manager Reports): AI-generated reports should note when adjusted scoring is in effect and how many chats were excluded.
- Section 10g (Manual Benchmark): When manual benchmarks are combined with adjusted scoring, the dashboard context becomes even more accurate.

**Business value:**
- Directly solves a pain point that most support teams experience but have no tooling for.
- Makes agent scoring trustworthy — critical for coaching adoption and manager buy-in.
- Differentiates the product: "SupportCoach AI automatically separates product frustration from agent performance" is a powerful sales message.
- Enables fair performance reviews — agents won't resist a coaching tool that they trust to score them fairly.
- Reduces manual QA overhead (currently ~40% of 1-star ratings are manually reviewed and removed).

**Plan tier:** This feature benefits all tiers. Consider making it available at the Starter level since fair scoring is fundamental to the product's credibility. The review queue (if Option A is chosen) could be gated to Professional or above.

**Do not build any part of this feature until the user has decided on the detection mechanism (Option A, B, or C) and explicitly approves it for development.**

### 10i. Topic Impact Score (Post-MVP Enhancement)

**Purpose:** Add a single prioritized score (0–100) to each topic on the Topic Intelligence Dashboard that answers: "Which product area is hurting customers the most?" This converts support metrics into a business priority ranking that executives and product managers can act on.

**Implementation:** A computed value on the existing topic stats page. No new tables, no new API routes, no schema changes. The formula uses data already returned by `/api/topic-stats`:

```
impact_score =
  (support_volume_percentage * 0.35) +
  (customer_frustration_rate * 0.35) +
  (churn_risk_high_percentage * 0.20) +
  (premature_close_rate * 0.10)
```

Normalize to 0–100. Display as a column on the topic table with severity indicators:
- 75–100: 🔴 Critical
- 50–74: 🟠 High
- 25–49: 🟡 Medium
- 0–24: 🟢 Low

**Estimated effort:** 30 minutes. Formula + column + color logic on the existing topic dashboard page.

**Plan tier:** Professional and above.

**Do not build until the user explicitly approves it for development.**

### 10j. Chat Explorer by Topic (Post-MVP Enhancement)

**Purpose:** Allow managers to see the actual chats behind a topic's analytics. When viewing a topic drill-down, a "View Chats →" link navigates to a filtered list of all analyzed chats classified under that topic.

**Implementation:** A single new page at `src/app/dashboard/topics/[topic]/chats/page.tsx` that queries `chat_analyses` filtered by `chat_type` and `organization_id`, displaying a list with agent name, customer name, quick_summary, attention_priority badge, and a link to `/analysis/[id]` for each chat. No new API routes needed — queries `chat_analyses` directly. The topic drill-down page (`src/app/dashboard/topics/[topic]/page.tsx`) gets a "View Chats →" link added.

**Why this matters:** Connects analytics insights to real coaching evidence. This is typically the moment managers say "I can actually see the chats causing this problem."

**Estimated effort:** 1–2 hours. One new page, one link on an existing page.

**Plan tier:** Professional and above.

**Do not build until the user explicitly approves it for development.**

**Purpose:** Improve consistency of AI-generated topic names in `chat_type` to prevent fragmentation (e.g., "Billing Issue" vs "Billing" vs "Billing Question" all appearing as separate topics).

**Potential approaches:**
- AI-based grouping: A post-processing step that normalizes similar `chat_type` values into canonical topics.
- Managed topic list: Allow orgs to define their own topic taxonomy, and map AI-generated types to the closest match.
- Hybrid: AI suggests a canonical topic from a managed list, with fallback to free-text for new topics.

This will become important as Features 9g and 9h are used in production with larger data volumes. Do not implement until the user requests it or until topic fragmentation becomes a reported problem.

---

## 11. OpenAI Integration Details

### Current Prompt Structure

The worker uses a single OpenAI call per conversation with:
- **Model:** gpt-5.4
- **Temperature:** 0.2
- **System message:** Instructs the AI to act as a support QA coach and return only valid JSON with a defined structure.
- **User message:** The transcript text — either pre-formatted structured transcript (when parsing succeeds) or raw transcript text (fallback when parsing fails).

**Transcript Pre-Formatting:**
When the transcript parser (`parseTranscriptMessages()`) successfully extracts messages, the worker builds a structured transcript using `buildStructuredTranscript()` before sending it to the AI. The structured format is:
```
[10:39:42 AM] AGENT (Umer): Hi Carlos! Good Morning :)
[10:39:53 AM] CUSTOMER (Carlos Ribeiro): Hi I cant find
[10:41:57 AM] CUSTOMER (Carlos Ribeiro): Change Order #235416
```
Each line has a timestamp, sender role (AGENT, CUSTOMER, SYSTEM), sender name, and message text. This eliminates ambiguity in the raw PDF text and ensures the AI correctly maps timestamps to messages and senders.

When parsing fails (`parsedMessages.length === 0`), the worker falls back to sending the raw `transcript_text`. The system prompt includes a fallback instruction telling the AI to construct a timeline manually from raw text before analyzing.

This approach reduces token usage (structured text strips PDF noise like visitor details, browser info, and formatting artifacts) and improves coaching accuracy (the AI no longer misattributes timestamps to wrong messages).

The AI is asked to return:
- `agent_name`, `customer_name`, `chat_type`, `issue_summary`
- `what_you_did_well` (array), `improvement_areas` (array)
- `what_this_chat_really_was`, `how_this_could_be_handled` (array)
- `summary_strengths` (array), `summary_improvements` (array)
- `quick_summary`, `copy_coaching_message`, `attention_priority`
- `scores` object: `empathy`, `clarity`, `ownership`, `resolution_quality`, `professionalism` (1–10)
- `churn_risk` (low, medium, high)
- Boolean flags: `deleted_message`, `missed_confirmation`, `premature_close`, `product_limitation_chat`, `customer_frustration_present`, `escalation_done_well`

### Prompt Quality Rules (Implemented in Current Prompt)

The system prompt includes the following quality and accuracy rules. These are confirmed working and must not be removed or weakened:

**Field-Specific Rules:**
- `chat_type`: Must be a short, Title Case, module-level category name (e.g., "Billing", "Change Orders", "Permissions"). Not overly specific descriptions. Prevents topic fragmentation in Features 9g and 9h.
- `issue_summary`: Must be 1–2 sentences maximum. Describes the customer's problem only — not the resolution.
- `how_this_could_be_handled`: Must contain specific, actionable alternative approaches with example phrasing — not vague advice like "show more ownership."

**Scoring Rubric:**
- All five scores (empathy, clarity, ownership, resolution_quality, professionalism) have explicit band descriptions from 1–10 defining what each score range means.
- This ensures consistent scoring across chats, which is critical for dashboard averages, agent comparisons, and topic-level aggregations.

**Boolean Flag Criteria:**
- All six boolean flags (`deleted_message`, `missed_confirmation`, `premature_close`, `customer_frustration_present`, `escalation_done_well`, `product_limitation_chat`) have explicit assessment criteria defining exactly when to set true vs false.
- `premature_close` specifically requires checking whether the agent sent a check-in, how long they waited, and whether the customer had a fair chance to respond.

**Churn Risk Criteria:**
- Explicit definitions for high, medium, and low churn risk based on customer signals and resolution outcome.

**Factual Accuracy Rules (7 rules):**
1. Timestamp and Response Time Analysis — must calculate and cite exact gaps in minutes and seconds. Never use vague terms like "long gaps" without stating duration. Response time thresholds: under 2 minutes is normal and must not be flagged; 2–4 minutes is notable only if the customer was actively waiting; over 4 minutes with no agent communication should be flagged as a coaching point.
2. Distinguish Agent Delays from Customer Delays — do not blame agents for customer silence.
3. Quote the Transcript — every coaching observation must reference specific messages.
4. Do Not Invent or Exaggerate — do not claim multiple gaps if there was one, do not claim agent failed to update if they did.
5. Credit Before Coaching — acknowledge what the agent did right in an area before coaching on what they missed.
6. Connect Timing to Outcome — if a customer disengaged after a delay, explicitly connect the two.
7. Truncated Message Handling — if a message appears cut off, note it rather than judging incomplete text.

**Coaching Message Format:**
- 250–450 words, specific section order (What You Did Well → Where to Improve → What This Chat Really Was → Summary).
- Must include chat reference number/ID if present in transcript.
- Improvement points must cite specific timestamps, durations, and message quotes.
- Summary bullet points must be specific, not vague generalities.

### Rules for Modifying the OpenAI Integration
- Use a single OpenAI call per conversation unless the developer explicitly requests otherwise.
- The response must be requested as structured JSON to avoid parsing errors.
- Before modifying the OpenAI call pattern, the AI assistant must inspect the existing worker code (`src/app/api/process-jobs/route.ts`) to understand the current prompt.
- Do not change the OpenAI prompt structure, model, or response format unless the change is required by the current task.
- **Do not remove or weaken any of the Prompt Quality Rules listed above.** These rules exist to ensure coaching accuracy and scoring consistency across the platform. If a change to the prompt is needed, it must preserve all existing quality rules unless the user explicitly approves their removal.

### OpenAI Prompt Location
- The transcript analysis prompt lives inside the worker implementation at `src/app/api/process-jobs/route.ts`.
- Do not automatically create new prompt files, prompt template modules, configuration layers, or prompt managers.
- Keep the prompt inline with the worker until the developer requests a dedicated prompt system.

---

## 12. Current Development Phase

### What was confirmed by code inspection

The worker (`src/app/api/process-jobs/route.ts`) already implements:
- ✅ Conversation creation
- ✅ Message parsing and storage
- ✅ AI analysis with structured JSON prompt
- ✅ `quick_summary` generation (AI + fallback)
- ✅ `copy_coaching_message` generation (AI + fallback)
- ✅ `attention_priority` computation (AI + point-scoring fallback)
- ✅ Participant name inference

The worker still needs these fixes (detailed in Section 8):
- ✅ Fix 8a: Idempotency check — confirmed applied in current codebase
- ✅ Fix 8b: Immediate `processing` status claim per item — confirmed applied
- ✅ Fix 8c: `source_type` fix — confirmed applied (0 records with old value)
- ⚠️ Fix 8d: Item status fix — partially applied. New records use "completed" but 61 legacy records had "done" (manual SQL cleanup needed). UI file `src/app/jobs/[id]/page.tsx` status TBD.
- ✅ Fix 8e: Partial parsing improvement — confirmed applied in current parser
- ⚠️ Fix 8f: Duplicate transcript detection — SQL migration done (`transcript_hash` column exists), but implementation in `create-analysis-job/route.ts` needs verification
- ❌ Fix 8g: Re-classify `chat_type` on existing records — route exists but needs to be run
- ✅ Fix 8h: Sender misattribution fix — `knownSenderNames` set confirmed in current parser

### Immediate Next Task

Apply the six fixes listed in Section 8. This is a multi-file change affecting:

| File | Fixes |
|---|---|
| `src/app/api/process-jobs/route.ts` | 8a, 8b, 8c, 8d, 8e |
| `src/app/jobs/[id]/page.tsx` | 8d only (two string replacements) |
| `src/app/api/create-analysis-job/route.ts` | 8f (duplicate detection) |
| `src/app/api/reclassify-topics/route.ts` | 8g (new file — one-time migration) |

SQL migration needed for Fix 8f only (add `transcript_hash` column + index to `analysis_job_items`).

**Implementation order:**
1. Back up both files before making changes.
2. Update `src/app/api/process-jobs/route.ts` with all five fixes.
3. Update `src/app/jobs/[id]/page.tsx` with the two `"done"` → `"completed"` replacements.
4. Test.

**Testing after implementation:**
1. Upload a new PDF transcript and create a job.
2. Trigger the worker.
3. Go to `/jobs/{id}` — confirm items show "completed" with green badges.
4. Confirm "View Analysis →" links appear on completed items.
5. Go to `/dashboard` — confirm the new analysis appears with scores and coaching data.
6. Trigger the worker again — confirm no duplicate conversations or analyses are created (idempotency check).
7. Upload the same PDF again — confirm the system rejects it as a duplicate with a clear message (duplicate detection check).
8. Upload a batch where one file is new and one is a duplicate — confirm only the new file creates a job item.

### After Fixes — Remaining Sprint Work

Once the Section 8 fixes are applied, the remaining sprint work is:

**UI surfacing (from original sprint):**
- Surface `quick_summary` in the dashboard and/or analysis detail view.
- Add copy-to-clipboard for `copy_coaching_message`.
- Display `attention_priority` badges in the dashboard.
- Optionally add a "Chats Needing Attention" filtered view.
- Optionally add "This Month" / "Last Month" date range options.

**New feature builds (approved for current sprint):**
- Feature 9g: Topic / Module Intelligence Dashboard — new API routes + dashboard page.
- Feature 9h: Coaching Insights by Topic — new API routes (or extensions of 9g routes) + dashboard UI.

**Recommended build order for new features:**
1. Build the `/api/topic-stats` route first — this validates the data aggregation approach.
2. Build the topic overview UI page.
3. Add agent-by-topic drill-down (may extend the API or add `/api/topic-agent-stats`).
4. Add coaching insights (9h) — either as an extension of the topic page or as a separate tab/page.
5. Add pattern detection logic (comparing topic rates to org averages).

---

## 13. Goal of This Thread

**SCOPE IS LOCKED. MVP TARGET: 2 WEEKS.**

This master document defines the complete, final scope of work for the MVP. Do not suggest, design, or build anything outside of what is documented here. If the user wants to add or change scope, they will provide an updated master prompt or explicitly approve the change.

Continue development from this architecture forward. Do not redesign the system unless the user explicitly requests it. Focus exclusively on:

1. Applying the confirmed fixes in Section 8.
2. Surfacing the already-implemented features (`quick_summary`, `copy_coaching_message`, `attention_priority`) in the dashboard UI.
3. Building the Topic Intelligence Dashboard (9g) and Coaching Insights by Topic with Pattern Cards (9h) as new Professional-tier features.
4. Preserving every existing working feature in Section 7.

Do not build roadmap items from Section 10 (including FAQ Suggestions, helpdesk integrations, coaching history, observability, topic normalization, manual benchmarks, or unfair rating detection) unless the user explicitly requests them. These are documented for future reference only.

**Every response should move toward shipping the MVP. Do not expand scope. Do not suggest enhancements. Build what is specified, test it, and move to the next task.**

---

## 14. Plan Tiers & Feature Access (Architectural Intent Only)

**STATUS: DESIGN ONLY — NO GATING LOGIC IMPLEMENTED**

Billing infrastructure (Stripe) is not yet set up. No plan-based access control exists in the codebase. All features are currently accessible to all users during the build phase. This section documents the intended tier structure so that when billing is implemented, there is a clear blueprint for what to gate.

**Do not build any plan-gating logic, subscription checks, or tier-based access control unless the user explicitly asks.** Do not add a `plan` or `tier` column to any table unless the user approves it. Do not create Stripe integration code unless the user requests it.

### Tier Structure

**Starter — $29/agent/month**

Target: Small support teams (5–15 agents) who want AI-powered QA without hiring a QA specialist.

Included features:
- PDF upload and transcript analysis (Section 7a, 7b)
- Core coaching analysis: `quick_summary`, `copy_coaching_message`, `attention_priority`
- Analysis detail view (individual chat deep-dive)
- Manager dashboard with team averages, trends, and score visualizations (Section 7c)
- Agent leaderboard and single-agent views
- Date range filtering (All Time, Last 7 Days, Last 30 Days)
- Manager reports — AI-generated (Section 7d)
- PDF report export (Section 7e)
- CSV data export
- Job management pages (Section 7g)
- Auth, onboarding, and org management (Section 7f)
- Manual benchmark input for team health context (Section 10g, when built) — available at all tiers

**Professional — $59/agent/month**

Target: Mid-market support teams (15–50 agents) with dedicated support managers who need strategic visibility into support operations.

Includes everything in Starter, plus:
- Topic / Module Intelligence Dashboard (Section 9g) — topic-level volume, scores, flags, and agent breakdowns
- Coaching Insights by Topic (Section 9h) — coaching pattern detection, team-wide coaching trends, agent performance by topic
- "This Month" / "Last Month" date range options
- "Chats Needing Attention" filtered view

**Enterprise — $99/agent/month**

Target: Larger organizations (50–200+ agents) where self-service deflection and cross-platform analysis justify premium pricing.

Includes everything in Professional, plus:
- AI-Generated FAQ Suggestions from Chat Data (Section 10e) — question clustering, draft answers, approval workflow
- Helpdesk integrations (Section 10c) — Zendesk, Intercom, Freshdesk, HubSpot (when built)
- Topic normalization / managed topic taxonomies (Section 10f, when built)
- API access (future)
- SSO (future)
- Priority support

### Implementation Notes (for when billing is built)

When the user is ready to implement billing and plan gating, the following steps will be needed:

1. **Database:** Add a `plan` column to the `organizations` table (or create a `subscriptions` table linking org to plan + Stripe subscription ID).
2. **Stripe integration:** Set up Stripe products, prices, and a webhook to sync subscription status to Supabase.
3. **Access control helper:** Create a utility (e.g., `src/lib/planAccess.ts`) that checks an org's current plan and returns which features are available.
4. **API route gating:** Wrap Professional/Enterprise API routes (e.g., `/api/topic-stats`, `/api/topic-coaching-stats`) with plan checks. Return a 403 with an upgrade message if the org's plan doesn't include the feature.
5. **UI gating:** On dashboard pages, check the org's plan. If a feature is above their tier, show a preview or placeholder with an upgrade prompt instead of the full UI.
6. **Default plan:** New organizations should default to a free trial or Starter plan.

These steps are documented here for future reference only. Do not implement any of them until the user explicitly requests it.

---

## End of Master Development Context