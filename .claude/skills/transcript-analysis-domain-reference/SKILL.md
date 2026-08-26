---
name: transcript-analysis-domain-reference
description: The domain reference for what a "transcript analysis" IS in supportcoach-ai (SupportCoach AI Manager Dashboard). Load this BEFORE reading, editing, or reasoning about the AI analysis pipeline, and whenever a task mentions "the prompt", "the schema", "scores", "coaching message", "coaching points", "follow-through", "team summary", "excluded chats", or "why is this field shaped like this". Covers the duplicated system prompts in process-jobs and reanalyze-analysis, the exact JSON contract, the five scored dimensions, the six boolean flags, churn_risk, attention_priority, abandoned-chat / remote-session / completeness special cases, coaching-context injection, structured coaching_points and the follow-through loop, team-summary and manager-report generation, exclusion (soft-delete) semantics, score rollups, the ASCII-only output discipline, and minimum Paddle lifecycle concepts. Semantics only — to LAND a prompt/schema change use coach-saas-change-control (both worker routes, always); live-failure triage → coach-saas-debugging-playbook; system invariants → coach-saas-architecture-contract; tunable constants → coach-saas-config-and-flags; verification steps → coach-saas-validation-and-qa; plan-gating build work → coach-saas-plan-gating-campaign.
---

# Transcript-analysis domain reference for supportcoach-ai

Everything below verified directly against the repo on 2026-07-17 (HEAD `93de005`, 104 commits, branch `main`). All paths repo-relative to `C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai`. This is the ONE home for prompt/schema semantics; siblings cross-reference it instead of restating.

## 0. The one-sentence model

A "transcript analysis" here is: a Zoho SalesIQ chat PDF, parsed into a structured `[timestamp] Name: text` transcript, sent to OpenAI `gpt-5.4` with a ~350-line system prompt (duplicated verbatim in TWO routes) that demands ONE JSON object, whose fields are then defensively normalized server-side and written to the `chat_analyses` table — from which every dashboard stat, report, scorecard, and CSV export is computed at read time by exact-string grouping, always filtered by `organization_id` and non-`excluded`.

## 1. The pipeline (who calls the AI, and when)

```
Upload page (app/src/app/upload/page.tsx)
  pdfjs-dist extracts text, adds "--- Page N ---" markers
  -> POST /api/create-analysis-job   (SHA-256 transcript_hash duplicate detection,
      per-org; inserts analysis_jobs + analysis_job_items rows, status "pending")
  -> auto-triggers GET /api/process-jobs (fetch from the page; also manual
      WorkerTriggerButton). There is NO cron and NO vercel.json — the worker
      only runs when a browser triggers it.
GET /api/process-jobs (the batch worker)
  claims one job, iterates pending items, per item:
  parse transcript -> insert conversations + conversation_messages rows
  -> fetch coaching_context + plan + prior delivered coaching points
  -> ONE OpenAI call -> normalize -> insert chat_analyses row
  -> normalize coaching_points (update row) -> upsert coaching_followthrough rows
POST /api/reanalyze-analysis (per-chat re-analyze, form POST from /analysis/[id])
  rebuilds transcript from stored conversation_messages, same prompt, UPDATEs the
  existing chat_analyses row in place, deletes+rewrites its follow-through rows.
```

All 8 hard-coded `"gpt-5.4"` call sites (verified by grep; a model change touches all of them — savepoint first, see coach-saas-change-control 4c):

| File | What it generates |
|---|---|
| `app/src/app/api/process-jobs/route.ts:962` | Full analysis (batch worker) |
| `app/src/app/api/reanalyze-analysis/route.ts:594` | Full analysis (re-analyze) |
| `app/src/app/api/team-summary/route.ts:21` | Dashboard AI weekly summary |
| `app/src/app/api/manager-report/route.ts:188` | Markdown coaching report |
| `app/src/app/api/manager-report-pdf/route.ts:108` | Same report, rendered to PDF |
| `app/src/app/dashboard/report/page.tsx:179` | Report page server-side generation |
| `app/src/app/api/reclassify-topics/route.ts:52` | chat_type re-classification (batch backfill) |
| `app/src/app/api/analyze/route.ts:264` | LEGACY — Responses API, older schema (nested `flags`), logs raw AI output. No in-repo caller found (grep `api/analyze`, 2026-07-17). Do not extend it; DO include it in any global model/prompt sweep. |

Both workers call `openai.chat.completions.create` with `temperature: 0.2` and **no `response_format`** — the JSON contract is enforced only by the prompt ("return ONLY valid JSON") plus `parseJsonSafely` (bare `JSON.parse` in try/catch). Unparseable output = item marked `failed` (process-jobs) or an error redirect (reanalyze). Contrast: `team-summary` DOES use strict `response_format: { type: "json_schema" }` and a `role: "developer"` message. Do not "harmonize" these without an owner decision.

## 2. The two duplicated workers (the #1 trap)

`process-jobs/route.ts` and `reanalyze-analysis/route.ts` each carry a **full verbatim copy** of the system prompt, the `AnalysisResult` type, and all normalization helpers (`clampScore`, `normalizeRisk`, `normalizeCoachingPoints`, `buildCopyCoachingMessage`, ...). codex-orchestration.md line 568: "Both routes have the same OpenAI system prompt and JSON schema — apply the same change to both." History: coaching-context injection initially reached only re-analyze; fix `36f5b8b`. The April 27 overhaul (`2fa4997`) and Phase 2 Task 2 (`03b7306`) each deliberately touched both files in one commit.

Known drift that already exists between the two copies (verified 2026-07-17, do not silently "fix" — record any change per change-control):
- The **fallback** `buildCopyCoachingMessage` (used only when the model omits `copy_coaching_message`) in process-jobs still contains Unicode `•` bullets and an em-dash opening (`route.ts:333,351-359`), while the reanalyze copy was ASCII-fied to `-` bullets (`route.ts:337,353-361`). See Section 10 (ASCII discipline).
- Prompt changes only affect NEW analyses. Existing `chat_analyses` rows keep old output until re-analyzed via the per-chat button (context.md; say so in every handoff).

## 3. The analysis JSON contract

The model must return exactly this object (prompt lines ~975-1005 in process-jobs, ~607-637 in reanalyze):

```json
{
  "agent_name": "", "customer_name": "", "chat_type": "", "issue_summary": "",
  "what_you_did_well": [], "improvement_areas": [],
  "what_this_chat_really_was": "", "how_this_could_be_handled": [],
  "summary_strengths": [], "summary_improvements": [],
  "quick_summary": "", "copy_coaching_message": "",
  "coaching_points": [], "coaching_followthrough": [],
  "attention_priority": "low",
  "scores": { "empathy": 0, "clarity": 0, "ownership": 0,
              "resolution_quality": 0, "professionalism": 0 },
  "churn_risk": "low",
  "deleted_message": false, "missed_confirmation": false,
  "premature_close": false, "product_limitation_chat": false,
  "customer_frustration_present": false, "escalation_done_well": false
}
```

Field semantics (from the prompt's FIELD-SPECIFIC RULES) and what the server does with each:

| Field | Semantics (prompt) | Server-side handling before DB write |
|---|---|---|
| `agent_name`, `customer_name` | Identified from transcript | Trimmed; falls back to `inferConversationParticipants` (first/second unique parsed sender). Stored as free text — **all rollups key on exact `agent_name` string equality**; spelling variance splits an agent's history. |
| `chat_type` | Short Title Case module-level category ("Billing", "Change Orders", ...); primary topic if multi-topic | Stored as-is; dashboard `normalizeLabel` re-title-cases for display. Feeds /dashboard/topics. NOTE: `reclassify-topics` has a slightly different taxonomy (adds "Feature Request"/"Project Settings", bans "Support"/"Technical Issue" which the worker prompt lists as good) — drift, labeled open. |
| `issue_summary` | 1-2 sentences, problem only, never the resolution | Trimmed or null |
| `what_you_did_well[]` / `improvement_areas[]` | Evidence-backed strengths / coaching points | Stored raw (arrays, no dedupe at insert) |
| `what_this_chat_really_was` | The deeper nature of the conversation | Trimmed or null |
| `how_this_could_be_handled[]` | Specific alternative approaches WITH example phrasing — vague advice explicitly banned | Stored raw |
| `summary_strengths[]` / `summary_improvements[]` | Short bullets; improvements must be specific | Stored raw. Dashboard "Top Coaching Opportunities / Strengths" counts EXACT trimmed-string matches across chats (`countPhrases`) — free-text arrays aggregate poorly by design v1. |
| `quick_summary` | One-glance summary | If empty, `buildQuickSummary` synthesizes one from flags/low scores |
| `copy_coaching_message` | The manager's paste-ready deliverable — see Section 7 | If empty, `buildCopyCoachingMessage` fallback template fires (Section 2 drift note) |
| `coaching_points[]` | Structured behavioral points — see Section 8 | `normalizeCoachingPoints`: max 3, allowed-area whitelist, id slugified (80 chars) and prefixed `<analysisId>-<slug>`, dedupe; written in a SECOND update after the insert (process-jobs) |
| `coaching_followthrough[]` | Assessments of prior coaching — see Section 8 | `normalizeFollowthroughEntries`: only entries whose `(source_analysis_id, point_id)` pair matches a fetched prior point survive; status whitelist; evidence defaults to "No evidence provided." |
| `attention_priority` | low/medium/high | `normalizePriority` (unknown -> low). If the model omits it, `computeAttentionPriority` computes a weighted heuristic — see Section 5 |
| `scores.*` | Integers 1-10 per rubric (Section 4) | `clampScore`: non-number -> **null**, else clamped 1-10 and rounded. Stored as five flat columns `empathy, clarity, ownership, resolution_quality, professionalism` on `chat_analyses` (NOT a JSON blob) |
| `churn_risk` | low/medium/high per CHURN RISK ASSESSMENT rules | `normalizeRisk` (unknown -> low) |
| six booleans | See Section 5 | `?? false` |

## 4. The five scored dimensions (1-10 rubric, applied consistently)

The prompt carries an explicit anchor rubric per dimension (SCORING RUBRIC section). Condensed semantics:

| Dimension | 1-3 | 4-5 | 6-7 | 8-9 | 10 |
|---|---|---|---|---|---|
| empathy | No acknowledgment; robotic/dismissive | Generic acknowledgment | Understood feelings, missed depth | Genuine, tone-adapted | Exceptional throughout |
| clarity | Confusing/contradictory | Needed follow-up questions | Mostly clear, minor jargon | Clear on first read | No ambiguity |
| ownership | Deflected/passed issue | Worked but passive | Reasonable, could be proactive | Clearly owned, drove resolution | Full ownership start-finish |
| resolution_quality | Not resolved | Partial, no complete fix | Mostly resolved, weak confirmation | Fully resolved + explained | + prevention guidance |
| professionalism | Rude/dismissive | Flat, transactional | Polite, minor lapses | Warm and personal | Perfect for situation |

Special rule: **abandoned chats score exactly 7 on all five** (Section 6) — the agent had too little interaction to evaluate. A batch of uniform 7s is a signature of abandoned-chat detection, not of mediocre agents.

## 5. Boolean flags and attention priority

Flags (BOOLEAN FLAG ASSESSMENT CRITERIA — every flag needs transcript evidence, never guessed):

| Flag | true when |
|---|---|
| `deleted_message` | ONLY explicit evidence ("[message deleted]" etc.) |
| `missed_confirmation` | Resolution given but no confirmation question before close ("Does that help?" / customer proactively confirming -> false) |
| `premature_close` | Closed without fair chance to respond. Check-in + 3+ min silence + close = REASONABLE (false). Timestamps must be calculated explicitly |
| `customer_frustration_present` | Emotional distress beyond normal inquiry (explicit words, repeats, escalating language). Mild confusion is NOT frustration |
| `escalation_done_well` | Escalated AND explained why + next steps. false if unexplained, skipped when needed, or no escalation occurred |
| `product_limitation_chat` | Blocker was the product (bug/missing feature), not user error |

`churn_risk`: high = intent to leave OR severe issue unresolved; medium = frustration with recurring/systemic issue OR partial resolution; low = routine + resolved.

`attention_priority`: the model outputs it, but if omitted the worker computes it (`computeAttentionPriority`): frustration +2, premature_close +2, missed_confirmation +1, product_limitation +1, churn medium +1 / high +3, empathy <=4 +2 (<=6 +1), resolution_quality <=4 +2 (<=6 +1), ownership <=4 +1; total >=5 -> high, >=2 -> medium, else low. Dashboard "Chats Needing Attention" and the attention view filter on `attention_priority = "high"`. The value is mirrored to `conversations.priority_label`.

Owner-locked thresholds baked into the prompt (context.md KEY DECISIONS — do not re-tune casually): response gaps under 2 min are NORMAL and must not be coached; 2-4 min notable only if customer actively waiting; over 4 min = coaching point. Historical incident: AI once flagged a 1-minute response as slow (rules.md PAST MISTAKES).

## 6. Special-case detections (April 27, 2026 prompt overhaul, commit `2fa4997`)

1. **Abandoned chat** — customer sent initial question, agent connected and responded, customer NEVER replied, and no channel-switch/remote-session explains the absence. Then: all scores = 7, attention = low, `copy_coaching_message` = brief "no coaching needed" note, arrays minimal/empty, `coaching_points: []`, `coaching_followthrough: []`; `issue_summary`/`chat_type` still set normally.
2. **Remote session** — a session URL (join.zoho.com, zoom.us, meet.google.com, teamviewer.com, anydesk.com) followed by a 5+ minute gap = live session. Do not coach on the gap, do not count it toward response time; coach only on setup/re-entry/confirmation.
3. **Transcript completeness** — remote session, channel switch ("continue over email"), bot pre-answered, or invisible handoff => coaching must acknowledge invisibility, never penalize for things possibly handled off-transcript, and say plainly when the visible portion is too thin.
4. **Factual accuracy rules** (apply to ALL text fields): exact durations required ("5 minutes and 6 seconds", never "long gaps"); customer silence is never the agent's fault; quote the transcript for every claim; never invent/exaggerate; credit positives before coaching the same area; connect timing to outcome only when the timeline supports it; note truncated messages instead of judging them; detect quoted/misattributed messages (reply/quote feature) and never coach the agent on quoted customer text.
5. **Timestamp citation HARD LIMIT** — max 2-3 timestamp citations per coaching message, ONLY when timing is the coaching point; quotes about content/tone/phrasing/empathy/clarity carry NO timestamp.

## 7. copy_coaching_message format

The manager's primary deliverable — pasted verbatim to the agent (usually into Slack, hence the ASCII `:emoji_shortcode:` tokens rather than Unicode emoji). Prompt contract:
- 250-450 words, never short, never skipped sections. Include chat reference number in the opening if present in the transcript.
- **Opening variety rule**: the phrase "this chat was really about" is BANNED from the opening (enforcement added in `493f699`); openings must feel fresh per chat (seven example openings live in the prompt).
- Fixed section order: opening -> `:white_check_mark: What You Did Well` (2-3 quoted strengths) -> `:warning: Where the Experience Could Improve` (numbered, evidence-backed) -> `:brain: What This Chat Really Was` -> `:pushpin: Summary` (Strengths / Key Improvement Areas bullets).
- Tone: supportive, morale-preserving, non-robotic; no factual claim unverifiable from the transcript.

## 8. Structured coaching points + the follow-through loop (Phase 2, Section 10k)

**coaching_points** (COACHING POINTS — STRUCTURED OUTPUT section): 1-3 per chat, empty for abandoned or genuinely-clean chats. Shape: `{ id: kebab-slug, area, specific_behavior, recommended_behavior }` — one sentence each, precise enough to check against a FUTURE transcript. `area` whitelist (exactly these 11, lowercase): empathy, clarity, ownership, resolution_quality, professionalism, response_time, confirmation, escalation, product_knowledge, tone, process_adherence. Server prefixes stored ids with the analysis id.

**Prompt injection at analysis time** (`app/src/lib/coachingFollowthroughFetch.ts`): if the agent has prior DELIVERED coaching (`coaching_delivered = true`, non-excluded, same exact `agent_name`, same org) within the plan lookback window, `buildFollowthroughPromptSection` appends a "PREVIOUSLY DELIVERED COACHING - FOLLOW-THROUGH CHECK" block listing each prior point with its `point_id`/`source_analysis_id`/date, and instructs one assessment per point: `followed_through` | `repeated` | `no_opportunity` + one-sentence evidence, with "be honest, do not invent follow-through evidence". No prior points => no section => zero extra cost for new agents.

Caps and windows (`app/src/lib/planAccess.ts`): `COACHING_FOLLOWTHROUGH_LIMIT = 15` points max per analysis (all plans); `getFollowthroughWindowDays`: professional 90, enterprise 365, everything else (starter/trial/unknown) 30; fetch scans at most the 50 most recent qualifying analyses.

Worker nuances (verified):
- process-jobs must guess the agent BEFORE the AI runs (`earlyAgentGuess` = first unique parsed sender name) to fetch prior coaching — a heuristic that can be wrong; reanalyze uses the stored `agent_name` instead.
- Reanalyze DELETEs all `coaching_followthrough` rows where this chat is `detected_in_analysis_id` before writing fresh ones; rows where it is `source_analysis_id` are preserved (locked design rule).
- Rows upsert on unique `(source_analysis_id, source_coaching_point_id, detected_in_analysis_id)` with `ignoreDuplicates: true`; follow-through failures never block analysis completion.

**Delivery tracking**: chat-level. `CopyButton` copy fires a silent `source: "auto"` POST to `/api/update-coaching-delivery`, which no-ops (`{skipped: true}`) when `organizations.auto_mark_coaching_delivered` is false; manual toggles (`source: "manual"`) always work and are the ONLY path that updates `coaching_notes` (empty string allowed — Task 3 hotfix `84357bf`).

**Rollup** (`app/src/lib/coachingFollowthrough.ts`, agent page): effective status = `manager_override || status` (override wins everywhere). Scorecard counts ALL THREE statuses; `followthrough_rate = followed_through / (followed_through + repeated)` — `no_opportunity` excluded from the denominator. The analysis page HIDES `no_opportunity` rows (display-only filter — context.md explicitly forbids inheriting it into scorecards). Repeated points render a "Copy follow-up message" button (`app/src/components/FollowupMessageButton.tsx`) — a pure string template ("On <date>, I coached you that <recommended_behavior>. ... What's blocking you from applying the new approach? Let's work through it."), deliberately NO extra AI call (cost control).

## 9. Company coaching-context injection (Section 9k)

`organizations.coaching_context` (manager-edited free text on the settings page) is fetched per analysis and, when non-empty, wrapped as a `=== COMPANY COACHING CONTEXT ===` block injected between the prompt header and the JSON schema. Semantics: ground truth for team process, use company terminology, flag process deviations as coaching points — BUT an explicit guard says all factual-accuracy/evidence/timestamp rules still apply ("The context supplements your analysis; it does not replace it" — evidence-preservation fix, context.md). Fetch failures are swallowed — analysis proceeds without context. Injection order in both routes: `${coachingContextSection}${followthroughPromptSection}` — context first, then follow-through, then schema.

## 10. ASCII-only output discipline (and why)

The Unicode war (Mar 18, 2026): AI output and hand-written UI strings containing Unicode bullets/em-dashes rendered as garbled characters on the dashboard; 8+ commits including strip attempt `2566750`, full revert `1bdf54d`, dashboard cleanup `8be2601`, and prompt fix `fa88735` (full narrative: coach-saas-failure-archaeology). Current settled state, verified 2026-07-17:

- The team-summary prompt instructs (route.ts:42): "Do not include bullet characters, em dashes, or any special Unicode symbols in your text. Use only plain ASCII characters. The UI adds its own formatting." Commit `fa88735` = exactly this one line. The dashboard renders `- ` bullets itself.
- There is **no code-side Unicode strip at HEAD** — `sanitizeReport`/`sanitizeReportText` only remove assistant sign-offs and markdown. context.md KNOWN ISSUES ("the API route strips them") is doc drift vs current code; residual risk is logged there as open. Do not add a strip unasked.
- The worker prompts route around the problem differently: the coaching-message format uses ASCII `:emoji_shortcode:` tokens, not emoji. Within the two WORKER prompt/fallback templates, the one remaining Unicode pocket is the process-jobs fallback (Section 2). Deliberate `•` characters DO exist elsewhere in `app/src` and are not violations of this discipline: JSX bullets in `analysis/[id]/page.tsx` and the two topics pages, the PDF renderer in `api/manager-report-pdf/route.ts`, and the dead legacy prompt in `api/analyze/route.ts` — see coach-saas-debugging-playbook Section 6 (garbling looks like `â€¢` mojibake, not a clean bullet).
- Rule for ANY new AI output surface: instruct plain ASCII in the prompt, and keep model text out of hand-formatted UI.

## 11. Exclusion (soft-delete) semantics

There is no hard delete of analyses (rules.md 13; KEY DECISIONS): `chat_analyses.excluded` boolean is the only removal mechanism, written solely by `POST /api/toggle-exclude` (form POST from `ExcludeToggleButton` on the analysis page). Rules.md 15: every `chat_analyses` read includes the filter unless managing exclusions. Verified filter map:

- `.eq("excluded", false)`: dashboard main query + agent-name list, `coachingFollowthroughFetch` (prior points), `coachingFollowthrough` enrichment lookups, `update-coaching-delivery` guards.
- `.neq("excluded", true)`: export CSV, manager-report (+pdf), report page, trend-data, topics pages, topic-*-stats, agent page.
- The two styles differ on NULL: `.eq(false)` drops NULL rows, `.neq(true)` keeps them. When auditing coverage, grep BOTH patterns.
- Reanalyze preserves the row's `excluded` value. Excluded rows never feed prior-coaching prompts, stats, or reports; the dashboard shows "N excluded from reports" from a separate count. `reclassify-topics` intentionally processes ALL rows including excluded.
- Verified observation (open, 2026-07-17): `toggle-exclude/route.ts` updates by `analysis_id` alone — no auth check and no `organization_id` filter, unlike rules.md 14/20. Uses the service-role client. Not on any fix list in the docs; treat as an open item for the owner, not something to patch unasked.

## 12. How scores roll up (dashboard, team summary, reports, export)

All aggregation is computed at READ time from `chat_analyses` rows — nothing is pre-aggregated in the DB.

- **Dashboard** (`app/src/app/dashboard/page.tsx`): `avg()` = mean to 1 decimal, nulls skipped (null scores silently shrink the denominator). Per-agent grouping on exact trimmed `agent_name` (names "", "unknown", "null" dropped by `isKnownAgentName`). Leaderboard sorts by avgEmpathy. "Agent Needing Most Coaching" = max of (missed_confirmations + premature_closes + deleted_messages). Trend chart groups by ISO date, per-day score means. Flag counts are simple filters. Filters: agent, range (7d/30d/all), attention view.
- **AI weekly team summary**: the dashboard sends ONLY the aggregated payload (totals, top lists, per-agent averages — never transcripts) to `POST /api/team-summary`, which returns strict-schema JSON: `headline, top_strengths[], top_coaching_opportunities[], risk_patterns[], manager_focus_next[], agents_needing_attention[]`. It regenerates on EVERY dashboard load (`cache: "no-store"`, no persistence) via `NEXT_PUBLIC_SITE_URL || http://localhost:3000` — an AI call per page view (cost/latency fact, and a known env coupling).
- **Manager report** (`/api/manager-report`, `/api/manager-report-pdf`, `/dashboard/report`): last N days (default 7), max 200 rows queried, first 75 rows serialized as JSON into the user prompt; separate team vs single-agent system prompts with fixed `##/###` section structures and anti-assistant-language rules; `sanitizeReport` strips "If helpful, I can also..." style sign-offs.
- **Export CSV** (`/api/export`): same org + non-excluded + filter semantics as the dashboard.

## 13. Transcript parsing (what the model actually receives)

`parseTranscriptMessages` (process-jobs only; reanalyze replays stored `conversation_messages`) is tuned to the **Zoho SalesIQ chat-transcript PDF export**: strips `--- Page N ---` markers (added by the upload page's pdfjs extraction) and date prefixes, skips the header before `Chat Duration : HH:MM:SS`, then segments on `H:MM:SS AM/PM` timestamps which appear at the END of each message block. Sender extraction: 2+ space split first; then a `knownSenderNames` set as fallback for pdfjs single-space runs (the historical misattribution fix); then continuation-from-last-sender; system/file-sharing patterns get `sender_role: "system"`. Output line format sent to the AI: `[10:39:42 AM] Umer: Hi Carlos!` (role prefix `AGENT (Name):` / `CUSTOMER (Name):` only when the role is known — usually it is `unknown` and the AI infers roles from context). If parsing yields zero messages, the RAW text is sent and the prompt's RAW FORMAT fallback rules apply. Standing order: always test parser changes against real transcript PDFs (rules.md PAST MISTAKES).

## 14. Paddle billing — minimum domain concepts

Full billing change rules live in coach-saas-change-control 4d (dashboard-config sagas: payment link, www webhook URL). What you need to REASON about the code (`app/src/app/api/paddle-webhook/route.ts`, verified):

- Signature (`ts=...;h1=...` HMAC-SHA256 over `ts:rawBody`, `verifyPaddleWebhook` in `app/src/lib/paddle.ts`) is checked FIRST; invalid -> 401, missing secret -> 500, malformed payload -> 400; any error after validation -> 200 (never retry-storm Paddle).
- Org linking: `data.custom_data.organization_id` (set at checkout). Missing -> event logged and dropped (still 200).
- Events handled: `subscription.created` (upsert `subscriptions` row on `paddle_subscription_id` + update `organizations.plan` cache); `subscription.updated|paused|resumed|past_due` (update row + plan cache); `subscription.canceled` (row -> status canceled + cancel_at; **does NOT touch `organizations.plan`** — access lockout comes from `subscriptions.status` + period end via `planAccess`/middleware, and the plan cache goes stale by design); `transaction.payment_failed` (row -> past_due); `transaction.completed` (deliberate no-op).
- Field mapping: plan + billing_interval come from `items[0].price.id` via `PADDLE_PRICE_MAP` (6 price ids: 3 plans x monthly/annual) — **unknown price id silently defaults to starter/monthly** (verified `plan = planInfo?.plan || "starter"`); `seats = items[0].quantity`; `trial_end = data.next_billed_at` only while status is `trialing`; `cancel_at` from `scheduled_change.action === "cancel"`.
- Access model (`app/src/lib/planAccess.ts`): `subscriptions` row wins over org trial fields; statuses trialing/active -> unlocked, past_due -> locked, canceled/paused -> still ACTIVE until `cancel_at || current_period_end` passes, then locked; org-level `plan='trial'` + future `trial_ends_at` -> everything unlocked; expired trial -> locked. Plans: trial(0) < starter(1) < professional(2) < enterprise(3) (`PLAN_HIERARCHY`). Feature gates (Topics/Insights/PatternCards = Pro+, FaqAi/Integrations = Enterprise) are computed but **not yet enforced by routes/pages** (context.md REMAINING #3) — building that is coach-saas-plan-gating-campaign. The only plan-sensitive behavior LIVE in the analysis domain today is the follow-through lookback window (Section 8).

## When NOT to use this skill

- Actually landing a prompt/schema/code change (savepoints, both-routes rule, docs sync, push=deploy) -> `coach-saas-change-control`.
- A live failure right now (worker stuck, JSON parse failures, webhook silent) -> `coach-saas-debugging-playbook`; the full past-incident narratives (Unicode war, Paddle sagas, parser misattribution) -> `coach-saas-failure-archaeology`.
- System-wide invariants and data-flow contracts beyond the analysis domain -> `coach-saas-architecture-contract`.
- Dev environment, builds, env var names -> `coach-saas-build-env-run`; constant/threshold values and where they live -> `coach-saas-config-and-flags`.
- Writing/executing verification checklists -> `coach-saas-validation-and-qa`.
- Building plan-gating enforcement -> `coach-saas-plan-gating-campaign`; growth/SEO/landing work -> `supportcoach-growth-frontier`.
- The Chrome extension's coaching engine (different product, sibling repo `support-coach-extension`) -> `livechat-extension-domain-reference` there.

## Provenance and maintenance

Authored 2026-07-17 by direct read of: `app/src/app/api/process-jobs/route.ts`, `reanalyze-analysis/route.ts`, `team-summary/route.ts`, `manager-report/route.ts`, `manager-report-pdf/route.ts`, `reclassify-topics/route.ts`, `analyze/route.ts`, `create-analysis-job/route.ts`, `toggle-exclude/route.ts`, `update-coaching-delivery/route.ts`, `paddle-webhook/route.ts`, `app/src/lib/{coachingFollowthroughFetch,coachingFollowthrough,planAccess,paddle}.ts`, `app/src/app/dashboard/page.tsx`, `app/src/app/upload/page.tsx`, `app/src/components/FollowupMessageButton.tsx`, `app/docs/{rules,context,codex-orchestration}.md`, and git log (commits cited inline: `2fa4997`, `03b7306`, `36f5b8b`, `493f699`, `fa88735`, `8be2601`, `1bdf54d`, `2566750`, `84357bf`). Line numbers are as of HEAD `93de005`.

Known-open / UNVERIFIED items (never invent history for these): whether context.md's "API route strips them" ever matched shipped code after revert `1bdf54d`; whether anything external calls `/api/analyze`; whether the `toggle-exclude` org-filter gap is known to the owner; the exact `chat_analyses.excluded` column default (schema is not in git — check Supabase).

Volatile facts — re-verify before relying:

| Fact (as of 2026-07-17) | Re-verify with |
|---|---|
| `gpt-5.4` at exactly 8 call sites | `Get-ChildItem C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "gpt-5.4"` |
| Both workers still carry identical prompt sections (spot-check a marker line) | `Select-String -Path C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\src\app\api\process-jobs\route.ts,C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\src\app\api\reanalyze-analysis\route.ts -Pattern "HARD LIMIT: Use no more than 2-3"` |
| No `response_format` on the two workers | `Select-String -Path C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\src\app\api\process-jobs\route.ts,C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\src\app\api\reanalyze-analysis\route.ts -Pattern "response_format"` |
| team-summary ASCII instruction still at route.ts line ~42 | `Select-String -Path C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\src\app\api\team-summary\route.ts -Pattern "plain ASCII"` |
| Unicode `•` in exactly 6 files: worker-side only the process-jobs fallback, plus deliberate bullets in `analysis/[id]/page.tsx`, `dashboard/topics/page.tsx`, `dashboard/topics/[topic]/page.tsx`, `api/manager-report-pdf/route.ts`, and legacy `api/analyze/route.ts` — a NEW file in the list (especially reanalyze-analysis or team-summary) = drift | `Get-ChildItem C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\src -Recurse -Include *.ts,*.tsx | Select-String -Pattern ([char]0x2022) | Group-Object Path | Select-Object Name, Count` |
| 11 allowed coaching areas | `Select-String -Path C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\src\app\api\process-jobs\route.ts -Pattern "ALLOWED_COACHING_AREAS" -Context 0,13` |
| LIMIT 15 / windows 30-90-365 | `Select-String -Path C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\src\lib\planAccess.ts -Pattern "COACHING_FOLLOWTHROUGH"` |
| Exclusion filter coverage (both styles) | `Get-ChildItem C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "excluded" | Select-String -Pattern "eq|neq"` |
| Paddle webhook event list unchanged | `Select-String -Path C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\src\app\api\paddle-webhook\route.ts -Pattern "eventType ==="` |
| 6 Paddle price ids / plan hierarchy | `Select-String -Path C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\src\lib\paddle.ts -Pattern "pri_|PLAN_HIERARCHY"` |
| Plan gating still unenforced; Task 6b still open | `Select-String -Path C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai\app\docs\context.md -Pattern "Plan gating|Task 6b"` |
| HEAD still `93de005` (line numbers valid) | `git -C C:\Users\CHIST\Desktop\GitRepo\supportcoach-ai log --oneline -1` |
