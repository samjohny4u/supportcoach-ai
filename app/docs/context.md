# SUPPORTCOACH AI — CONTEXT FILE
# Last updated: March 18, 2026

## PROJECT STATUS
- **Phase:** MVP FEATURE-COMPLETE
- **All 10 MVP tasks (0–9) are DONE**
- **Codebase:** GitHub repo, committed and pushed

## COMPLETED TASKS
- Task 0: Remove manager-insights route and dashboard panel — DONE
- Task 1: Run topic reclassification — DONE
- Task 2: Verify duplicate detection in create-analysis-job — DONE (already implemented)
- Task 3: Human-readable job titles and verified status badges — DONE
- Task 4: Worker trigger button rename + auto-trigger — DONE
- Task 5: Verify exclude filter coverage across all files — DONE (already implemented)
- Task 6: Pattern Cards UI — DONE
- Task 7: Surface quick_summary and copy coaching message — DONE
- Task 8: Attention priority badges — DONE
- Task 9: Global error boundary and 404 page — DONE

## CURRENT PHASE
- **Pre-production hardening and launch preparation**
- No new features. Focus on security, deployment, and billing infrastructure.

## REMAINING BEFORE PRODUCTION LAUNCH
These are NOT feature tasks. These are launch prerequisites:

1. **RLS policies on all Supabase tables** — CRITICAL SECURITY. Must be done before any customer uses the product. Tables needing RLS: analysis_jobs, analysis_job_items, chat_analyses, conversations, conversation_messages, organizations, organization_memberships.

2. **UTF-8 encoding bug** — AI team summary bullet points render as garbled text on dashboard. Pre-existing, cosmetic. Do NOT attempt cascading fixes — six previous attempts made it worse and were reverted. Needs a focused, single-pass fix after understanding the root cause (likely double-encoding in the OpenAI response → JSON parse → render pipeline).

3. **Landing page** — Public-facing page explaining the product, pricing tiers (Starter $29, Professional $59, Enterprise $99 per agent/month), and signup CTA.

4. **Stripe billing integration** — Products, prices, checkout, webhooks, subscription sync to Supabase. Plan gating on Professional/Enterprise features. See Section 14 of master prompt.

5. **Production deployment** — Vercel or Railway. Environment variables, production Supabase project, domain setup.

## KNOWN ISSUES / BLOCKERS
- RLS not enabled on any table (Supabase security warning active)
- Character encoding issue: AI team summary bullet points render as garbled UTF-8 on dashboard. Pre-existing, cosmetic. The garbled text (ÃƒÂ¢) is a bullet point character (•) double-encoded through UTF-8. Six fix attempts reverted. Do NOT re-attempt without first identifying the exact encoding stage where double-encoding occurs.

## KEY DECISIONS MADE
- Manager-insights route removed (duplicated existing routes)
- Soft delete via `excluded` boolean, not hard delete
- Template-based pattern card narratives, not AI-generated (v1)
- Response time threshold: under 2 min = normal, 2-4 min = notable, over 4 min = coaching point
- Pre-formatted structured transcripts sent to AI instead of raw PDF text
- knownSenderNames set for handling inconsistent PDF spacing
- Worker button renamed to "Process Now" with states
- Plan tiers documented as architecture intent only — no gating until Stripe is ready
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
"I'm continuing development of SupportCoach AI. The MVP is feature-complete. Read docs/RULES.md and docs/CONTEXT.md for current status. I'm working on pre-production launch tasks."