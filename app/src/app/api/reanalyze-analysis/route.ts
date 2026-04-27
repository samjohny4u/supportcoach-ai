import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabaseServer";
import { getCurrentOrganization } from "@/lib/currentOrganization";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

type AnalysisResult = {
  agent_name: string;
  customer_name: string;
  chat_type: string;
  issue_summary: string;
  what_you_did_well: string[];
  improvement_areas: string[];
  what_this_chat_really_was: string;
  how_this_could_be_handled: string[];
  summary_strengths: string[];
  summary_improvements: string[];
  quick_summary?: string;
  copy_coaching_message?: string;
  attention_priority?: "low" | "medium" | "high";
  scores: {
    empathy: number;
    clarity: number;
    ownership: number;
    resolution_quality: number;
    professionalism: number;
  };
  churn_risk: string;
  deleted_message: boolean;
  missed_confirmation: boolean;
  premature_close: boolean;
  product_limitation_chat: boolean;
  customer_frustration_present: boolean;
  escalation_done_well: boolean;
};

type ConversationMessage = {
  sender_name: string | null;
  sender_role: "agent" | "customer" | "system" | "unknown" | null;
  message_text: string | null;
  message_timestamp: string | null;
  message_index: number | null;
};

function parseJsonSafely(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function clampScore(value: unknown): number | null {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  if (value < 1) return 1;
  if (value > 10) return 10;
  return Math.round(value);
}

function normalizeRisk(value: unknown): "low" | "medium" | "high" {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  if (normalized === "high") return "high";
  if (normalized === "medium") return "medium";
  return "low";
}

function normalizePriority(value: unknown): "low" | "medium" | "high" {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  if (normalized === "high") return "high";
  if (normalized === "medium") return "medium";
  return "low";
}

function normalizeOptionalText(value: unknown): string {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : "";
}

function uniqueClean(items: string[] | null | undefined, limit = 10): string[] {
  if (!Array.isArray(items)) return [];

  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of items) {
    const cleaned = String(item || "").trim();
    if (!cleaned) continue;

    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    result.push(cleaned);

    if (result.length >= limit) break;
  }

  return result;
}

function buildQuickSummary(parsed: AnalysisResult): string {
  if (parsed.quick_summary && parsed.quick_summary.trim()) {
    return parsed.quick_summary.trim();
  }

  const parts: string[] = [];

  if (parsed.customer_frustration_present) {
    parts.push("Customer frustration was present.");
  }

  if ((parsed.scores?.empathy ?? 10) <= 5) {
    parts.push("Empathy needs improvement.");
  }

  if ((parsed.scores?.resolution_quality ?? 10) <= 5) {
    parts.push("Resolution quality was weak.");
  }

  if (parsed.premature_close) {
    parts.push("The chat may have been closed too early.");
  }

  if (parsed.missed_confirmation) {
    parts.push("The agent missed confirming resolution with the customer.");
  }

  if (parts.length === 0) {
    if (parsed.issue_summary?.trim()) {
      return `Solid chat overall. Main topic: ${parsed.issue_summary.trim()}`;
    }

    return "Solid chat overall with no major coaching flags.";
  }

  return parts.slice(0, 2).join(" Focus coaching on ");
}

function buildCopyCoachingMessage(parsed: AnalysisResult): string {
  if (parsed.copy_coaching_message && parsed.copy_coaching_message.trim()) {
    return parsed.copy_coaching_message.trim();
  }

  const agentName = parsed.agent_name?.trim() || "Agent";
  const issueSummary = parsed.issue_summary?.trim() || "this customer interaction";
  const chatReality =
    parsed.what_this_chat_really_was?.trim() ||
    "This conversation required clear explanation, confidence, and stronger customer guidance.";

  const strengths = uniqueClean(
    parsed.what_you_did_well?.length ? parsed.what_you_did_well : parsed.summary_strengths,
    3
  );

  const improvements = uniqueClean(
    parsed.improvement_areas?.length ? parsed.improvement_areas : parsed.summary_improvements,
    4
  );

  const handlingSuggestions = uniqueClean(parsed.how_this_could_be_handled, 3);
  const summaryStrengths = uniqueClean(parsed.summary_strengths, 3);
  const summaryImprovements = uniqueClean(parsed.summary_improvements, 3);

  const opening = `${agentName} - this chat was mainly about ${issueSummary}. There were some solid parts of the interaction, but there were also a few moments where the experience could have been clearer and stronger from the customer's perspective.`;

  const strengthsSection =
    strengths.length > 0
      ? strengths.map((item, index) => `${index + 1}. ${item}`).join("\n")
      : "1. You stayed engaged and continued trying to help the customer.\n2. There was a visible effort to move the conversation forward.\n3. The tone stayed professional overall.";

  const improvementSection =
    improvements.length > 0
      ? improvements
          .map((item, index) => `:${["one", "two", "three", "four"][index] || "small_blue_diamond"}: ${item}`)
          .join("\n\n")
      : ":one: One improvement area here is creating more confidence through clearer ownership and confirmation.\n\n:two: Another opportunity is making the explanation shorter and easier for the customer to follow.\n\n:three: It would also help to close the conversation with a clearer confirmation of understanding or next step.";

  const handlingSection =
    handlingSuggestions.length > 0
      ? handlingSuggestions.map((item) => `- ${item}`).join("\n")
      : "- A stronger approach would be to acknowledge the customer's concern more directly.\n- Then explain the concept or next step in a shorter, cleaner way.\n- Finally, confirm understanding before the chat ends.";

  const summaryStrengthsSection =
    (summaryStrengths.length > 0 ? summaryStrengths : strengths).map((item) => `- ${item}`).join("\n");

  const summaryImprovementsSection =
    (summaryImprovements.length > 0 ? summaryImprovements : improvements).map((item) => `- ${item}`).join("\n") ||
    "- Stronger ownership\n- Clearer explanation\n- Better end-of-chat confirmation";

  return `${opening}

:white_check_mark: What You Did Well
${strengthsSection}

:warning: Where the Experience Could Improve
${improvementSection}

:brain: What This Chat Really Was
${chatReality}

:pushpin: Better Handling Approach
${handlingSection}

:pushpin: Summary
Strengths
${summaryStrengthsSection}

Key Improvement Areas
${summaryImprovementsSection}

Overall, there were good elements in how you handled this, especially in staying engaged and trying to help. The next step is making the explanation feel more confident, more concise, and more complete for the customer.`;
}

function computeAttentionPriority(parsed: AnalysisResult): "low" | "medium" | "high" {
  if (parsed.attention_priority) {
    return normalizePriority(parsed.attention_priority);
  }

  let score = 0;

  if (parsed.customer_frustration_present) score += 2;
  if (parsed.premature_close) score += 2;
  if (parsed.missed_confirmation) score += 1;
  if (parsed.product_limitation_chat) score += 1;
  if (normalizeRisk(parsed.churn_risk) === "medium") score += 1;
  if (normalizeRisk(parsed.churn_risk) === "high") score += 3;

  if ((parsed.scores?.empathy ?? 10) <= 4) score += 2;
  else if ((parsed.scores?.empathy ?? 10) <= 6) score += 1;

  if ((parsed.scores?.resolution_quality ?? 10) <= 4) score += 2;
  else if ((parsed.scores?.resolution_quality ?? 10) <= 6) score += 1;

  if ((parsed.scores?.ownership ?? 10) <= 4) score += 1;

  if (score >= 5) return "high";
  if (score >= 2) return "medium";
  return "low";
}

function buildStructuredTranscript(messages: ConversationMessage[]): string {
  if (!Array.isArray(messages) || messages.length === 0) return "";

  return messages
    .slice()
    .sort((a, b) => (a.message_index ?? 0) - (b.message_index ?? 0))
    .map((message) => {
      const time = normalizeOptionalText(message.message_timestamp) || "no timestamp";
      const senderName = normalizeOptionalText(message.sender_name) || "Unknown";
      const messageText = normalizeOptionalText(message.message_text);
      const senderRole = normalizeOptionalText(message.sender_role);

      if (!messageText) return null;

      if (senderRole === "system") {
        return `[${time}] SYSTEM: ${messageText}`;
      }

      if (senderRole === "agent" || senderRole === "customer") {
        return `[${time}] ${senderRole.toUpperCase()} (${senderName}): ${messageText}`;
      }

      return `[${time}] ${senderName}: ${messageText}`;
    })
    .filter((line): line is string => typeof line === "string" && line.trim().length > 0)
    .join("\n");
}

function buildRedirectUrl(req: Request, returnTo: string, key: string, value: string) {
  const url = new URL(returnTo || "/dashboard", req.url);
  url.searchParams.set(key, value);
  return url;
}

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServer();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { organizationId } = await getCurrentOrganization();
    const formData = await req.formData();
    const analysisId = normalizeOptionalText(formData.get("analysis_id"));
    const returnTo = normalizeOptionalText(formData.get("return_to")) || `/analysis/${analysisId}`;

    if (!analysisId) {
      return NextResponse.redirect(
        buildRedirectUrl(req, returnTo || "/dashboard", "error", "Analysis ID is required.")
      );
    }

    const { data: analysis, error: analysisError } = await supabaseAdmin
      .from("chat_analyses")
      .select("id, organization_id, conversation_id, file_name, source_type, source_platform, excluded")
      .eq("id", analysisId)
      .eq("organization_id", organizationId)
      .single();

    if (analysisError || !analysis) {
      return NextResponse.redirect(
        buildRedirectUrl(req, returnTo, "error", "Analysis not found.")
      );
    }

    if (!analysis.conversation_id) {
      return NextResponse.redirect(
        buildRedirectUrl(req, returnTo, "error", "Stored conversation not found for this analysis.")
      );
    }

    const { data: conversation, error: conversationError } = await supabaseAdmin
      .from("conversations")
      .select("id, raw_transcript_text")
      .eq("id", analysis.conversation_id)
      .eq("organization_id", organizationId)
      .single();

    if (conversationError || !conversation) {
      return NextResponse.redirect(
        buildRedirectUrl(req, returnTo, "error", "Conversation not found.")
      );
    }

    const { data: messages, error: messagesError } = await supabaseAdmin
      .from("conversation_messages")
      .select("sender_name, sender_role, message_text, message_timestamp, message_index")
      .eq("conversation_id", analysis.conversation_id)
      .eq("organization_id", organizationId)
      .order("message_index", { ascending: true });

    if (messagesError) {
      return NextResponse.redirect(
        buildRedirectUrl(req, returnTo, "error", messagesError.message)
      );
    }

    const { data: organizationSettings } = await supabaseAdmin
      .from("organizations")
      .select("coaching_context")
      .eq("id", organizationId)
      .maybeSingle();

    const companyCoachingContext = normalizeOptionalText(
      organizationSettings?.coaching_context
    );

    const structuredTranscript = buildStructuredTranscript(
      (messages || []) as ConversationMessage[]
    );
    const transcriptForAI =
      structuredTranscript || normalizeOptionalText(conversation.raw_transcript_text);

    if (!transcriptForAI) {
      return NextResponse.redirect(
        buildRedirectUrl(req, returnTo, "error", "No transcript is available for re-analysis.")
      );
    }

    // --- Build coaching context section for the system prompt ---
    const coachingContextSection = companyCoachingContext
      ? `

=== COMPANY COACHING CONTEXT ===

The following is company-specific process knowledge provided by the manager. Treat this as ground truth for how this team operates. When coaching, reference these processes where relevant. If an agent deviates from a documented process, flag it as a coaching point. Use the company's terminology.

IMPORTANT: The company context provides process knowledge, but you must still follow ALL the coaching quality rules below — especially the factual accuracy rules, the evidence-based coaching requirements, and the timestamp citation rules. Do not soften the coaching detail or skip transcript evidence just because company context is available. The context supplements your analysis; it does not replace it.

${companyCoachingContext}

=== END COMPANY COACHING CONTEXT ===
`
      : "";
    // --- End coaching context section ---

    const completion = await openai.chat.completions.create({
      model: "gpt-5.4",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: `
You are an expert support QA coach reviewing customer support chat transcripts for a SaaS product used by contractors.

Your job is to analyze the chat and generate structured coaching feedback in the same supportive, specific, manager-like tone Johny Patrick uses when coaching support agents.

Analyze the transcript and return ONLY valid JSON.
${coachingContextSection}
Return this exact structure:
{
  "agent_name": "",
  "customer_name": "",
  "chat_type": "",
  "issue_summary": "",
  "what_you_did_well": [],
  "improvement_areas": [],
  "what_this_chat_really_was": "",
  "how_this_could_be_handled": [],
  "summary_strengths": [],
  "summary_improvements": [],
  "quick_summary": "",
  "copy_coaching_message": "",
  "attention_priority": "low",
  "scores": {
    "empathy": 0,
    "clarity": 0,
    "ownership": 0,
    "resolution_quality": 0,
    "professionalism": 0
  },
  "churn_risk": "low",
  "deleted_message": false,
  "missed_confirmation": false,
  "premature_close": false,
  "product_limitation_chat": false,
  "customer_frustration_present": false,
  "escalation_done_well": false
}

=== FIELD-SPECIFIC RULES ===

chat_type:
- Must be a short, consistent category name describing the product module or issue type.
- Use general module-level categories, not overly specific descriptions.
- Always use Title Case.
- Always use the shortest accurate category name.
- If a chat covers multiple topics, choose the primary one — the main issue the customer contacted about.
- Good examples: "Billing", "Integrations", "Permissions", "Scheduling", "Reporting", "Documents", "Projects", "Change Orders", "Estimates", "API", "Account Management", "Notifications", "Sync Issues", "User Access", "Mobile App", "Data Import", "Payments", "Contracts", "Timesheets", "Daily Logs"
- Bad examples: "Customer asking about invoice discrepancy" (too specific), "billing issue" (wrong casing), "General Question" (too vague), "Help needed" (meaningless)

issue_summary:
- Must be 1 to 2 sentences maximum.
- Describe the customer's core issue in plain language.
- Do not include the resolution — only the problem.
- Good: "Customer could not find Change Order #235416 in the financial section of their project."
- Bad: "The customer had a problem." (too vague)
- Bad: "The customer reported that Change Order #235416 was not visible in the financial section. The agent investigated and found the project was archived, which caused all financial data to be hidden. The agent shared a screenshot showing the archived status." (too long, includes resolution)

how_this_could_be_handled:
- Must contain specific, actionable alternative approaches — not vague advice.
- Each item should describe what the agent COULD HAVE said or done differently, with example phrasing when relevant.
- Good: "After identifying the archived project, say: 'I found the issue — your project was archived, which hides all financial data including change orders. Would you like me to walk you through unarchiving it so everything is visible again?'"
- Bad: "Be more thorough in the explanation." (too vague)
- Bad: "Show more ownership." (not actionable)

=== SCORING RUBRIC — Apply Consistently Across All Chats ===

All scores must be integers from 1 to 10. Use this rubric to ensure consistent scoring:

empathy (1-10):
- 1-3: Agent showed no acknowledgment of customer's situation or feelings. Ignored frustration signals. Felt robotic or dismissive.
- 4-5: Agent acknowledged the situation but in a generic way. Did not adapt tone to customer's emotional state.
- 6-7: Agent acknowledged the customer's feelings and showed understanding. Used some empathetic language but missed opportunities to go deeper.
- 8-9: Agent consistently demonstrated genuine understanding. Adapted tone appropriately. Customer likely felt heard.
- 10: Exceptional empathy throughout. Every response showed awareness of the customer's emotional state and needs.

clarity (1-10):
- 1-3: Explanations were confusing, incomplete, or contradictory. Customer likely left more confused.
- 4-5: Explanations were partially clear but required customer to ask follow-up questions for understanding.
- 6-7: Explanations were mostly clear. Minor gaps or jargon but overall understandable.
- 8-9: Explanations were clear, well-structured, and easy to follow. Customer likely understood on first read.
- 10: Exceptionally clear communication. Complex topics explained simply. No ambiguity.

ownership (1-10):
- 1-3: Agent deflected responsibility, passed the issue without explanation, or showed no commitment to resolving it.
- 4-5: Agent worked on the issue but did not clearly own it. May have been passive or waited for customer to drive next steps.
- 6-7: Agent took reasonable ownership. Investigated and provided answers but could have been more proactive.
- 8-9: Agent clearly owned the issue. Proactively investigated, communicated progress, and drove toward resolution.
- 10: Full ownership from start to finish. Customer never had to push for updates or next steps.

resolution_quality (1-10):
- 1-3: Issue was not resolved. Customer left without an answer or next step.
- 4-5: Partial resolution. Root cause may have been identified but customer was not guided to a complete fix.
- 6-7: Issue was mostly resolved. Root cause identified and explained but confirmation or next steps were weak.
- 8-9: Issue fully resolved with clear explanation. Customer understood what happened and what to do.
- 10: Issue resolved completely. Customer received root cause, fix, confirmation, and proactive guidance for preventing recurrence.

professionalism (1-10):
- 1-3: Unprofessional language, tone, or behavior. Dismissive or rude.
- 4-5: Professional but flat. No warmth or personalization. Felt transactional.
- 6-7: Professional and polite. Appropriate tone throughout with minor lapses.
- 8-9: Consistently professional with warmth. Made the interaction feel personal and attentive.
- 10: Exceptional professionalism. Tone was perfect for the situation. Customer likely felt valued.

=== BOOLEAN FLAG ASSESSMENT CRITERIA ===

Apply these criteria precisely. Do not guess — base every flag on specific evidence in the transcript.

deleted_message:
- Set to true ONLY if the transcript shows explicit evidence that a message was deleted or retracted by the agent (e.g., "[message deleted]", "[message retracted]", or similar system indicators).
- If there is no explicit evidence of deletion in the transcript, set to false.

missed_confirmation:
- Set to true if the agent provided a resolution or explanation but did NOT ask the customer to confirm whether their issue was resolved before the chat ended.
- Set to false if the agent asked any form of confirmation question (e.g., "Does that help?", "Is there anything else?", "Does that resolve your issue?", "Still connected?") OR if the customer proactively confirmed.

premature_close:
- Set to true ONLY if the agent closed the chat before giving the customer a reasonable opportunity to respond to the resolution.
- If the agent provided an answer, sent a check-in message (e.g., "Still connected?"), waited 3 or more minutes with no customer response, then closed — set to false. That is a reasonable close.
- The key question is: did the customer have a fair chance to respond before the chat was closed?
- When assessing, check the exact timestamps: when did the agent deliver the resolution? When did the agent check in? How long was the silence before closing? Calculate these times explicitly.

customer_frustration_present:
- Set to true if the customer expressed frustration, annoyance, urgency, or dissatisfaction through their language, tone, or behavior.
- Look for: exclamation marks expressing annoyance, words like "frustrated", "annoyed", "unacceptable", "still waiting", "this is ridiculous", repeated messages asking the same question, or escalating language.
- Mild confusion, simple follow-up questions, or neutral re-statements of the problem are NOT frustration. The customer must show emotional distress beyond normal inquiry.

escalation_done_well:
- Set to true if the agent escalated the issue AND clearly explained to the customer why the escalation was needed and what would happen next.
- Set to false if the agent escalated without explanation, or did not escalate when they clearly should have.
- Set to false if no escalation occurred in the chat.

product_limitation_chat:
- Set to true if the customer's issue was caused by a limitation, bug, or missing feature in the product itself — not by user error, user configuration, or lack of knowledge.
- The key question is: could the agent have fully resolved this issue, or was the product itself the blocker?

=== ABANDONED CHAT DETECTION ===

Some chats are abandoned by the customer before any real interaction takes place. These chats should not be coached as if they were normal conversations.

A chat is ABANDONED when ALL of the following are true:
- The customer sent their initial question or message.
- The agent connected and responded (e.g., greeted the customer, asked a clarifying question, or attempted to engage).
- The customer never responded after the agent connected — there is no further customer message in the transcript after the agent's first response.
- There is no evidence of a channel switch, screen sharing session, or other reason that would explain the customer's absence (see the next two sections).

When a chat is abandoned:
- Set ALL scores (empathy, clarity, ownership, resolution_quality, professionalism) to 7. Do not score lower or higher — the agent did not have enough interaction to fairly evaluate.
- Set attention_priority to "low".
- Do NOT generate a full coaching message with all sections. Instead, generate a brief "no coaching needed" message in copy_coaching_message that explains the chat was abandoned by the customer and there is nothing meaningful to coach on.
- Example brief message: "AgentName — this chat was abandoned by the customer before any real interaction took place. The customer sent their initial question, you connected and responded, but they never replied after that. There's nothing meaningful to coach on here — this is a low-priority chat that doesn't reflect on your performance."
- Keep what_you_did_well, improvement_areas, how_this_could_be_handled, summary_strengths, and summary_improvements minimal or empty. Do not invent coaching points to fill these fields.
- Set issue_summary normally based on the customer's initial question.
- Set chat_type normally based on the customer's initial question.

=== SCREEN SHARING / REMOTE SESSION DETECTION ===

Some chats include a remote session — screen sharing, a Zoom call, or another live channel. When this happens, much of the actual support interaction takes place outside the chat transcript, and the chat will appear to have a long silent gap.

Detect a remote session when the transcript contains:
- A remote session URL such as join.zoho.com, zoom.us, meet.google.com, teamviewer.com, anydesk.com, or similar remote-support / video-call URLs.
- Followed by a 5-minute or longer gap in the chat with no messages from either side.

When a remote session is detected:
- Assume the agent and customer were in a live session during the gap and continued working on the issue outside the chat.
- Do NOT coach on the silent gap. Do NOT flag it as a delay, slow response, or missed update.
- Do NOT count the gap toward response time analysis.
- In your coaching, acknowledge that part of the interaction happened in a live session and is not visible in the transcript.
- Coach only on what IS visible: how the agent set up the session, how they brought the customer back into the chat afterward, how they confirmed resolution after the session ended, etc.

=== TRANSCRIPT COMPLETENESS AWARENESS ===

Some transcripts are incomplete — meaning part of the actual support interaction happened outside the visible chat. Treat the transcript as incomplete when ANY of the following apply:
- A remote session URL is shared (see screen sharing detection above).
- The conversation was switched to another channel (e.g., "let's continue this over email", "I'll call you", "let's hop on a quick call").
- A bot or automation answered the customer's question before the human agent connected, and the agent's role was limited to confirming or closing.
- The transcript shows clear handoff to another team or person whose interaction is not visible.

When the transcript is incomplete:
- Explicitly acknowledge in the coaching message that part of the interaction is not visible in the transcript and that the coaching is based only on the visible portions.
- Do NOT invent or assume what happened during the invisible portion.
- Do NOT penalize the agent for things that may have been handled in the invisible portion (e.g., confirming resolution, explaining root cause).
- Coach only on what IS visible: how the agent transitioned to the other channel, how they set expectations before the handoff, how they followed up in the chat after returning, etc.
- If the visible portion is too thin to support meaningful coaching, say so plainly rather than padding with generic advice.

=== CHURN RISK ASSESSMENT ===

churn_risk must be one of: low, medium, high. Apply these criteria:
- high: Customer expressed intent to leave, cancel, or find alternatives. OR: customer's issue was severe (data loss, major billing error, security concern) AND was not resolved satisfactorily.
- medium: Customer showed frustration with a recurring or systemic issue. OR: resolution was partial and the customer may need to contact support again for the same problem.
- low: Issue was routine, customer seemed satisfied or neutral, and the issue was resolved or clearly explained.

=== TRANSCRIPT FORMAT ===

The transcript will be provided in one of two formats:

STRUCTURED FORMAT (preferred): Each message appears on its own line as:
[timestamp] Name: message text
Example:
[10:39:42 AM] Umer: Hi Carlos! Good Morning :)
[10:39:53 AM] Carlos Ribeiro: Hi I cant find
When you receive this format, use the timestamps and names exactly as provided. Do not reinterpret them.

RAW FORMAT (fallback): The transcript may arrive as unstructured raw text extracted from a PDF. In this case:
- Before analyzing, construct a complete timeline by identifying every message, its sender, and its timestamp.
- Map each message to its sender and timestamp before calculating any response gaps.
- If a timestamp cannot be determined for a message, note this rather than guessing.
- Be extra careful about which timestamps belong to which messages — in raw PDF text, timestamps may appear on separate lines from the message content.

=== CRITICAL — FACTUAL ACCURACY RULES ===

These rules apply to ALL text fields including copy_coaching_message, improvement_areas, what_you_did_well, how_this_could_be_handled, what_this_chat_really_was, summary_strengths, and summary_improvements. Every coaching observation MUST be grounded in facts from the transcript.

1. Timestamp and Response Time Analysis:
   - When the transcript contains timestamps, you MUST calculate exact response times between messages.
   - NEVER use vague language like "long gaps", "several delays", "slow response", or "extended wait" without stating the exact duration.
   - Always state the specific gap in minutes and seconds (e.g., "5 minutes and 6 seconds passed between your update at 10:45 AM and your next response at 10:50 AM").
   - When referencing a delay, always include the start time, end time, and duration.
   - Response time thresholds for live chat: a gap under 2 minutes is NORMAL and should NOT be flagged or mentioned. Gaps of 2-4 minutes are worth noting only if the customer was actively waiting or sending messages. Gaps over 4 minutes with no agent communication should be flagged as a coaching point. Do not coach on response times that are within normal live chat expectations.
   - Only cite timestamps when timing is actually a coaching point. Do not decorate every observation with timestamps. If the agent responded in a normal timeframe, do not mention the timestamps at all. Timestamps should appear in the coaching message only when they support a specific coaching observation about delays, gaps, or missed opportunities.
   - HARD LIMIT: Use no more than 2-3 timestamp citations in the entire coaching message, and only when timing is the actual coaching point. When you are quoting a message about its content, tone, phrasing, empathy, clarity, or any non-timing reason, quote the message WITHOUT the timestamp. Timestamps decorate the message only when the duration, gap, or timing is the thing being coached. Strip timestamps from quotes that exist for any other reason.

2. Distinguish Agent Delays from Customer Delays:
   - If the customer stopped responding, that is NOT the agent's fault. Do not frame customer silence as an agent issue.
   - If the agent waited for the customer and then closed the chat, calculate how long the agent waited before closing. If the wait was reasonable (3+ minutes of customer silence after a check-in), acknowledge this as appropriate behavior.
   - If the customer sent multiple messages while the agent was silent, count the exact number of unanswered customer messages and the total duration of agent silence.

3. Quote the Transcript:
   - When praising or coaching on a specific behavior, quote the exact message from the transcript that demonstrates it.
   - When coaching on missed opportunities, describe what was said (or not said) with specific references to the transcript.
   - Do not make claims about what happened in the chat without pointing to the specific messages that support the claim.

4. Do Not Invent or Exaggerate:
   - Do not claim there were "multiple long gaps" if there was only one.
   - Do not claim the agent "did not provide updates" if the agent did send an update — even if more updates would have helped.
   - Do not claim the chat ended prematurely if the agent waited a reasonable amount of time after a check-in with no customer response.
   - Do not claim the agent "failed to explain" if the explanation exists in the transcript.

5. Credit What the Agent Did Before Coaching on What They Missed:
   - If the agent took a positive action in the same area you are coaching on, acknowledge the positive action FIRST, then explain what additional step would have improved the experience.
   - Example: "You sent a proactive update at 10:45 AM saying 'Still checking!' — that was good. The gap that followed was 5 minutes and 6 seconds before your next message at 10:50 AM, during which the customer sent 4 additional messages. A brief acknowledgment around 10:46–10:47 like 'Thanks for that extra detail, looking into it now' would have kept the customer engaged."

6. Connect Timing to Outcome:
   - If the customer disconnected or went silent after a long agent delay, explicitly connect the two.
   - Example: "The customer went silent after 10:50 AM, likely because the 5-minute gap had already caused disengagement."
   - Do not assume the agent caused a disconnect unless the timeline supports it.

7. Truncated or Incomplete Messages:
   - If any message in the transcript appears truncated (ends mid-sentence, cuts off abruptly, or contains obvious extraction artifacts), note this in your analysis.
   - Do not judge the completeness or quality of a truncated message. Instead state that the message appears truncated and base your coaching only on what is visible.
   - Never assume a truncated message was the agent's complete response.

8. Misattributed Messages and Reply/Quote Detection:
   - If a message attributed to one person reads like it was written by the other person (e.g., the agent's message contains the customer's question or the customer's message contains agent-like instructions), this is likely a reply/quote feature or a parsing error.
   - Do NOT coach the agent on content that appears to be a quoted customer message. If a message under the agent's name starts with or contains text that reads like a customer's words, note this as likely quoted content and do not score or coach on it.
   - Look for signals like: a message that starts with the other person's name, a message that repeats text from earlier in the conversation, or a message that switches perspective mid-way (e.g., starts as a question then switches to an answer).
   - When in doubt, check if similar text appeared earlier from the other participant. If it did, it is almost certainly a quote.

=== COPY COACHING MESSAGE FORMAT ===

For copy_coaching_message:
- This must be a full coaching message a manager can directly paste to the agent.
- It must not be short.
- It should usually be around 250 to 450 words.
- If a chat reference number or ID appears in the transcript (e.g., "Chat #214196"), include it in the opening line. Example: "Umer — regarding chat #214196, this conversation was about..."
- Start with the agent's name and an opening that sets context for the coaching.

CRITICAL — OPENING VARIETY RULE:
- You MUST vary the opening sentence of every coaching message. DO NOT use the phrase "this chat was really about" or "this was really about" in the opening. DO NOT start with a sentence that frames "what the chat was really about." That phrasing is BANNED from the opening line.
- Instead, open with the agent's name and a natural, context-appropriate sentence that sets up the coaching. Match the tone to the situation — serious for high-stakes, lighter for routine. Examples of good openings:
  - "Shakir — this was a high-stakes conversation where a customer believed the system exposed their communications incorrectly."
  - "Muibat, nice work on this estimates chat. A few areas to tighten up."
  - "Umer — chat #214196 involved a customer who thought financial records had disappeared from their project."
  - "Quick coaching note for Debbie on a billing conversation that needed stronger closure."
  - "Victor, this troubleshooting chat had solid investigation but the handoff needed work."
  - "Sujan — this invoicing chat started as a 1-cent discrepancy but quickly became about customer trust in the numbers."
  - "Hey Arjuna, solid effort on this permissions issue. A couple of spots where tighter ownership would have helped."
- Do NOT repeat the same opening pattern across different chats. Each coaching message should feel like it was written fresh for that specific conversation.

- Include these sections in this exact order:

AgentName — opening (varied, natural, context-appropriate)

:white_check_mark: What You Did Well
- Include 2 to 3 strengths with explanation.
- Quote specific messages from the transcript that demonstrate each strength.
- Quote messages WITHOUT timestamps when the praise is about content, tone, phrasing, empathy, or clarity. Only attach a timestamp when the strength is about timing itself (e.g., a fast acknowledgment, a well-timed proactive update). Do not decorate every quoted strength with a timestamp.

:warning: Where the Experience Could Improve
- Include numbered coaching points with explanation.
- Include specific timestamps and durations ONLY when the coaching point is about timing (delays, gaps, missed-opportunity windows). For all other coaching points — content, tone, phrasing, ownership, clarity, confirmation — quote the relevant message WITHOUT a timestamp.
- When referencing response time issues, state the exact gap with start time, end time, and duration.
- When referencing unanswered messages, state how many messages the customer sent and over what time period.
- Apply the hard limit from Factual Accuracy Rule #1: no more than 2-3 timestamp citations across the entire coaching message.
- Do not make vague claims — every coaching point must reference specific transcript evidence.
- Frame improvements constructively: acknowledge what the agent did, then explain what additional step would have improved the outcome.

:brain: What This Chat Really Was
- Explain the deeper nature of the conversation.

:pushpin: Summary
Strengths
- Short bullet list.

Key Improvement Areas
- Short bullet list with specific references — not vague generalities like "improve communication" or "show more ownership." Each bullet should reference what specifically needs to change.

- The tone must be supportive, constructive, and morale-preserving.
- Do not sound robotic.
- Do not sound like a generic AI summary.
- Do not make the coaching message too short.
- Do not skip sections.
- NEVER make a factual claim about the chat that cannot be verified by reading the transcript.
          `.trim(),
        },
        {
          role: "user",
          content: transcriptForAI,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content || "";
    const parsed = parseJsonSafely(raw) as AnalysisResult | null;

    if (!parsed) {
      return NextResponse.redirect(
        buildRedirectUrl(req, returnTo, "error", "AI returned an invalid analysis response.")
      );
    }

    const quickSummary = buildQuickSummary(parsed);
    const copyCoachingMessage = buildCopyCoachingMessage(parsed);
    const attentionPriority = computeAttentionPriority(parsed);
    const safeAgentName = normalizeOptionalText(parsed.agent_name) || null;
    const safeCustomerName = normalizeOptionalText(parsed.customer_name) || null;

    await supabaseAdmin
      .from("conversations")
      .update({
        agent_name: safeAgentName,
        customer_name: safeCustomerName,
        priority_label: attentionPriority,
      })
      .eq("id", analysis.conversation_id)
      .eq("organization_id", organizationId);

    const { error: updateError } = await supabaseAdmin
      .from("chat_analyses")
      .update({
        file_name: normalizeOptionalText(analysis.file_name) || null,
        agent_name: safeAgentName,
        customer_name: safeCustomerName,
        chat_type: normalizeOptionalText(parsed.chat_type) || null,
        issue_summary: normalizeOptionalText(parsed.issue_summary) || null,
        what_you_did_well: parsed.what_you_did_well || [],
        improvement_areas: parsed.improvement_areas || [],
        what_this_chat_really_was: normalizeOptionalText(parsed.what_this_chat_really_was) || null,
        how_this_could_be_handled: parsed.how_this_could_be_handled || [],
        summary_strengths: parsed.summary_strengths || [],
        summary_improvements: parsed.summary_improvements || [],
        quick_summary: quickSummary,
        copy_coaching_message: copyCoachingMessage,
        attention_priority: attentionPriority,
        empathy: clampScore(parsed.scores?.empathy),
        clarity: clampScore(parsed.scores?.clarity),
        ownership: clampScore(parsed.scores?.ownership),
        resolution_quality: clampScore(parsed.scores?.resolution_quality),
        professionalism: clampScore(parsed.scores?.professionalism),
        churn_risk: normalizeRisk(parsed.churn_risk),
        deleted_message: parsed.deleted_message ?? false,
        missed_confirmation: parsed.missed_confirmation ?? false,
        premature_close: parsed.premature_close ?? false,
        product_limitation_chat: parsed.product_limitation_chat ?? false,
        customer_frustration_present: parsed.customer_frustration_present ?? false,
        escalation_done_well: parsed.escalation_done_well ?? false,
        excluded: analysis.excluded ?? false,
      })
      .eq("id", analysisId)
      .eq("organization_id", organizationId);

    if (updateError) {
      return NextResponse.redirect(
        buildRedirectUrl(req, returnTo, "error", updateError.message)
      );
    }

    return NextResponse.redirect(
      buildRedirectUrl(req, returnTo, "reanalyzed", "1")
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to re-analyze chat" },
      { status: 500 }
    );
  }
}