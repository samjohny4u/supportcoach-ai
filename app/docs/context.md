# SUPPORTCOACH AI — CONTEXT FILE
# This file is updated after every task completion.
# When starting a new AI thread, paste this file first.
# Last updated: March 18, 2026

## PROJECT STATUS
- **Phase:** MVP Build
- **Target:** Ship within 2 weeks
- **Codebase:** GitHub repo, committed and pushed

## COMPLETED TASKS
- Task 0: Remove manager-insights route and dashboard panel — DONE
- Task 1: Run topic reclassification — PENDING (route exists, user needs to trigger manually)
- Task 2: Verify duplicate detection in create-analysis-job — DONE (already implemented)
- Task 3: Human-readable job titles and verified status badges — DONE
- Task 4: Worker trigger button rename + auto-trigger — DONE
- Task 5: Verify exclude filter coverage across all files — DONE (already implemented across all 12 files)
- Task 6: Pattern Cards UI — DONE

## CURRENT TASK
- Task 7: Surface quick_summary and copy coaching message

## REMAINING TASKS
- Task 7: Surface quick_summary and copy coaching message
- Task 8: Attention priority badges
- Task 9: Global error boundary and 404 page

## KNOWN ISSUES / BLOCKERS
- RLS not enabled on any table (security warning from Supabase — not blocking MVP but must be done before production launch)
- Topic reclassification route exists but hasn't been run yet (Task 1)
- Character encoding issue: AI team summary bullet points render as garbled UTF-8 on dashboard. Pre-existing, cosmetic only. The garbled text (ÃƒÂ¢) is a bullet point character (•) double-encoded through UTF-8. Fix after MVP tasks are complete — do NOT attempt cascading fixes on this.
- Six cascading fix attempts on the encoding issue were reverted. Dashboard restored to post-Task-3 clean state. Do not re-attempt until all MVP tasks are complete.

## KEY DECISIONS MADE
- Manager-insights route removed (duplicated existing routes, no org security, unnecessary AI cost)
- Soft delete via `excluded` boolean, not hard delete
- Template-based pattern card narratives, not AI-generated (v1)
- Response time threshold: under 2 min = normal, 2-4 min = notable, over 4 min = coaching point
- Pre-formatted structured transcripts sent to AI instead of raw PDF text
- knownSenderNames set for handling inconsistent PDF spacing
- Worker button renamed to "Process Now" with states (default, processing, done)
- If a fix attempt fails, STOP. Do not cascade fixes. Report the error and let the user decide.
- Pattern cards use template-based narratives, NOT AI calls. Six signal templates defined in master prompt Section 9h.

## FILES THAT MUST NOT BREAK
- `src/app/api/process-jobs/route.ts` — the core worker. Contains parser, AI prompt, all analysis logic
- `src/app/dashboard/page.tsx` — main dashboard with all panels and filters
- `src/app/api/create-analysis-job/route.ts` — upload pipeline
- `src/lib/currentOrganization.ts` — org resolution for multi-tenancy

## TASK 6 SPECIFIC CONTEXT
- Pattern cards go in the existing topic drill-down page: `src/app/dashboard/topics/[topic]/page.tsx`
- No new API routes needed — reads from existing `chat_analyses` data
- No database changes needed
- Template narratives and recommendations are defined in Section 9h of the master prompt (docs/supportcoach-ai-context.md)
- Six signal templates: premature_close, customer_frustration_present, low resolution_quality, low ownership, missed_confirmation, low empathy
- Minimum 3 chats per agent+topic before generating a card
- Confidence levels: High (7+), Medium (5-6), Low (3-4)
- Severity order: customer_frustration > premature_close > low resolution_quality > low empathy > missed_confirmation > low ownership
- Pattern detection: compare agent+topic flag rates against org-wide averages. Flag if >1.5x org average for booleans or >1 point below average for scores.

## DOCUMENTS TO READ ON NEW THREAD
1. `docs/RULES.md` — standing orders (read first, always)
2. `docs/CONTEXT.md` — this file (current progress and decisions)
3. `docs/codex-orchestration.md` — current task list with statuses
4. `docs/supportcoach-ai-context.md` — Section 9h specifically for Task 6

## NEW THREAD STARTER MESSAGE
Copy this when starting a fresh thread:

"I'm continuing development of SupportCoach AI. Read these files from the repo in this order:
1. docs/RULES.md
2. docs/CONTEXT.md
3. docs/codex-orchestration.md
Then read Section 9h (Pattern Cards) from docs/supportcoach-ai-context.md.
Then read the current file: src/app/dashboard/topics/[topic]/page.tsx
Start Task 6."
