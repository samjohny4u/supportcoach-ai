# SUPPORTCOACH AI — CONTEXT FILE
# Last updated: March 22, 2026

## PROJECT STATUS
- **Phase:** Live in Production — Paddle integration and UI polish remaining
- **All MVP features are DONE**
- **RLS security is ENABLED on all tables**
- **Production deployment is LIVE at supportcoach.io**
- **Paddle billing is APPROVED and ready to integrate**
- **Codebase:** GitHub repo, committed and pushed, auto-deploys via Vercel

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
- Section 9k: Company Coaching Context — settings page + worker prompt injection — DONE
- Section 9l: Per-Chat Re-Analyze Button — DONE
- Encoding fix: Dashboard garbled Unicode characters replaced with clean ASCII — DONE
- Upload page: Click to Upload with drag-and-drop and centered Upload and Analyze button — DONE
- Prompt fix: Coaching opening variety — DONE
- Prompt fix: Reduced timestamp obsession — DONE
- RLS policies enabled on all tables — DONE
- Landing page with hero, features, and pricing — DONE
- Pluralization fix across all pages — DONE
- Coaching context bug fix: Worker now fetches and injects coaching_context on first analysis (was only working on re-analyze) — DONE
- Opening variety enforcement: Added explicit "BANNED" rule for "this chat was really about" opening pattern — DONE
- Evidence preservation: Added instruction to maintain evidence-based coaching even when company context is present — DONE
- Production deployment to Vercel — DONE
- Domain supportcoach.io connected — DONE
- Terms of Service page at /terms — DONE
- Privacy Policy page at /privacy — DONE
- Refund Policy page at /refund — DONE
- Customer Support page at /support (with address and phone for Stripe/Paddle compliance) — DONE
- Paddle billing account approved — DONE

## CURRENT TASK
- None active — deciding between Paddle integration and UI polish

## REMAINING BEFORE FULL LAUNCH
1. **Paddle billing integration** — checkout flow, webhooks, plan gating in the app
2. **UI design polish** — fonts, colors, theme consistency (user exploring shadcn/ui)
3. **Stripe billing** — still under review, may use as alternative or backup to Paddle

## KNOWN ISSUES / BLOCKERS
- AI team summary may still produce Unicode bullet characters — the API route strips them but the prompt also instructs plain ASCII
- First save on settings page shows NEXT_REDIRECT before working on second click — minor, not blocking
- Stripe application still under review — Paddle is approved and can be used immediately

## KEY DECISIONS MADE
- Manager-insights route removed (duplicated existing routes)
- Soft delete via `excluded` boolean, not hard delete
- Template-based pattern card narratives, not AI-generated (v1)
- Response time threshold: under 2 min = normal, 2-4 min = notable, over 4 min = coaching point
- Timestamps only cited when timing is actually a coaching point — not as decoration
- Coaching openings must vary naturally — "this chat was really about" pattern is explicitly banned
- Pre-formatted structured transcripts sent to AI instead of raw PDF text
- knownSenderNames set for handling inconsistent PDF spacing
- Company coaching context: manager-provided process knowledge injected into AI prompt per org
- Per-chat re-analyze: one chat at a time, no bulk — intentional cost control
- Two-layer API integration strategy: full metadata ingest + selective AI analysis (Section 10c)
- RLS enabled on all tables. Service role key bypasses RLS. Application-level org filtering maintained as defense-in-depth.
- Paddle approved first — will be primary billing provider. Stripe as backup if approved.
- Deploy first, polish later — app is live and functional, UI improvements happen iteratively.
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
"I'm continuing development of SupportCoach AI. Read docs/RULES.md and docs/CONTEXT.md for current status. The app is live at supportcoach.io. Remaining work: Paddle billing integration and UI design polish."