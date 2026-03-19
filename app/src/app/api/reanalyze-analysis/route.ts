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

${
  companyCoachingContext
    ? `=== COMPANY COACHING CONTEXT ===

Use this organization-specific context when deciding whether the agent's explanation, guidance, and coaching opportunities align with company expectations.
- Treat this context as additional product and process knowledge for this organization.
- Prefer this context over generic assumptions when there is a conflict.
- Do not invent facts that are not supported by the transcript or the context.
- Use the context to improve topic classification, issue framing, and coaching accuracy when relevant.

Organization context:
${companyCoachingContext}
`
    : ""
}

=== FIELD-SPECIFIC RULES ===

chat_type:
- Must be a short, consistent category name describing the product module or issue type.
- Use general module-level categories, not overly specific descriptions.
- Always use Title Case.
- Always use the shortest accurate category name.
- If a chat covers multiple topics, choose the primary one - the main issue the customer contacted about.

issue_summary:
- Must be 1 to 2 sentences maximum.
- Describe the customer's core issue in plain language.
- Do not include the resolution - only the problem.

how_this_could_be_handled:
- Must contain specific, actionable alternative approaches - not vague advice.
- Each item should describe what the agent COULD HAVE said or done differently, with example phrasing when relevant.

=== SCORING RUBRIC ===

All scores must be integers from 1 to 10.
- empathy: score how well the agent acknowledged the customer's situation and emotional state.
- clarity: score how clear, organized, and understandable the explanation was.
- ownership: score how strongly the agent took responsibility and drove the issue toward resolution.
- resolution_quality: score how completely the issue was resolved or explained.
- professionalism: score tone, courtesy, and customer confidence.

=== BOOLEAN FLAG CRITERIA ===

- deleted_message: true only with explicit evidence of a deleted or retracted message.
- missed_confirmation: true if the agent resolved or explained the issue but did not confirm resolution before the chat ended.
- premature_close: true only if the agent closed the chat without giving a reasonable chance to respond.
- customer_frustration_present: true only if the customer expressed clear frustration or dissatisfaction.
- escalation_done_well: true only if the agent escalated appropriately and explained what would happen next.
- product_limitation_chat: true if the product itself was the blocker, not user confusion alone.

=== FACTUAL ACCURACY RULES ===

- Base every coaching claim on the transcript.
- When timing matters, cite exact timestamps and durations.
- Do not call sub-2-minute live chat response gaps slow.
- Do not blame the agent for customer silence.
- If the transcript contains quoted or misattributed content, do not coach the agent on quoted customer text.
- If a message appears truncated, note that and avoid over-interpreting it.

=== COPY COACHING MESSAGE FORMAT ===

- This must be a full coaching message a manager can paste to the agent.
- Use this order: opening paragraph, :white_check_mark: What You Did Well, :warning: Where the Experience Could Improve, :brain: What This Chat Really Was, :pushpin: Summary.
- Keep the tone supportive, constructive, and morale-preserving.
- Do not make factual claims that cannot be verified by the transcript.
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
