# SUPPORTCOACH AI — STANDING ORDERS
# Read this file FIRST before any code execution.
# This file must stay under 200 lines.

## WHAT THIS PRODUCT IS
SupportCoach AI is a multi-tenant SaaS that analyzes support chat transcripts
and generates coaching feedback for managers. Built with Next.js, Supabase,
OpenAI, TypeScript, Tailwind CSS. Billing via Paddle.

## MANDATORY RULES — NEVER VIOLATE

### Code Safety
1. Read the full file before editing it. Never assume contents.
2. Make only the changes needed for the current task.
3. Do not refactor, redesign, or reorganize code unless explicitly asked.
4. Do not suggest features, enhancements, or scope changes.
5. Do not invent files, helpers, schema fields, or routes that don't exist.
6. When done with a task, say "Done" and stop. Do not suggest what to build next.

### Version Control
7. Before starting a task that modifies more than 1 file, run: `git add -A && git commit -m "Pre-task savepoint: Task N"`
8. After completing a task, commit with: `git commit -m "Task N: description"`
9. If a task modifies more than 3 files, commit after each file change — not at the end.
10. Push after every completed task: `git push origin main`

### Database Safety
11. Always use `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`.
12. Always use `CREATE TABLE IF NOT EXISTS`.
13. Never drop columns or tables.
14. Every query must filter by `organization_id` — no exceptions.
15. Every query on `chat_analyses` must include `.eq('excluded', false)` unless managing exclusions.
16. Do not assume RLS policies are active. Always filter at application level.

### Security — CRITICAL
17. NEVER log, print, or console.log customer emails, payment info, passwords, API keys, or personally identifiable information (PII).
18. NEVER store payment information in the database. All payment processing goes through Paddle.
19. NEVER expose `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `PADDLE_API_KEY`, or `PADDLE_WEBHOOK_SECRET` in client-side code or browser-accessible responses.
20. All API routes that access user data must verify the request is authenticated and scoped to the correct organization.

### Defensive Coding
21. Use defensive string handling: `typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback`
22. Handle null, undefined, and empty arrays in all database query results.
23. Never trust client-supplied data without validation.

### Error Handling
24. Every page must have error handling that shows a user-friendly message — never a white screen.
25. API routes must return proper JSON error responses with appropriate HTTP status codes.
26. Wrap all database operations and API calls in try/catch blocks.

### When Things Break
27. If a change breaks the build (TypeScript errors, runtime crashes), STOP immediately.
28. Do not attempt to fix cascading errors by making more changes.
29. Report: what file was changed, what the error is, and what the previous state was.
30. The user can revert with: `git checkout HEAD~1 -- path/to/file`

### Pluralization
31. Always pluralize correctly when displaying counts. Use `{count === 1 ? "chat" : "chats"}` pattern. Never show "1 chats", "1 files", "1 agents", etc.

### Billing / Paddle
32. The Paddle webhook at `/api/paddle-webhook` must always return 200 to acknowledge receipt — even on errors. Paddle retries on non-2xx.
33. Paddle webhook signature must be verified before processing any event.
34. The `subscriptions` table is the source of truth for billing status. The `organizations.plan` column is a convenience cache updated by the webhook.
35. Client-side pages (select-plan, TrialBanner) must use the Supabase browser client (`src/lib/supabase.ts`) to read org/subscription data — NOT the `/api/subscription-status` route (which has cookie issues with client-side fetch in Route Handlers).
36. Price IDs are defined in `src/lib/paddle.ts` in the `PADDLE_PRICE_MAP` and `PLAN_PRICES` constants. If prices change in Paddle, update both places.
37. The middleware subscription lock check must fail open (allow access) on errors — never lock paying customers out due to a DB glitch.

## PAST MISTAKES TO AVOID
These happened during development and must not be repeated:

- ChatGPT invented `CopyCoachingButton.tsx` when the real file was `CopyButton.tsx` — always check actual file names.
- ChatGPT built `/api/manager-insights` outside the approved scope — never build features not in the orchestration prompt or master prompt.
- The parser attributed messages to the wrong sender due to inconsistent PDF spacing — always test parser changes against real transcript data.
- AI coaching flagged a 1-minute response time as slow — response times under 2 minutes are normal for live chat, do not coach on them.
- AI coaching said "several long gaps" without citing timestamps — every coaching claim must be backed by specific transcript evidence.
- ChatGPT kept suggesting new features after scope was locked — Rule 1j exists for a reason. Follow it.
- Used `createServerComponentClient` from `@supabase/auth-helpers-nextjs` which doesn't exist in the installed package — always use `createSupabaseServer` from `src/lib/supabaseServer.ts` for server-side auth.
- Paddle.Initialize() was called with `environment` (lowercase) — Paddle v2 SDK does not accept this parameter. Remove it.
- subscription-status API route returned 401 from client-side fetch due to Route Handler cookie handling — use Supabase browser client directly in client components instead.

## SCOPE
The orchestration prompt at `docs/codex-orchestration.md` defines the current task list.
The master prompt at `docs/supportcoach-ai-context.md` defines the architecture.
Do not build anything outside these documents.

## CONTEXT WINDOW WARNING
If this conversation is getting long (50+ messages or you are losing track of earlier context):
1. Stop the current task.
2. Commit all current work.
3. Update the task status in `docs/codex-orchestration.md`.
4. Tell the user: "Context is getting long. Recommend starting a fresh thread. Current progress is saved in the repo."