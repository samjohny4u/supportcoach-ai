# SUPPORTCOACH AI — CONTEXT FILE
# This file is updated after every task completion.
# When starting a new AI thread, paste this file first.
# Last updated: [UPDATE THIS DATE AFTER EACH TASK]

## PROJECT STATUS
- **Phase:** MVP Build
- **Target:** Ship within 2 weeks
- **Codebase:** GitHub repo, committed and pushed

## COMPLETED TASKS
<!-- Move tasks here as they are completed -->
- None yet — starting from Task 0

## CURRENT TASK
- Task 0: Remove manager-insights route and dashboard panel — IN PROGRESS

## REMAINING TASKS
- Task 1: Run topic reclassification (manual — user triggers)
- Task 2: Verify duplicate detection in create-analysis-job
- Task 3: Job display names (human-readable instead of UUIDs)
- Task 4: Worker trigger button rename + auto-trigger
- Task 5: Verify exclude filter coverage across all files
- Task 6: Pattern Cards UI
- Task 7: Surface quick_summary and copy coaching message
- Task 8: Attention priority badges

## KNOWN ISSUES / BLOCKERS
- RLS not enabled on any table (security warning from Supabase — not blocking MVP but must be done before production launch)
- Topic reclassification route exists but hasn't been run yet (Task 1)

## KEY DECISIONS MADE
- Manager-insights route to be removed (duplicates existing routes)
- Soft delete via `excluded` boolean, not hard delete
- Template-based pattern card narratives, not AI-generated (v1)
- Response time threshold: under 2 min = normal, 2-4 min = notable, over 4 min = coaching point
- Pre-formatted structured transcripts sent to AI instead of raw PDF text
- knownSenderNames set for handling inconsistent PDF spacing

## FILES THAT MUST NOT BREAK
- `src/app/api/process-jobs/route.ts` — the core worker. Contains parser, AI prompt, all analysis logic
- `src/app/dashboard/page.tsx` — main dashboard with all panels and filters
- `src/app/api/create-analysis-job/route.ts` — upload pipeline
- `src/lib/currentOrganization.ts` — org resolution for multi-tenancy

## DOCUMENTS TO READ ON NEW THREAD
1. `docs/RULES.md` — standing orders (read first, always)
2. `docs/codex-orchestration.md` — current task list with statuses
3. `docs/supportcoach-ai-context.md` — full master prompt (read relevant sections, not the whole thing)
4. `docs/CONTEXT.md` — this file (current progress and decisions)

## NEW THREAD STARTER MESSAGE
Copy this when starting a fresh thread:

"I'm continuing development of SupportCoach AI. Read these files from the repo in this order:
1. docs/RULES.md
2. docs/CONTEXT.md
3. docs/codex-orchestration.md
Then start on the current task listed in CONTEXT.md."