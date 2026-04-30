# SUPPORTCOACH AI — CONTEXT FILE
# Last updated: April 30, 2026

## PROJECT STATUS
- **Phase:** Live in Production — Paddle billing fully verified end-to-end, landing page and nav complete. Phase 2 (Coaching Effectiveness Tracker) about to begin.
- **All MVP features are DONE**
- **RLS security is ENABLED on all tables**
- **Production deployment is LIVE at supportcoach.io**
- **Paddle billing is FULLY WORKING — checkout, webhooks, database updates all verified**
- **Codebase:** GitHub repo, committed and pushed, auto-deploys via Vercel
- **Active build:** Phase 2 — Coaching Effectiveness Tracker (6 tasks per `docs/codex-orchestration.md`)

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
- Paddle billing integration code — DONE (all files built and deployed)
  - SQL migration: subscriptions table + plan/trial_ends_at columns on organizations — DONE
  - Environment variables: PADDLE_API_KEY, PADDLE_WEBHOOK_SECRET, NEXT_PUBLIC_PADDLE_CLIENT_TOKEN, NEXT_PUBLIC_PADDLE_ENVIRONMENT — DONE
  - src/lib/paddle.ts — price mapping, webhook verification — DONE
  - src/lib/planAccess.ts — plan gating logic, feature access per tier — DONE
  - src/app/api/paddle-webhook/route.ts — webhook receiver for subscription lifecycle — DONE
  - src/app/api/subscription-status/route.ts — returns org plan and access status — DONE
  - src/app/select-plan/page.tsx — plan selection with seat picker and Paddle checkout overlay — DONE
  - src/components/TrialBanner.tsx — trial countdown banner on dashboard — DONE
  - src/app/dashboard/billing/page.tsx — billing management page — DONE
  - src/app/onboarding/page.tsx — redirects to /select-plan after org creation — DONE
  - src/app/api/onboarding/route.ts — sets plan='trial' and trial_ends_at on new orgs — DONE
  - middleware.ts — subscription/trial lock check, redirects expired trials to /select-plan — DONE
  - src/app/dashboard/page.tsx — TrialBanner component added — DONE
  - Paddle products and prices created in dashboard (3 products × 2 prices each) — DONE
  - Paddle webhook endpoint configured pointing to https://www.supportcoach.io/api/paddle-webhook — DONE
- Paddle billing end-to-end verified (March 25, 2026) — DONE
  - Root cause of 400 error: default payment link URL was not saved in Paddle dashboard
  - Fix: set default payment link to https://www.supportcoach.io/select-plan in Paddle Checkout Settings
  - Root cause of webhook failures: webhook URL was set to non-www (https://supportcoach.io) causing 308 redirect — Paddle does not follow redirects
  - Fix: updated webhook URL to https://www.supportcoach.io/api/paddle-webhook (with www)
  - Full flow verified: checkout overlay → card processed → webhook delivered → organizations.plan updated to 'starter' → subscriptions table populated
  - Test subscription cancelled before April 8th charge date
- Landing page polish (March 25, 2026) — DONE
  - Annual/monthly pricing toggle with "2 months free" badge — DONE
  - Professional plan highlighted with green border and "Most Popular" badge — DONE
  - All pricing card bullet dots changed to consistent teal — DONE
  - ROI stats bar added above pricing toggle ($40,000+/mo, 1,000+ hrs, 40x ROI) — DONE
  - FAQ section added with 9 accordion questions — DONE
  - Footer added with Terms, Privacy, Refund, Support links and copyright — DONE
  - src/app/page.tsx converted to "use client" for toggle state — DONE
- Auth-aware nav (March 25, 2026) — DONE
  - Landing page (/) has its own nav built in — logged-out shows Features/Pricing/Login/Get Started, logged-in shows Dashboard/Logout
  - Logo on landing page links to / when logged out, /dashboard when logged in
  - src/components/AppNav.tsx created — app-wide nav shown on all pages except /
  - AppNav shows Upload/Dashboard/Settings/Logout on all interior pages
  - Logo in AppNav always links to /dashboard
  - Settings link points to /settings (not /dashboard/settings)
  - src/app/layout.tsx updated to use AppNav
  - Fixed multiple GoTrueClient instances bug — landing page now uses shared supabase client from src/lib/supabase.ts instead of creating a new instance
- Extension landing page added to Manager Dashboard repo (March 26, 2026) — DONE
  - src/app/extension/page.tsx — public-facing marketing landing page for the Chrome Extension product, lives at supportcoach.io/extension
  - src/app/api/extension-waitlist/route.ts — public POST endpoint, inserts into extension_waitlist Supabase table
  - Supabase table: extension_waitlist (id, email unique, company_name, team_size, created_at) — RLS enabled, service role only
  - Page is fully self-contained — no shared nav, no dashboard auth, no shared components
  - Page contains: hero, mock coaching card, 3 layers feature section, platform compatibility, demo video placeholder, waitlist form, footer CTA to /
  - These files are ISOLATED — do not modify unless explicitly asked
- Live Agent Coach nav link added to homepage (March 28, 2026) — DONE
  - LoggedOutNav: "Live Agent Coach" link added between Pricing and Login, points to /extension
  - LoggedInNav: "Live Agent Coach" link added before Dashboard, points to /extension
  - src/app/page.tsx updated — no other changes made to this file
- Prompt enhancements (April 27, 2026) — DONE
  - Abandoned chat detection: customer sends initial question, agent connects and responds, customer never replies — all scores set to 7, attention set to low, brief "no coaching needed" message instead of full coaching, array fields kept minimal
  - Screen sharing / remote session detection: when transcript contains a remote session URL (join.zoho.com, zoom.us, meet.google.com, teamviewer.com, anydesk.com) followed by a 5+ minute gap, assume live session and do not coach on the gap
  - Transcript completeness awareness: when transcript is incomplete (remote session, channel switch to email/phone, bot answered before agent connected, invisible handoff), explicitly acknowledge it and only coach on visible portions
  - Hard timestamp citation limit: max 2-3 timestamp citations per coaching message, only when timing is the actual coaching point — quotes about content/tone/phrasing/empathy/clarity must be without timestamps
  - Updates applied to both src/app/api/process-jobs/route.ts and src/app/api/reanalyze/route.ts
  - Only affects new analyses going forward — existing analyses keep old coaching messages until re-analyzed via per-chat button
- Documentation sync for Phase 2 (April 30, 2026) — DONE
  - codex-orchestration.md rewritten with 6-task Phase 2 plan
  - supportcoach-ai-context.md fully synced with Section 10k design (schema, prompt, file structure, plan tiers)
  - This CONTEXT.md updated to reflect new Section 10k design (was previously the older 4-layer design)

## CURRENT TASK
- **Active build: Phase 2 — Coaching Effectiveness Tracker (Section 10k).** 6-task plan in docs/codex-orchestration.md. About to start Task 1 (database schema + Copy auto-check).
- Trial extended to 30 days via SQL for Bangkok travel (April 6–17, 2026)

## REMAINING BEFORE FULL LAUNCH
1. **Coaching Effectiveness Tracker (Section 10k Phase 2)** — 6 tasks, in active build. See orchestration doc.
2. **UI design polish** — dashboard interior pages (fonts, colors, theme consistency). Landing page is complete.
3. **Plan gating enforcement** — API routes and dashboard pages do not yet check plan tier. Professional/Enterprise features accessible to all plans. Gating to be added after billing is confirmed stable. Section 10k lookback window will be one of the things gated when this is done.
4. **Duplicate PDF link** — when upload detects a duplicate, show a "View Analysis →" link to the existing analysis detail page. Small change to upload/page.tsx and create-analysis-job/route.ts. Approved for build post-Bangkok.
5. **Password change flow** — Phase 2 item, post-Bangkok
6. **Self-signup improvements** — Phase 2 item, post-Bangkok
7. **Agent management** — Phase 2 item, post-Bangkok

## PHASE 2 — COACHING EFFECTIVENESS TRACKER (Active Build)

**Reference docs:**
- Architectural design: Section 10k of `docs/supportcoach-ai-context.md`
- Build plan (6 tasks): "PHASE 2 TASKS" section of `docs/codex-orchestration.md`

**What it is:** End-to-end system that closes the coaching loop. Tracks specific behavioral coaching points across an agent's chats over time, detects when previously-coached behaviors recur in new chats, and gives the manager a pre-written follow-up coaching message they can paste verbatim.

**Why it matters:** Today the coaching message gets generated and copied — but there's no record of whether it was sent, no way to track improvement, and no connection between past coaching and future chats from the same agent. Generic improvement-area tags (empathy, response_time) are too coarse to answer "did this agent apply the coaching I gave them last week?" — empathy can show up in dozens of specific behaviors. The tracker therefore operates on **specific behavioral coaching points** rather than generic tags.

**Locked design decisions:**

1. **Chat-level delivery tracking.** Clicking Copy Message marks all coaching points from that chat as delivered together. Per-point granularity is not built in v1 — it adds UI complexity for marginal benefit. Manual override is available for managers who don't use Copy Message.

2. **Structured coaching points.** AI outputs a `coaching_points` array alongside the existing `copy_coaching_message`. Each point has shape:
   ```
   {
     id: "kebab-case-slug",
     area: "empathy" (existing tag for stats compatibility),
     specific_behavior: "What the agent did in this chat (one sentence)",
     recommended_behavior: "What they should do instead (one sentence)"
   }
   ```
   1-3 points per chat. Empty array for abandoned chats and no-coaching-needed chats. The specific_behavior is precise enough that, given a future transcript, the AI can check whether the same behavior recurred.

3. **AI-driven follow-through detection with manager override.** When a new chat is analyzed for an agent who has prior delivered coaching, the AI receives the prior coaching points within the lookback window. It outputs a `coaching_followthrough` array with per-point status (`followed_through` / `repeated` / `no_opportunity`) plus evidence sentence. Manager can override any AI assessment from the analysis page. Manager override takes precedence in all scorecards and repeat detection.

4. **Auto-generated follow-up coaching message.** When system detects a repeated coaching point, the agent page shows a "Copy follow-up message" button. Generates a templated coaching script — no extra AI call, just a string template populated from existing data:
   > "On March 10, I coached you that when a customer is frustrated about refund delays, you should acknowledge the frustration first before explaining logistics. Looking at your chat from April 28 with Sarah K., I noticed the same pattern came up again — the customer expressed frustration and the response went straight to the refund timeline. What's blocking you from applying the new approach? Let's work through it."

5. **Plan-gated lookback windows:**
   - Starter: 30 days only. Dropdown disabled.
   - Professional: 30 or 90 days. Default 90.
   - Enterprise: 30, 90, or 365 days. Default 365. Labeled in UI as "All time (up to 365 days)" — the 365-day cap is a hard upper bound to protect against runaway costs and stale data.
   - Trial users get the Starter window (30 days).
   - Hard `LIMIT 30` on prior coaching points sent into any single analysis applies to all plans.

**6-task build order:**

| Task | What it does |
|---|---|
| 1 | DB schema (delivery columns + coaching_points jsonb + coaching_followthrough table + auto-mark setting) + /api/update-coaching-delivery route + Copy auto-check wiring |
| 2 | Prompt update — both worker routes output structured coaching_points alongside existing copy_coaching_message. Data layer only, no UI change. |
| 3 | Manual delivery toggle + notes UI on analysis page |
| 4 | Settings toggle to disable Copy auto-check |
| 5 | AI follow-through detection at analysis time (gets prior delivered coaching points within plan window, AI outputs per-point status) + manager override UI on analysis page + /api/update-followthrough-override route |
| 6 | Agent page: scorecard + repeated coaching cards with "Copy follow-up message" button + coaching history view |

**Key architectural rules:**

- Existing `copy_coaching_message` is NOT removed or modified. Remains the manager's primary deliverable. `coaching_points` is additive structured data.
- Follow-through prompt is only added to OpenAI call when agent has at least one prior delivered coaching point within the lookback window. New agents incur no extra cost.
- Re-analyzing a chat (Section 9l) deletes coaching_followthrough rows where the chat is `detected_in_analysis_id` so reanalysis produces a fresh assessment. Rows where chat is `source_analysis_id` are preserved.
- When `auto_mark_coaching_delivered` is false at the org level, auto-mark API call from CopyButton silently no-ops. Manual toggles always work regardless.
- Manager overrides on coaching_followthrough rows take precedence over AI status everywhere.

**Database schema (Phase 2 Task 1 SQL — to be run when Task 1 begins):**

```sql
ALTER TABLE chat_analyses ADD COLUMN IF NOT EXISTS coaching_delivered boolean DEFAULT false;
ALTER TABLE chat_analyses ADD COLUMN IF NOT EXISTS coaching_delivered_at timestamptz;
ALTER TABLE chat_analyses ADD COLUMN IF NOT EXISTS coaching_notes text;
ALTER TABLE chat_analyses ADD COLUMN IF NOT EXISTS coaching_points jsonb DEFAULT '[]'::jsonb;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS auto_mark_coaching_delivered boolean DEFAULT true;

CREATE TABLE IF NOT EXISTS coaching_followthrough (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  agent_name text NOT NULL,
  source_analysis_id uuid NOT NULL REFERENCES chat_analyses(id) ON DELETE CASCADE,
  source_coaching_point_id text NOT NULL,
  detected_in_analysis_id uuid NOT NULL REFERENCES chat_analyses(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('followed_through', 'repeated', 'no_opportunity')),
  evidence text,
  manager_override text CHECK (manager_override IS NULL OR manager_override IN ('followed_through', 'repeated', 'no_opportunity')),
  created_at timestamptz DEFAULT now(),
  UNIQUE (source_analysis_id, source_coaching_point_id, detected_in_analysis_id)
);

ALTER TABLE coaching_followthrough ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coaching_followthrough_org_isolation" ON coaching_followthrough
  FOR ALL USING (organization_id IN (
    SELECT organization_id FROM organization_memberships WHERE user_id = auth.uid()
  ));
CREATE INDEX IF NOT EXISTS idx_coaching_followthrough_org_agent
  ON coaching_followthrough(organization_id, agent_name, created_at DESC);
```

**Files affected across all 6 tasks:**

Created:
- src/app/api/update-coaching-delivery/route.ts
- src/app/api/update-followthrough-override/route.ts
- src/lib/coachingFollowthrough.ts

Modified:
- src/components/CopyButton.tsx
- src/app/analysis/[id]/page.tsx
- src/app/dashboard/settings/page.tsx (and/or src/app/settings/page.tsx)
- src/app/dashboard/agent/[name]/page.tsx
- src/app/api/process-jobs/route.ts
- src/app/api/reanalyze/route.ts
- src/lib/planAccess.ts

**Cost characteristics:**

Each prior coaching point in the prompt adds ~100-200 input tokens plus AI reasoning output. Rough estimates per analysis (GPT-4o-mini):

| Window | Avg points in prompt | Extra cost per analysis |
|---|---|---|
| 30 days | 3-6 | ~$0.005-0.01 |
| 90 days | 10-20 | ~$0.02-0.04 |
| 365 days (capped at 30) | 20-30 | ~$0.04-0.08 |

## KNOWN ISSUES / BLOCKERS
- No active blockers
- AI team summary may still produce Unicode bullet characters — the API route strips them but the prompt also instructs plain ASCII
- First save on settings page shows NEXT_REDIRECT before working on second click — minor, not blocking
- subscription-status API route returns 401 when called from client-side fetch due to Route Handler cookie handling — TrialBanner and select-plan page use Supabase browser client directly as workaround
- Supabase RLS returns 406 on client-side subscriptions query — non-blocking, page works without it
- VS Code shows false TypeScript error "Cannot find module @/components/AppNav" — stale cache issue, does not affect Vercel build
- To reset testing account after cancelling a subscription: run `UPDATE organizations SET plan='trial', trial_ends_at=now()+interval '14 days' WHERE id='8e71dc46-e674-4131-8709-506223a35d7e';` and `DELETE FROM subscriptions WHERE organization_id='8e71dc46-e674-4131-8709-506223a35d7e';`

## ISOLATED FILES — DO NOT TOUCH UNLESS EXPLICITLY ASKED
- `src/app/extension/page.tsx` — Chrome Extension marketing page, not part of the Manager Dashboard product
- `src/app/api/extension-waitlist/route.ts` — Chrome Extension waitlist API, not part of the Manager Dashboard product

## KEY DECISIONS MADE
- Manager-insights route removed (duplicated existing routes)
- Soft delete via `excluded` boolean, not hard delete
- Template-based pattern card narratives, not AI-generated (v1)
- Response time threshold: under 2 min = normal, 2-4 min = notable, over 4 min = coaching point
- Timestamps only cited when timing is actually a coaching point — not as decoration
- Hard limit on timestamp citations: max 2-3 per coaching message, only when timing is the actual coaching point — quotes about content, tone, phrasing, empathy, or clarity must be without timestamps
- Abandoned chats (customer never replies after agent connects): all scores set to 7, attention set to low, brief "no coaching needed" message instead of full coaching — agent did not have enough interaction to fairly evaluate
- Remote session detection: a session URL (Zoho/Zoom/Meet/TeamViewer/AnyDesk) followed by a 5+ minute gap is treated as a live session — do not coach on the gap, do not count toward response time analysis
- Transcript completeness: incomplete transcripts (remote session, channel switch, bot pre-answered, invisible handoff) must be explicitly acknowledged in the coaching message, with coaching limited to visible portions only
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
- Paddle billing: collect credit card upfront at trial start, 14-day free trial with all features unlocked, auto-bill on day 14, app locks on trial expiry or cancellation
- Paddle billing: per-agent seat pricing from day one ($29/$59/$99 per agent per month)
- Paddle billing: annual pricing with 2 months free ($290/$590/$990 per agent per year)
- Paddle billing: new signups start on trial with all features unlocked, pick plan at signup, features gate to plan tier after trial
- Paddle billing: Paddle checkout overlay (popup on site) not redirect
- Paddle billing: TrialBanner and select-plan page use Supabase browser client directly (not subscription-status API route) due to Route Handler cookie issues
- Paddle billing: webhook URL must use www (https://www.supportcoach.io) — non-www causes 308 redirect which Paddle does not follow
- Paddle billing: default payment link must be set in Paddle Checkout Settings before checkout will work
- Landing page: src/app/page.tsx is "use client" — required for annual/monthly toggle state and auth-aware nav
- Landing page nav: uses shared supabase client from src/lib/supabase.ts — never create a second Supabase client instance on the landing page
- Nav architecture: AppNav (src/components/AppNav.tsx) renders on all pages except / — landing page handles its own nav internally
- Extension landing page: hosted at /extension within the Manager Dashboard repo — two separate products sharing one Next.js app and one Supabase project
- **Coaching Effectiveness Tracker (Section 10k Phase 2):**
  - Chat-level delivery tracking — Copy Message marks all points from that chat delivered together. Per-point granularity not built in v1.
  - Structured coaching points (specific_behavior + recommended_behavior) instead of generic tag-only flagging — precise enough to check against future chats.
  - AI-driven follow-through detection at analysis time with manager override — AI classifies each prior coaching point as followed_through / repeated / no_opportunity with evidence; manager can override.
  - Auto-generated follow-up coaching message via template — no extra AI call, populated from data we already have.
  - Plan-gated lookback windows: Starter 30 days only, Pro 30/90 (default 90), Enterprise 30/90/365 (default 365). Hard cap at 365 days for "All time" — protects against runaway costs and stale data.
  - Trial users get Starter window (30 days).
  - LIMIT 30 prior coaching points per analysis regardless of plan.
  - Manager overrides take precedence over AI status everywhere.
  - Existing copy_coaching_message preserved unchanged — coaching_points is additive structured data.

## FILES THAT MUST NOT BREAK
- `src/app/api/process-jobs/route.ts` — the core worker
- `src/app/api/reanalyze/route.ts` — per-chat re-analyze worker
- `src/app/dashboard/page.tsx` — main dashboard
- `src/app/api/create-analysis-job/route.ts` — upload pipeline
- `src/lib/currentOrganization.ts` — org resolution for multi-tenancy
- `middleware.ts` — auth + subscription lock check
- `src/lib/paddle.ts` — Paddle price mapping and webhook verification
- `src/lib/planAccess.ts` — plan gating logic (will be extended in Phase 2 Task 5 with getFollowthroughWindowDays helper)
- `src/app/page.tsx` — public landing page
- `src/components/AppNav.tsx` — app-wide nav for all interior pages
- `src/app/layout.tsx` — root layout, imports AppNav
- `src/app/api/paddle-webhook/route.ts` — Paddle webhook receiver
- `src/components/CopyButton.tsx` — will be modified in Phase 2 Task 1 to fire silent auto-mark on copy. Existing copy behavior must remain identical.
- `src/app/analysis/[id]/page.tsx` — will receive new sections in Phase 2 Tasks 2, 3, 5. Existing functionality (re-analyze, exclude, copy coaching message) must remain identical.
- `src/app/extension/page.tsx` — Chrome Extension marketing page (isolated)
- `src/app/api/extension-waitlist/route.ts` — Chrome Extension waitlist API (isolated)

## DOCUMENTS TO READ ON NEW THREAD
1. `docs/RULES.md` — standing orders (read first, always)
2. `docs/CONTEXT.md` — this file
3. `docs/codex-orchestration.md` — completed task list + Phase 2 active build plan
4. `docs/supportcoach-ai-context.md` — full master prompt (Section 10k for Phase 2 architecture)

## NEW THREAD STARTER MESSAGE
"I'm continuing development of SupportCoach AI. Read docs/RULES.md and docs/CONTEXT.md for current status. The app is live at supportcoach.io. Paddle billing is fully working end-to-end — checkout, webhooks, and database updates all verified March 25, 2026. Extension landing page lives at /extension and is isolated. AI prompt was last enhanced April 27, 2026 with abandoned chat detection, screen sharing detection, transcript completeness awareness, and a hard limit of 2-3 timestamp citations per coaching message. **Phase 2 Coaching Effectiveness Tracker is in active build** — fully designed in master doc Section 10k and broken into 6 tasks in docs/codex-orchestration.md (PHASE 2 TASKS section). Build operates on structured coaching_points (specific_behavior + recommended_behavior) with AI-driven follow-through detection at analysis time, plan-gated lookback windows (Starter 30 / Pro 30-90 / Enterprise 30-90-365), and auto-generated follow-up coaching messages. Other remaining work: dashboard UI polish, plan gating enforcement, duplicate PDF link."