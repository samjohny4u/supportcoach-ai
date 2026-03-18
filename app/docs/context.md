# SUPPORTCOACH AI — CONTEXT FILE
# Last updated: March 18, 2026

## PROJECT STATUS
- **Phase:** MVP Feature-Complete + Post-MVP Polish
- **All 10 MVP tasks (0-9) are DONE**
- **Currently:** Fixing UI polish issues and adding company coaching context

## COMPLETED TASKS
- Task 0: Remove manager-insights route and dashboard panel — DONE
- Task 1: Run topic reclassification — DONE
- Task 2: Verify duplicate detection in create-analysis-job — DONE
- Task 3: Human-readable job titles and verified status badges — DONE
- Task 4: Worker trigger button rename + auto-trigger — DONE
- Task 5: Verify exclude filter coverage across all files — DONE
- Task 6: Pattern Cards UI — DONE
- Task 7: Surface quick_summary and copy coaching message — DONE
- Task 8: Attention priority badges — DONE
- Task 9: Global error boundary and 404 page — DONE
- Encoding fix: Dashboard garbled Unicode characters replaced with clean ASCII — DONE
- Upload page: Click to Upload with drag-and-drop and centered Upload and Analyze button — DONE
- Prompt fix: Coaching opening variety (no more repetitive "this chat was really about") — DONE
- Prompt fix: Reduced timestamp obsession (only cite timing when it's a coaching point) — DONE

## CURRENT TASK
- Section 9k: Company Coaching Context — settings page + worker integration
- Section 9l: Per-Chat Re-Analyze Button — companion to 9k

## REMAINING BEFORE PRODUCTION LAUNCH
1. **Section 9k: Company Coaching Context** — SQL migration, settings page, worker prompt injection. See master prompt Section 9k.
2. **Section 9l: Per-Chat Re-Analyze** — API route, analysis page button. See master prompt Section 9l.
3. **RLS policies on all Supabase tables** — CRITICAL SECURITY
4. **UI design polish** — fonts, colors, theme consistency (user exploring shadcn/ui and Tremor)
5. **Landing page**
6. **Stripe billing integration**
7. **Production deployment**

## KNOWN ISSUES / BLOCKERS
- RLS not enabled on any table (Supabase security warning active)
- AI team summary may still produce Unicode bullet characters — the API route strips them but the prompt also instructs plain ASCII

## KEY DECISIONS MADE
- Manager-insights route removed (duplicated existing routes)
- Soft delete via `excluded` boolean, not hard delete
- Template-based pattern card narratives, not AI-generated (v1)
- Response time threshold: under 2 min = normal, 2-4 min = notable, over 4 min = coaching point
- Timestamps only cited when timing is actually a coaching point — not as decoration
- Coaching openings must vary naturally — no repetitive "this chat was really about" pattern
- Pre-formatted structured transcripts sent to AI instead of raw PDF text
- knownSenderNames set for handling inconsistent PDF spacing
- Company coaching context: manager-provided process knowledge injected into AI prompt per org
- Two-layer API integration strategy: full metadata ingest + selective AI analysis (Section 10c)
- If a fix attempt fails, STOP. Do not cascade fixes.

## FILES THAT MUST NOT BREAK
- `src/app/api/process-jobs/route.ts` — the core worker
- `src/app/dashboard/page.tsx` — main dashboard
- `src/app/api/create-analysis-job/route.ts` — upload pipeline
- `src/lib/currentOrganization.ts` — org resolution for multi-tenancy

## DOCUMENTS TO READ ON NEW THREAD
1. `docs/RULES.md` — standing orders (read first, always)
2. `docs/CONTEXT.md` — this file
3. `docs/codex-orchestration.md` — completed task list (reference only)
4. `docs/supportcoach-ai-context.md` — full master prompt

## NEW THREAD STARTER MESSAGE
"I'm continuing development of SupportCoach AI. Read docs/RULES.md and docs/CONTEXT.md for current status. I'm working on the company coaching context feature (Section 9k of the master prompt)."