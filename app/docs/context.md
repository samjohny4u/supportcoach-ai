# SUPPORTCOACH AI — CONTEXT FILE
# Last updated: August 14, 2026

## PROJECT STATUS
- **Phase:** Live in Production — Paddle billing fully verified end-to-end, landing page and nav complete. Phase 2 (Coaching Effectiveness Tracker) in progress; Tasks 1, 2, 3, 4, 5, and 6a complete. Task 6b is the only Phase 2 task remaining.
- **Last commit:** `93de005` (July 3, 2026). No code changes between July 3 and August 14, 2026.
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
  - Updates applied to both src/app/api/process-jobs/route.ts and src/app/api/reanalyze-analysis/route.ts
  - Only affects new analyses going forward — existing analyses keep old coaching messages until re-analyzed via per-chat button
- Documentation sync for Phase 2 (April 30, 2026) — DONE
  - codex-orchestration.md rewritten with 6-task Phase 2 plan
  - supportcoach-ai-context.md fully synced with Section 10k design (schema, prompt, file structure, plan tiers)
  - This CONTEXT.md updated to reflect new Section 10k design (was previously the older 4-layer design)
- Phase 2 Task 1: Coaching delivery schema, follow-through table, Copy auto-check — DONE
  - SQL migration was run manually in Supabase before code work
  - Created `src/app/api/update-coaching-delivery/route.ts`
  - Added CopyButton auto-mark wiring and passed analysis id from the analysis detail page
- Phase 2 Task 2: Structured coaching_points output added to both worker and reanalyze routes — DONE (verified end-to-end with Subaiqua chat 292)
- Phase 2 Task 3: Manual coaching delivery toggle and notes UI on analysis page — DONE
- Phase 2 Task 3 hotfix: allow clearing coaching notes via empty string (May 1, 2026) — client now always sends notes including "", API only updates coaching_notes when source === 'manual' — DONE
- Phase 2 Task 4: Settings toggle for Copy auto-mark wired to organizations.auto_mark_coaching_delivered — DONE
- Phase 2 Task 5: Follow-through detection at analysis time + manager override UI — DONE (verified end-to-end on Subaiqua chat 288)
- Phase 2 Task 5 hotfix: ISO date format on follow-through section to avoid React hydration error #418 (May 1, 2026) — replaced toLocaleDateString() with toISOString().split("T")[0] — DONE
- Phase 2 Task 5 polish: hide no_opportunity rows from analysis page display, show "Prior coaching evaluated for this chat — no action needed." note when all rows filtered out, reorder Coaching Delivery and Previous Coaching Follow-Through to below the Coaching message section, rename "Copy Coaching Message" heading to "Coaching" (May 1, 2026) — DONE
- Phase 2 Task 6a: Agent scorecard and repeated coaching cards with follow-up message templating (May 2, 2026, commit `bb04b7e`) — DONE
  - Created `src/lib/coachingFollowthrough.ts` exporting `getAgentScorecard()` and `getRepeatedCoachingForAgent()`
  - Created `src/components/FollowupMessageButton.tsx` — client component that BUILDS the templated follow-up message inline in its copy handler
  - Modified `src/app/dashboard/agent/[name]/page.tsx` — Section A (scorecard tiles) and Section B (repeated coaching cards)
  - AS-BUILT NAMES DIFFER FROM THE ORIGINAL SPEC — see "AS-BUILT vs SPEC" below. The as-built names are correct; the spec names were never used.

- Extension landing page converted from waitlist to self-serve trial funnel (June 24, 2026, commit `54102d3`) — DONE
  - `src/app/extension/page.tsx` — embedded demo video (youtu.be/_t77xhDO8B0), replaced the waitlist form with per-agent pricing (monthly $15/agent/mo, annual $10/agent/mo billed $120/yr, both anchored against a $20 post-launch rate), launch-pricing banner with "lock in for the life of your subscription"
  - All CTAs now point to `https://admin.supportcoach.io/signup` (14-day trial, no card). "Sign In" points to `https://admin.supportcoach.io/`. Constants `SIGNUP_URL` and `ADMIN_URL` at the top of the file.
  - Footer links: Privacy, Terms, support email
  - Internal `<a href="/">` converted to `next/link` to satisfy the build
  - `src/app/privacy/page.tsx` — added section 9 "Chrome Extension (Live Agent Coach)" covering transient draft handling (not stored, 60s in-memory hash-keyed cache), OpenAI as sub-processor, and Chrome Web Store Limited Use compliance. Sections renumbered 9→10, 10→11. Last updated bumped to June 23, 2026.
- Extension link-preview and favicon (June 24, 2026, commits `ccbbb3b`, `4ed1ef6`) — DONE
  - Created `src/app/extension/layout.tsx` — server layout supplying title/description/canonical/OpenGraph/Twitter metadata for the /extension route (the page itself is a client component and cannot export metadata)
  - Created `public/og-extension.png` (2400x1260, flat teal, 2x sharpened) and `public/og-extension.svg`
  - Replaced `src/app/favicon.ico` with `src/app/icon.png`; `src/app/layout.tsx` updated
- SEO: sitemap and robots (July 1 and 3, 2026, commits `0e8e9c2`, `93de005`) — DONE
  - Created `src/app/sitemap.ts` — lists only public indexable pages: /extension (priority 1), /support, /privacy, /terms, /refund. Gated app routes intentionally omitted.
  - Created `src/app/robots.ts` — allows /, disallows /api, /dashboard, /settings, /upload, /jobs, /analysis, /onboarding, /select-plan; points at https://www.supportcoach.io/sitemap.xml
  - `/api` was added to the disallow list on July 3 because a crawler was probing `/api/logout`

## CURRENT TASK
- **Phase 3 (August 2026 bug fixes and hardening) — in active build.** Tasks 1-8 approved August 26, 2026; see PHASE 3 TASKS in codex-orchestration.md. Task 9 (bi-weekly coaching digest) scoped, awaiting owner decisions.
- Phase 2 Tasks 1, 2, 3, 4, 5, and 6a complete. Task 6b (agent coaching history view) remains — the only unbuilt Phase 2 task; queued behind Phase 3.

## REPEAT-COACHING DIAGNOSIS (August 26, 2026)
Symptom: repeated behaviors (e.g. 3-4 min gaps after "Please hold on") not flagged as repeat coaching.
Root cause (by inspection): the test org is plan='trial' → 30-day lookback window
(`getFollowthroughWindowDays`), and coaching history dates from ~May 2026 with a ~3-month usage gap —
so no prior delivered coaching ever qualifies for any new analysis. Detection also only runs AT
analysis time; historical chats are never retro-assessed. Delivery is not the broken link (owner
confirms every coaching is copied → auto-marked delivered).

**Read-only diagnosis SQL (owner runs in Supabase SQL Editor):**
```sql
-- 1. Delivered coaching points per agent (the source pool)
SELECT agent_name, count(*) AS delivered_chats, min(created_at) AS oldest, max(created_at) AS newest
FROM chat_analyses
WHERE organization_id = '8e71dc46-e674-4131-8709-506223a35d7e'
  AND excluded = false AND coaching_delivered = true AND coaching_points != '[]'::jsonb
GROUP BY agent_name ORDER BY delivered_chats DESC;

-- 2. Same, but only within the CURRENT 30-day trial window (expected: zero rows — the smoking gun)
SELECT agent_name, count(*) FROM chat_analyses
WHERE organization_id = '8e71dc46-e674-4131-8709-506223a35d7e'
  AND excluded = false AND coaching_delivered = true AND coaching_points != '[]'::jsonb
  AND created_at >= now() - interval '30 days'
GROUP BY agent_name;

-- 3. Follow-through rows ever written, by status
SELECT status, manager_override, count(*) FROM coaching_followthrough
WHERE organization_id = '8e71dc46-e674-4131-8709-506223a35d7e'
GROUP BY status, manager_override;

-- 4. Agent-name spelling variants (exact-match trap)
SELECT DISTINCT agent_name FROM chat_analyses
WHERE organization_id = '8e71dc46-e674-4131-8709-506223a35d7e' ORDER BY 1;
```

**Test-org window fix (owner runs in Supabase SQL Editor).** WARNING: `UPDATE organizations SET
plan='enterprise'` ALONE locks the org out — middleware treats non-trial plan with no subscription
row as locked. Run BOTH statements together:
```sql
-- Give the test org the enterprise 365-day follow-through window
UPDATE organizations SET plan = 'enterprise'
WHERE id = '8e71dc46-e674-4131-8709-506223a35d7e';

-- Synthetic active subscription so the middleware does not lock the org
-- (verify the subscriptions columns in Supabase first — schema is not in git)
INSERT INTO subscriptions (organization_id, paddle_subscription_id, plan, status, seats, billing_interval, current_period_end)
VALUES ('8e71dc46-e674-4131-8709-506223a35d7e', 'sub_test_enterprise_local', 'enterprise', 'active', 1, 'monthly', now() + interval '365 days')
ON CONFLICT (paddle_subscription_id) DO UPDATE
SET status = 'active', plan = 'enterprise', current_period_end = now() + interval '365 days';
```
**Revert when done testing:**
```sql
DELETE FROM subscriptions WHERE paddle_subscription_id = 'sub_test_enterprise_local';
UPDATE organizations SET plan = 'trial', trial_ends_at = now() + interval '14 days'
WHERE id = '8e71dc46-e674-4131-8709-506223a35d7e';
```
- All architectural decisions for Tasks 4 and 6 are locked in Section 10k of supportcoach-ai-context.md and the PHASE 2 TASKS section of codex-orchestration.md. No new design conversation needed before building.

## AS-BUILT vs SPEC — PHASE 2 TASK 6 NAMING
The Task 6 spec in codex-orchestration.md named four helpers. Three were built under different
names or in a different place; one was never built. When reading the spec, translate as follows:

| Spec name (codex-orchestration.md) | As-built reality |
|---|---|
| `getAgentFollowthroughScorecard(supabase, orgId, agent, windowDays)` | `getAgentScorecard(organizationId, agentName, windowDays)` in `src/lib/coachingFollowthrough.ts`. No supabase arg — the module creates its own service-role client. |
| Scorecard shape `{coached, followed, repeated, no_opportunity}` | `{followed_through, repeated, no_opportunity, total, followthrough_rate}`. There is no `coached` field; `total` is the count of all rows with a resolvable status, and `followthrough_rate` is a percentage over `followed_through + repeated` only. |
| `getAgentRepeatedCoachings(...)` | `getRepeatedCoachingForAgent(organizationId, agentName, windowDays)` in the same file. |
| `buildFollowupCoachingMessage(repeat, agentName)` exported from `src/lib/coachingFollowthrough.ts` | Never built as a lib export. The template lives inline in the `handleCopy()` handler of `src/components/FollowupMessageButton.tsx`. The constants the spec said to export at the top of the file do not exist. |
| `getAgentCoachingHistory(...)` | NOT BUILT. This is Task 6b. |

Both helpers apply `manager_override` over the AI `status` via a shared `effectiveStatus()` function,
and both count all three statuses (no `no_opportunity` display filter is inherited) — matching the
Task 5 display-filter decision recorded below.

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
   - Hard `LIMIT 15` on prior coaching points sent into any single analysis applies to all plans.

**6-task build order:**

| Task | What it does |
|---|---|
| 1 | DONE — DB schema (delivery columns + coaching_points jsonb + coaching_followthrough table + auto-mark setting) + /api/update-coaching-delivery route + Copy auto-check wiring |
| 2 | DONE — Prompt update: both worker routes output structured coaching_points alongside existing copy_coaching_message. Data layer only, no UI change. |
| 3 | DONE — Manual delivery toggle + notes UI on analysis page |
| 4 | DONE — Settings toggle to disable Copy auto-check |
| 5 | DONE — AI follow-through detection at analysis time (gets prior delivered coaching points within plan window, AI outputs per-point status) + manager override UI on analysis page + /api/update-followthrough-override route |
| 6a | DONE — Agent page scorecard + repeated coaching cards with "Copy follow-up message" button |
| 6b | Agent page coaching history view |

**Key architectural rules:**

- Existing `copy_coaching_message` is NOT removed or modified. Remains the manager's primary deliverable. `coaching_points` is additive structured data.
- Follow-through prompt is only added to OpenAI call when agent has at least one prior delivered coaching point within the lookback window. New agents incur no extra cost.
- Re-analyzing a chat (Section 9l) deletes coaching_followthrough rows where the chat is `detected_in_analysis_id` so reanalysis produces a fresh assessment. Rows where chat is `source_analysis_id` are preserved.
- When `auto_mark_coaching_delivered` is false at the org level, auto-mark API call from CopyButton silently no-ops. Manual toggles always work regardless.
- Manager overrides on coaching_followthrough rows take precedence over AI status everywhere.

**Database schema (Phase 2 Task 1 SQL — already run manually in Supabase):**

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
- src/components/FollowthroughOverrideSelect.tsx
- src/lib/coachingFollowthroughFetch.ts
- src/lib/coachingFollowthrough.ts

Modified:
- src/components/CopyButton.tsx
- src/app/analysis/[id]/page.tsx
- src/app/dashboard/settings/page.tsx (and/or src/app/settings/page.tsx)
- src/app/dashboard/agent/[name]/page.tsx
- src/app/api/process-jobs/route.ts
- src/app/api/reanalyze-analysis/route.ts
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
- `src/app/api/extension-waitlist/route.ts` is now ORPHANED — the June 24 extension rebuild replaced the waitlist form with pricing CTAs, so nothing in the codebase calls this route any more. The route and the `extension_waitlist` Supabase table (which holds real signups) both still exist. Do NOT delete either without an explicit decision — the table has customer data and the route is the only thing that can write to it if the waitlist is ever restored.
- AI team summary may still produce Unicode bullet characters — the API route strips them but the prompt also instructs plain ASCII
- First save on settings page shows NEXT_REDIRECT before working on second click — minor, not blocking
- subscription-status API route returns 401 when called from client-side fetch due to Route Handler cookie handling — TrialBanner and select-plan page use Supabase browser client directly as workaround
- Supabase RLS returns 406 on client-side subscriptions query — non-blocking, page works without it
- VS Code shows false TypeScript error "Cannot find module @/components/AppNav" — stale cache issue, does not affect Vercel build
- Upload sequential-selection bug (root cause found August 26, 2026 — corrects the earlier guess): the file input HAS the `multiple` attribute; the real defects are (a) `processFileList` replaces `selectedFiles` instead of appending, so a second pick discards the first, and (b) the input value is never reset, so re-picking the same file doesn't fire onChange. Fix = Phase 3 Task 2.
- Upload jobs list shows "processing" forever until manual refresh — `loadRecentJobs()` runs once at trigger time, no polling. Fix = Phase 3 Task 3.
- Rule 8 loophole (production false coaching, Muibat chat #221584): AI coached an agent for "malformed text" created by the platform's reply/quote feature flattened by PDF export. Fix = Phase 3 Task 1.
- Zoho SalesIQ PDF export does NOT contain the chat rating or the customer's written review (verified against a real production PDF, August 26, 2026 — transcript ends at the agent's "please rate" message). `conversations.rating_value`/`rating_type` are always null. Rating-aware anything requires the SalesIQ API.
- Lingering React hydration error #418 on the analysis page after Task 5 polish (May 1, 2026): page renders fully and all sections work, but DevTools console shows a soft hydration mismatch the AI auto-recovers from. Cause not yet diagnosed (the obvious one — toLocaleDateString — was fixed in the Task 5 ISO date hotfix). Non-blocking. Investigate during dashboard UI polish pass.
- Coaching section heading rename (May 1, 2026, fixed): "Copy Coaching Message" was confusing because the section contains a coaching message AND a Copy button — the title described the action, not the content. Renamed to "Coaching".
- To reset testing account after cancelling a subscription: run `UPDATE organizations SET plan='trial', trial_ends_at=now()+interval '14 days' WHERE id='8e71dc46-e674-4131-8709-506223a35d7e';` and `DELETE FROM subscriptions WHERE organization_id='8e71dc46-e674-4131-8709-506223a35d7e';`

## ISOLATED FILES — DO NOT TOUCH UNLESS EXPLICITLY ASKED
- `src/app/extension/page.tsx` — Chrome Extension marketing page, not part of the Manager Dashboard product. Rebuilt June 24, 2026 as a self-serve trial funnel (explicitly requested). Still isolated: no shared nav, no dashboard auth, no shared components.
- `src/app/extension/layout.tsx` — metadata/OG tags for the /extension route only (added June 24, 2026)
- `public/og-extension.png`, `public/og-extension.svg` — link-preview image for /extension
- `src/app/api/extension-waitlist/route.ts` — Chrome Extension waitlist API, not part of the Manager Dashboard product. Now orphaned (see KNOWN ISSUES) but retained.
- NOTE: the Chrome Extension's OWN code and backend live in a SEPARATE repo (`support-coach-extension`). Only the marketing page and waitlist API live here.

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
- Doc drift correction (April 30, 2026): the re-analyze route was incorrectly documented as src/app/api/reanalyze/route.ts across RULES.md, CONTEXT.md, and codex-orchestration.md. Real path is src/app/api/reanalyze-analysis/route.ts. Confirmed by directory listing and the form action in src/app/analysis/[id]/page.tsx. All references updated.
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
- Extension funnel (June 24, 2026): the /extension page is a self-serve trial funnel, NOT a waitlist. Waitlist form removed. CTAs point off-domain to `https://admin.supportcoach.io/signup`.
- Subdomain split (June 24, 2026): the manager dashboard is addressed as `admin.supportcoach.io` from the extension page, while `www.supportcoach.io` fronts the marketing pages. Both are served by this one Next.js app — the extension page links out by absolute URL rather than by internal route.
- Extension pricing is separate from Manager Dashboard pricing: $15/agent/mo monthly, $10/agent/mo annual ($120/yr), both anchored against a stated $20 post-launch rate, sold as launch pricing locked for the life of the subscription. These numbers live only in `src/app/extension/page.tsx` — they are NOT in `src/lib/paddle.ts` and are not wired to Paddle.
- SEO (July 2026): only marketing pages are indexable. `src/app/sitemap.ts` lists /extension, /support, /privacy, /terms, /refund. `src/app/robots.ts` disallows /api and every gated app route. `/extension` is priority 1 — it is the primary acquisition page.
- **Coaching Effectiveness Tracker (Section 10k Phase 2):**
  - Chat-level delivery tracking — Copy Message marks all points from that chat delivered together. Per-point granularity not built in v1.
  - Structured coaching points (specific_behavior + recommended_behavior) instead of generic tag-only flagging — precise enough to check against future chats.
  - AI-driven follow-through detection at analysis time with manager override — AI classifies each prior coaching point as followed_through / repeated / no_opportunity with evidence; manager can override.
  - Auto-generated follow-up coaching message via template — no extra AI call, populated from data we already have.
  - Plan-gated lookback windows: Starter 30 days only, Pro 30/90 (default 90), Enterprise 30/90/365 (default 365). Hard cap at 365 days for "All time" — protects against runaway costs and stale data.
  - Trial users get Starter window (30 days).
  - LIMIT 15 prior coaching points per analysis regardless of plan.
  - Manager overrides take precedence over AI status everywhere.
  - Existing copy_coaching_message preserved unchanged — coaching_points is additive structured data.
- Phase 3 decisions (August 26, 2026):
  - Follow-through/repeat-coaching section moves ABOVE the coaching message on the analysis page — it filters how coaching gets delivered, so the manager sees it first. This deliberately REVERSES the May 1, 2026 polish decision that placed it below.
  - Repeat cards state the occurrence ("second time", "third time") in encouraging, non-punitive phrasing.
  - Per-chat re-analysis context box: deferred (expensive). Rating-aware coaching: impossible from PDF (see KNOWN ISSUES), deferred to SalesIQ API direction.
  - Scale readiness is a pre-launch requirement: atomic job claim built now (Phase 3 Task 7); remaining backlog (cron, worker auth, counter races, fairness) recorded in codex-orchestration.md.
  - Docs anti-drift: rules.md rule 38 (as-built names in DONE entries) + warn-only pre-push hook at .githooks/pre-push (activate per machine: `git config core.hooksPath .githooks`).
- Phase 2 Task 5 display filter (May 1, 2026): the analysis page hides coaching_followthrough rows where the final status (manager_override or AI status) is "no_opportunity". This filter is DISPLAY-ONLY on the analysis page. The DB rows still exist for all three statuses. Task 6 (agent page scorecard) MUST count all three statuses (followed_through, repeated, no_opportunity) when building the scorecard totals — do NOT inherit this filter into Task 6. The scorecard is meant to be honest about what was evaluated; the analysis page filter exists only to reduce per-chat noise for the manager.

## FILES THAT MUST NOT BREAK
- `src/app/api/process-jobs/route.ts` — the core worker
- `src/app/api/reanalyze-analysis/route.ts` — per-chat re-analyze worker
- `src/app/dashboard/page.tsx` — main dashboard
- `src/app/api/create-analysis-job/route.ts` — upload pipeline
- `src/lib/currentOrganization.ts` — org resolution for multi-tenancy
- `middleware.ts` — auth + subscription lock check
- `src/lib/paddle.ts` — Paddle price mapping and webhook verification
- `src/lib/planAccess.ts` — plan gating logic (will be extended in Phase 2 Task 5 with getFollowthroughWindowDays helper)
- `src/app/api/update-coaching-delivery/route.ts` — Phase 2 Task 1 + Task 3 hotfix. Auto-mark from CopyButton must remain silent no-op when org auto-mark setting is false. Manual save must always update coaching_notes including empty string.
- `src/app/page.tsx` — public landing page
- `src/components/AppNav.tsx` — app-wide nav for all interior pages
- `src/app/layout.tsx` — root layout, imports AppNav
- `src/app/api/paddle-webhook/route.ts` — Paddle webhook receiver
- `src/app/api/update-followthrough-override/route.ts` — Phase 2 Task 5. Manager override endpoint, used by FollowthroughOverrideSelect.
- `src/lib/coachingFollowthroughFetch.ts` — Phase 2 Task 5. Helper for fetching prior delivered coaching and building the follow-through prompt section. Hard cap at COACHING_FOLLOWTHROUGH_LIMIT = 15 prior points per analysis.
- `src/components/CopyButton.tsx` — modified in Phase 2 Task 1 to fire silent auto-mark on copy. Existing copy behavior must remain identical.
- `src/app/analysis/[id]/page.tsx` — will receive new sections in Phase 2 Tasks 2, 3, 5. Existing functionality (re-analyze, exclude, copy coaching message) must remain identical.
- `src/components/CoachingDeliveryControls.tsx` — Phase 2 Task 3. Client component for manual delivery toggle and notes. Must always send notes field (including "") with source: "manual" payload.
- `src/components/FollowthroughOverrideSelect.tsx` — Phase 2 Task 5. Client component for per-row manager override of AI follow-through assessment.
- `src/app/extension/page.tsx` — Chrome Extension marketing page (isolated). Primary acquisition page, sitemap priority 1.
- `src/app/api/extension-waitlist/route.ts` — Chrome Extension waitlist API (isolated, currently orphaned)
- `src/lib/coachingFollowthrough.ts` — Phase 2 Task 6a. Exports `getAgentScorecard` and `getRepeatedCoachingForAgent`. Manager override must keep taking precedence over AI status via `effectiveStatus()`.
- `src/components/FollowupMessageButton.tsx` — Phase 2 Task 6a. Holds the follow-up coaching message template inline in `handleCopy()`.
- `src/app/sitemap.ts` and `src/app/robots.ts` — SEO surface. Adding a new PUBLIC page means adding it to sitemap.ts; adding a new GATED route means adding it to the robots disallow list.

## DOCUMENTS TO READ ON NEW THREAD
1. `docs/RULES.md` — standing orders (read first, always)
2. `docs/CONTEXT.md` — this file
3. `docs/codex-orchestration.md` — completed task list + Phase 2 active build plan
4. `docs/supportcoach-ai-context.md` — full master prompt (Section 10k for Phase 2 architecture)

## NEW THREAD STARTER MESSAGE
"I'm continuing development of SupportCoach AI. Read docs/RULES.md and docs/CONTEXT.md for current status. The app is live at supportcoach.io. Paddle billing is fully working end-to-end — checkout, webhooks, and database updates all verified March 25, 2026. AI prompt was last enhanced April 27, 2026 with abandoned chat detection, screen sharing detection, transcript completeness awareness, and a hard limit of 2-3 timestamp citations per coaching message. **Phase 2 Coaching Effectiveness Tracker: Tasks 1-5 and 6a are DONE. Task 6b (agent coaching history view) is the only one left** — designed in master doc Section 10k and docs/codex-orchestration.md (PHASE 2 TASKS section). Before touching Task 6 code, read the AS-BUILT vs SPEC table in CONTEXT.md — three Task 6 helpers shipped under different names than the spec uses. The /extension marketing page was rebuilt June 24, 2026 into a self-serve trial funnel pointing at admin.supportcoach.io/signup; sitemap.ts and robots.ts were added in July 2026. Other remaining work: dashboard UI polish, plan gating enforcement, duplicate PDF link."
