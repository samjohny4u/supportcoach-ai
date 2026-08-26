import { createClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "../../../lib/supabaseServer";
import { getCurrentOrganization } from "../../../lib/currentOrganization";
import CopyButton from "../../../components/CopyButton";
import CoachingDeliveryControls from "../../../components/CoachingDeliveryControls";
import FollowthroughOverrideSelect from "../../../components/FollowthroughOverrideSelect";
import FollowthroughSummaryButton from "../../../components/FollowthroughSummaryButton";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type Analysis = {
  id: string;
  organization_id: string | null;
  conversation_id: string | null;
  file_name: string | null;
  agent_name: string | null;
  customer_name: string | null;
  chat_type: string | null;
  issue_summary: string | null;
  what_you_did_well: string[] | null;
  improvement_areas: string[] | null;
  what_this_chat_really_was: string | null;
  how_this_could_be_handled: string[] | null;
  summary_strengths: string[] | null;
  summary_improvements: string[] | null;
  quick_summary: string | null;
  copy_coaching_message: string | null;
  attention_priority: string | null;
  empathy: number | null;
  clarity: number | null;
  ownership: number | null;
  resolution_quality: number | null;
  professionalism: number | null;
  churn_risk: string | null;
  deleted_message: boolean | null;
  missed_confirmation: boolean | null;
  premature_close: boolean | null;
  product_limitation_chat: boolean | null;
  customer_frustration_present: boolean | null;
  escalation_done_well: boolean | null;
  excluded: boolean | null;
  coaching_delivered: boolean | null;
  coaching_delivered_at: string | null;
  coaching_notes: string | null;
};

type CoachingPointRecord = {
  id?: unknown;
  area?: unknown;
  specific_behavior?: unknown;
  recommended_behavior?: unknown;
};

type TranscriptMessage = {
  sender_name: string | null;
  sender_role: string | null;
  message_text: string | null;
  message_timestamp: string | null;
  message_index: number | null;
};

function ListSection({
  title,
  items,
}: {
  title: string;
  items: string[] | null | undefined;
}) {
  if (!items || items.length === 0) return null;

  return (
    <div className="rounded-3xl border border-white/10 bg-[#081225] p-6">
      <h2 className="mb-4 text-2xl font-semibold text-white">{title}</h2>
      <ul className="space-y-2 text-gray-300">
        {items.map((item, index) => (
          <li key={index}>• {item}</li>
        ))}
      </ul>
    </div>
  );
}

function getPriorityClasses(priority: string | null | undefined) {
  const normalized = (priority || "").toLowerCase();

  if (normalized === "high") {
    return "border border-red-500/20 bg-red-500/15 text-red-300";
  }

  if (normalized === "medium") {
    return "border border-yellow-500/20 bg-yellow-500/15 text-yellow-300";
  }

  return "border border-emerald-500/20 bg-emerald-500/15 text-emerald-300";
}

function getRiskClasses(risk: string | null | undefined) {
  const normalized = (risk || "").toLowerCase();

  if (normalized === "high") {
    return "border border-red-500/20 bg-red-500/15 text-red-300";
  }

  if (normalized === "medium") {
    return "border border-yellow-500/20 bg-yellow-500/15 text-yellow-300";
  }

  return "border border-emerald-500/20 bg-emerald-500/15 text-emerald-300";
}

function formatLabel(value: string | null | undefined) {
  if (!value) return "-";

  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

// --- Transcript display model (display-only; the worker parser is untouched) ---

type DisplayMessage = {
  sender: string | null;
  isSystem: boolean;
  time: string;
  text: string;
};

type DisplayGroup = {
  sender: string | null;
  isSystem: boolean;
  messages: Array<{ time: string; text: string }>;
};

const BOT_SENDER_NAME = "contractor foreman support";

const SYSTEM_TEXT_PATTERNS = [
  /is sharing a file with you/i,
  /forwarded the chat/i,
  /accepted the chat/i,
  /ended this chat/i,
  /thanks for contacting us today/i,
  /you will be connected/i,
];

function isSystemText(text: string): boolean {
  return SYSTEM_TEXT_PATTERNS.some((pattern) => pattern.test(text));
}

function isBotSender(sender: string | null): boolean {
  return (sender || "").trim().toLowerCase() === BOT_SENDER_NAME;
}

function matchesName(sender: string | null, target: string | null): boolean {
  const senderNormalized = (sender || "").trim().toLowerCase();
  const targetNormalized = (target || "").trim().toLowerCase();
  if (!senderNormalized || !targetNormalized) return false;
  return (
    senderNormalized === targetNormalized ||
    senderNormalized.startsWith(targetNormalized) ||
    targetNormalized.startsWith(senderNormalized)
  );
}

// Fallback for stored raw transcripts with no parsed conversation_messages rows.
// Mirrors the worker parser's heuristics (multi-space sender split BEFORE
// whitespace collapse, known-name prefix matching, continuation from the last
// sender) and skips the metadata header, which also keeps visitor email/phone
// off the page.
function buildFallbackDisplayMessages(raw: string, seedNames: string[]): DisplayMessage[] {
  if (!raw || !raw.trim()) return [];

  let text = raw.replace(/---\s*Page\s*\d+\s*---/gi, " ");
  text = text.replace(/\d{1,2}\s+[A-Za-z]{3},\s*(?=\d{1,2}:\d{2}:\d{2}\s*(?:AM|PM))/gi, "");

  const chatStartMatch = text.match(/Chat\s+Duration\s*:\s*[\d:]+/i);
  if (chatStartMatch && chatStartMatch.index !== undefined) {
    text = text.substring(chatStartMatch.index + chatStartMatch[0].length);
  }

  const timestampRegex = /(\d{1,2}:\d{2}:\d{2}\s*(?:AM|PM))/gi;
  const segments: Array<{ raw: string; time: string }> = [];
  let prevEnd = 0;
  let match;

  while ((match = timestampRegex.exec(text)) !== null) {
    const rawSegment = text.substring(prevEnd, match.index);
    if (rawSegment.trim().length >= 2) {
      segments.push({ raw: rawSegment, time: match[1].trim() });
    }
    prevEnd = match.index + match[0].length;
  }

  const knownNames = new Set<string>(
    seedNames.map((name) => name.trim()).filter((name) => name.length > 0)
  );
  knownNames.add("Contractor Foreman Support");

  const messages: DisplayMessage[] = [];
  let lastSender: string | null = null;

  for (const segment of segments) {
    const collapsed = segment.raw.replace(/\s+/g, " ").trim();

    if (isSystemText(collapsed)) {
      messages.push({ sender: null, isSystem: true, time: segment.time, text: collapsed });
      continue;
    }

    const senderSplit = segment.raw.replace(/\r?\n/g, " ").match(/^\s*(.{1,50}?)\s{2,}(\S.*)$/);
    if (senderSplit) {
      const possibleSender = senderSplit[1].replace(/\s+/g, " ").trim();
      const messageText = senderSplit[2].replace(/\s+/g, " ").trim();
      if (
        possibleSender.length > 0 &&
        possibleSender.length <= 50 &&
        !possibleSender.includes("://") &&
        possibleSender.split(" ").length <= 5 &&
        messageText.length > 0
      ) {
        knownNames.add(possibleSender);
        lastSender = possibleSender;
        messages.push({
          sender: possibleSender,
          isSystem: isBotSender(possibleSender),
          time: segment.time,
          text: messageText,
        });
        continue;
      }
    }

    // Longest known name first so "Jacob Smith" wins over "Jacob"
    let matched = false;
    for (const name of Array.from(knownNames).sort((a, b) => b.length - a.length)) {
      if (collapsed.startsWith(name)) {
        const remainder = collapsed.substring(name.length).trim();
        if (remainder.length > 0) {
          lastSender = name;
          messages.push({
            sender: name,
            isSystem: isBotSender(name),
            time: segment.time,
            text: remainder,
          });
          matched = true;
          break;
        }
      }
    }
    if (matched) continue;

    messages.push({
      sender: lastSender,
      isSystem: lastSender ? isBotSender(lastSender) : true,
      time: segment.time,
      text: collapsed,
    });
  }

  return messages;
}

function groupDisplayMessages(messages: DisplayMessage[]): DisplayGroup[] {
  const groups: DisplayGroup[] = [];

  for (const message of messages) {
    const last = groups[groups.length - 1];
    const continuesLast =
      last &&
      last.isSystem === message.isSystem &&
      (message.isSystem || last.sender === message.sender);

    if (continuesLast) {
      last.messages.push({ time: message.time, text: message.text });
    } else {
      groups.push({
        sender: message.sender,
        isSystem: message.isSystem,
        messages: [{ time: message.time, text: message.text }],
      });
    }
  }

  return groups;
}

// --- End transcript display model ---

function formatOrdinal(count: number) {
  const ordinals = ["", "first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth"];
  if (count >= 1 && count < ordinals.length) return ordinals[count];
  return `${count}th`;
}

function normalizeCoachingText(text: string) {
  return text
    .replace(/:white_check_mark:/g, "✅")
    .replace(/:warning:/g, "⚠️")
    .replace(/:brain:/g, "🧠")
    .replace(/:pushpin:/g, "📌")
    .replace(/:repeat:/g, "🔁")
    .replace(/:one:/g, "1.")
    .replace(/:two:/g, "2.")
    .replace(/:three:/g, "3.")
    .replace(/:four:/g, "4.");
}

function CoachingMessageSection({
  text,
  analysisId,
}: {
  text: string;
  analysisId: string;
}) {
  const normalized = normalizeCoachingText(text);
  const lines = normalized
    .split(/\r?\n/)
    .map((line) => line.trimEnd());

  return (
    <div className="rounded-3xl border border-white/10 bg-[#081225] p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold text-white">Coaching</h2>

        {text.trim() ? (
          <CopyButton
            text={text}
            analysisId={String(analysisId)}
            idleLabel="Copy Message"
            className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-4 py-2 text-sm font-semibold text-indigo-300 hover:bg-indigo-500/20"
          />
        ) : null}
      </div>

      {!text.trim() ? (
        <p className="text-gray-400">No coaching message available.</p>
      ) : (
        <div className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-5 text-[15px] leading-7 text-gray-200">
          {lines.map((line, index) => {
            const trimmed = line.trim();

            if (!trimmed) {
              return <div key={index} className="h-2" />;
            }

            const isSectionHeader =
              trimmed.startsWith("✅") ||
              trimmed.startsWith("⚠️") ||
              trimmed.startsWith("🧠") ||
              trimmed.startsWith("📌") ||
              trimmed.startsWith("🔁");

            const isBullet = trimmed.startsWith("- ") || trimmed.startsWith("• ");
            const isNumbered = /^\d+\.\s/.test(trimmed);
            const isSubLabel =
              trimmed === "Strengths" || trimmed === "Key Improvement Areas";

            if (isSectionHeader) {
              return (
                <h3 key={index} className="pt-2 text-lg font-semibold text-white">
                  {trimmed}
                </h3>
              );
            }

            if (isSubLabel) {
              return (
                <h4
                  key={index}
                  className="pt-1 text-sm font-semibold uppercase tracking-wide text-gray-400"
                >
                  {trimmed}
                </h4>
              );
            }

            if (isBullet) {
              return (
                <div key={index} className="pl-4 text-gray-200">
                  • {trimmed.replace(/^[-•]\s*/, "")}
                </div>
              );
            }

            if (isNumbered) {
              return (
                <div key={index} className="pl-1 text-gray-200">
                  {trimmed}
                </div>
              );
            }

            return (
              <p key={index} className="text-gray-200">
                {trimmed}
              </p>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BooleanPill({
  label,
  value,
}: {
  label: string;
  value: boolean | null | undefined;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
      <div className="mb-1 text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className={value ? "font-semibold text-yellow-300" : "font-semibold text-gray-300"}>
        {value ? "Yes" : "No"}
      </div>
    </div>
  );
}

export default async function AnalysisDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ reanalyzed?: string; error?: string }>;
}) {
  const supabaseAuth = await createSupabaseServer();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let organizationId: string;

  try {
    const organization = await getCurrentOrganization();
    organizationId = organization.organizationId;
  } catch (error: any) {
    const message = error?.message || "";

    if (
      message.includes("User is not assigned to an organization") ||
      message.includes("User not authenticated")
    ) {
      redirect("/onboarding");
    }

    throw error;
  }

  const { id } = await params;
  const resolvedSearchParams = (await searchParams) || {};

  const { data, error } = await supabase
    .from("chat_analyses")
    .select("*")
    .eq("id", id)
    .eq("organization_id", organizationId)
    .single();

  if (error || !data) {
    return (
      <main className="px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <a href="/jobs" className="mb-6 inline-block text-sm text-gray-400 hover:text-white">
            ← Back to Jobs
          </a>
          <div className="rounded-3xl border border-white/10 bg-[#081225] p-8 text-gray-400">
            Analysis not found.
          </div>
        </div>
      </main>
    );
  }

  const analysis = data as Analysis;
  const { data: followthroughData } = await supabase
    .from("coaching_followthrough")
    .select("id, source_analysis_id, source_coaching_point_id, status, evidence, manager_override, created_at")
    .eq("organization_id", organizationId)
    .eq("detected_in_analysis_id", id)
    .order("created_at", { ascending: true });

  const followthroughRows = Array.isArray(followthroughData) ? followthroughData : [];

  const followthroughDisplayRows: Array<{
    id: string;
    source_analysis_id: string;
    source_coaching_point_id: string;
    status: string;
    evidence: string;
    manager_override: string | null;
    source_specific_behavior: string;
    source_recommended_behavior: string;
    source_area: string;
    source_date: string;
    created_at: string;
  }> = [];

  if (followthroughRows.length > 0) {
    const sourceIds = Array.from(
      new Set(followthroughRows.map((row) => row.source_analysis_id))
    );

    const { data: sourceAnalyses } = await supabase
      .from("chat_analyses")
      .select("id, coaching_points, created_at")
      .eq("organization_id", organizationId)
      .in("id", sourceIds);

    const sourceMap = new Map<string, { coaching_points: unknown; created_at: string | null }>();
    for (const row of sourceAnalyses || []) {
      sourceMap.set(String(row.id), {
        coaching_points: row.coaching_points,
        created_at: row.created_at,
      });
    }

    for (const row of followthroughRows) {
      const source = sourceMap.get(String(row.source_analysis_id));
      if (!source || !Array.isArray(source.coaching_points)) continue;

      const matchingPoint = source.coaching_points.find((point: CoachingPointRecord) => {
        return point && typeof point === "object" && point.id === row.source_coaching_point_id;
      });

      if (!matchingPoint || typeof matchingPoint !== "object") continue;

      const specificBehavior =
        typeof matchingPoint.specific_behavior === "string"
          ? matchingPoint.specific_behavior
          : "";
      const recommendedBehavior =
        typeof matchingPoint.recommended_behavior === "string"
          ? matchingPoint.recommended_behavior
          : "";
      const area = typeof matchingPoint.area === "string" ? matchingPoint.area : "";

      followthroughDisplayRows.push({
        id: String(row.id),
        source_analysis_id: String(row.source_analysis_id),
        source_coaching_point_id: row.source_coaching_point_id,
        status: row.status,
        evidence: row.evidence || "",
        manager_override: row.manager_override,
        source_specific_behavior: specificBehavior,
        source_recommended_behavior: recommendedBehavior,
        source_area: area,
        source_date: source.created_at
          ? new Date(source.created_at).toISOString().split("T")[0]
          : "",
        created_at: row.created_at || "",
      });
    }
  }

  const visibleFollowthroughRows = followthroughDisplayRows.filter((row) => {
    const finalStatus = row.manager_override || row.status;
    return finalStatus !== "no_opportunity";
  });

  // For repeated points, count how many times the same source coaching point has
  // been detected as repeated up to this chat, so the card can say "second time" /
  // "third time" in an encouraging way.
  const repeatCounts = new Map<string, number>();
  const repeatedDisplayRows = followthroughDisplayRows.filter(
    (row) => (row.manager_override || row.status) === "repeated"
  );

  if (repeatedDisplayRows.length > 0) {
    const repeatedPointIds = Array.from(
      new Set(repeatedDisplayRows.map((row) => row.source_coaching_point_id))
    );

    const { data: repeatHistory } = await supabase
      .from("coaching_followthrough")
      .select("source_analysis_id, source_coaching_point_id, status, manager_override, created_at")
      .eq("organization_id", organizationId)
      .in("source_coaching_point_id", repeatedPointIds);

    for (const row of repeatedDisplayRows) {
      const count = (repeatHistory || []).filter((history) => {
        const historyFinalStatus = history.manager_override || history.status;
        return (
          String(history.source_analysis_id) === row.source_analysis_id &&
          history.source_coaching_point_id === row.source_coaching_point_id &&
          historyFinalStatus === "repeated" &&
          typeof history.created_at === "string" &&
          row.created_at.length > 0 &&
          new Date(history.created_at).getTime() <= new Date(row.created_at).getTime()
        );
      }).length;

      repeatCounts.set(row.id, count);
    }
  }

  const followthroughEvaluatedButNoAction =
    followthroughDisplayRows.length > 0 && visibleFollowthroughRows.length === 0;

  // Transcript for in-page verification of coaching claims (Phase 3 Task 14).
  // Parsed messages preferred; raw text is the fallback for unparsed chats.
  let transcriptMessages: TranscriptMessage[] = [];
  let rawTranscriptFallback = "";

  if (analysis.conversation_id) {
    const { data: messageRows } = await supabase
      .from("conversation_messages")
      .select("sender_name, sender_role, message_text, message_timestamp, message_index")
      .eq("conversation_id", analysis.conversation_id)
      .eq("organization_id", organizationId)
      .order("message_index", { ascending: true });

    transcriptMessages = Array.isArray(messageRows)
      ? (messageRows as TranscriptMessage[])
      : [];

    if (transcriptMessages.length === 0) {
      const { data: conversationRow } = await supabase
        .from("conversations")
        .select("raw_transcript_text")
        .eq("id", analysis.conversation_id)
        .eq("organization_id", organizationId)
        .maybeSingle();

      rawTranscriptFallback =
        typeof conversationRow?.raw_transcript_text === "string"
          ? conversationRow.raw_transcript_text.trim()
          : "";
    }
  }

  const transcriptDisplayMessages: DisplayMessage[] =
    transcriptMessages.length > 0
      ? transcriptMessages
          .map((message) => ({
            sender: message.sender_name,
            isSystem:
              message.sender_role === "system" ||
              isBotSender(message.sender_name) ||
              isSystemText(message.message_text || ""),
            time: message.message_timestamp || "",
            text: (message.message_text || "").trim(),
          }))
          .filter((message) => message.text.length > 0)
      : buildFallbackDisplayMessages(rawTranscriptFallback, [
          analysis.agent_name || "",
          analysis.customer_name || "",
        ]);

  const transcriptGroups = groupDisplayMessages(transcriptDisplayMessages);
  const hasTranscript = transcriptGroups.length > 0;

  const coachingMessage = analysis.copy_coaching_message?.trim() || "";
  const quickSummary = analysis.quick_summary?.trim() || "";
  const isExcluded = analysis.excluded === true;
  const reanalyzed = resolvedSearchParams.reanalyzed === "1";
  const pageError =
    typeof resolvedSearchParams.error === "string" &&
    resolvedSearchParams.error.trim().length > 0
      ? resolvedSearchParams.error.trim()
      : "";

  return (
    <main className="px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <a
            href="/jobs"
            className="mb-6 inline-block text-sm text-gray-400 hover:text-white"
          >
            ← Back to Jobs
          </a>

          <div className="mb-3 inline-flex items-center rounded-full border border-indigo-400/20 bg-indigo-400/10 px-3 py-1 text-xs font-medium text-indigo-300">
            Analysis Detail
          </div>

          <h1 className="mb-3 text-4xl font-bold tracking-tight">
            {analysis.agent_name || "Unknown Agent"} →{" "}
            {analysis.customer_name || "Unknown Customer"}
          </h1>

          <p className="text-gray-400">{analysis.file_name || "Unknown File"}</p>
        </div>

        {reanalyzed ? (
          <div className="mb-8 rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-300">
            Chat re-analyzed successfully using the latest saved company coaching context.
          </div>
        ) : null}

        {pageError ? (
          <div className="mb-8 rounded-3xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            {pageError}
          </div>
        ) : null}

        <div className="mb-8 rounded-3xl border border-white/10 bg-[#081225] p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-semibold text-white">Report Visibility</h2>

              {isExcluded ? (
                <div className="rounded-full border border-red-500/20 bg-red-500/15 px-3 py-1 text-xs font-semibold uppercase text-red-300">
                  Excluded From Reports
                </div>
              ) : (
                <div className="rounded-full border border-emerald-500/20 bg-emerald-500/15 px-3 py-1 text-xs font-semibold uppercase text-emerald-300">
                  Included In Reports
                </div>
              )}
            </div>

            <form method="post" action="/api/toggle-exclude">
              <input type="hidden" name="analysis_id" value={analysis.id} />
              <input type="hidden" name="excluded" value={isExcluded ? "false" : "true"} />
              <input type="hidden" name="return_to" value={`/analysis/${analysis.id}`} />
              <button
                type="submit"
                className={
                  isExcluded
                    ? "rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/20"
                    : "rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/20"
                }
              >
                {isExcluded ? "Include In Reports" : "Exclude From Reports"}
              </button>
            </form>
          </div>

          <p className="text-sm text-gray-400">
            Excluded chats remain viewable here, but they are removed from dashboards,
            reports, exports, and topic intelligence until included again.
          </p>
        </div>

        <div className="mb-8 rounded-3xl border border-white/10 bg-[#081225] p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold text-white">Re-Analyze Chat</h2>
              <p className="mt-2 text-sm text-gray-400">
                Re-run this analysis against the stored transcript using the latest prompt and
                company coaching context from Settings.
              </p>
            </div>

            <form method="post" action="/api/reanalyze-analysis">
              <input type="hidden" name="analysis_id" value={analysis.id} />
              <input type="hidden" name="return_to" value={`/analysis/${analysis.id}`} />
              <button
                type="submit"
                className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-4 py-2 text-sm font-semibold text-indigo-300 hover:bg-indigo-500/20"
              >
                Re-Analyze Chat
              </button>
            </form>
          </div>
        </div>

        <div className="mb-8 rounded-3xl border border-white/10 bg-[#081225] p-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold text-white">10-Second Coaching Summary</h2>
            <div
              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${getPriorityClasses(
                analysis.attention_priority
              )}`}
            >
              {analysis.attention_priority || "low"} priority
            </div>
          </div>

          <p className="text-gray-300">
            {quickSummary || "No quick coaching summary available."}
          </p>
        </div>

        {visibleFollowthroughRows.length > 0 ? (
          <div className="mb-8 rounded-3xl border border-white/10 bg-[#081225] p-6">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-2xl font-semibold text-white">
                Previous Coaching Follow-Through
              </h2>
              <FollowthroughSummaryButton
                agentName={analysis.agent_name || ""}
                rows={visibleFollowthroughRows.map((row) => ({
                  finalStatus: row.manager_override || row.status,
                  recommendedBehavior: row.source_recommended_behavior,
                  sourceDate: row.source_date,
                  evidence: row.evidence,
                  repeatCount: repeatCounts.get(row.id) || 1,
                }))}
              />
            </div>
            <p className="mb-5 text-sm text-gray-400">
              Assessments of how this chat reflects on prior coaching delivered to this agent.
            </p>

            <div className="space-y-4">
              {visibleFollowthroughRows.map((row) => {
                const finalStatus = row.manager_override || row.status;
                const statusClasses =
                  finalStatus === "followed_through"
                    ? "border-emerald-500/20 bg-emerald-500/15 text-emerald-300"
                    : finalStatus === "repeated"
                      ? "border-amber-500/20 bg-amber-500/15 text-amber-300"
                      : "border-white/10 bg-white/5 text-gray-300";

                const statusLabel =
                  finalStatus === "followed_through"
                    ? "Followed through"
                    : finalStatus === "repeated"
                      ? "Repeated"
                      : "No opportunity";

                return (
                  <div
                    key={row.id}
                    className="rounded-2xl border border-white/10 bg-black/20 p-5"
                  >
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                      <div
                        className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase ${statusClasses}`}
                      >
                        {statusLabel}
                        {row.manager_override ? " (override)" : ""}
                      </div>
                      <div className="text-xs text-gray-500">
                        Originally coached on {row.source_date || "unknown date"}
                      </div>
                    </div>

                    <div className="mb-3 text-sm text-gray-200">
                      <span className="text-xs uppercase tracking-wide text-gray-500">
                        Original behavior
                      </span>
                      <p className="mt-1">{row.source_specific_behavior}</p>
                    </div>

                    <div className="mb-3 text-sm text-gray-200">
                      <span className="text-xs uppercase tracking-wide text-gray-500">
                        Recommended behavior
                      </span>
                      <p className="mt-1">{row.source_recommended_behavior}</p>
                    </div>

                    {row.evidence ? (
                      <div className="mb-3 text-sm text-gray-200">
                        <span className="text-xs uppercase tracking-wide text-gray-500">
                          Evidence in this chat
                        </span>
                        <p className="mt-1 italic text-gray-300">{row.evidence}</p>
                      </div>
                    ) : null}

                    {finalStatus === "repeated" && (repeatCounts.get(row.id) || 0) >= 2 ? (
                      <div className="mb-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                        This is the {formatOrdinal(repeatCounts.get(row.id) || 0)} time this has
                        come up since coaching — worth a focused follow-up conversation to help it
                        stick.
                      </div>
                    ) : null}

                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <a
                        href={`/analysis/${row.source_analysis_id}`}
                        className="text-xs font-semibold text-indigo-300 hover:text-indigo-200"
                      >
                        View original analysis -&gt;
                      </a>
                      <FollowthroughOverrideSelect
                        followthroughId={row.id}
                        initialOverride={row.manager_override}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : followthroughEvaluatedButNoAction ? (
          <div className="mb-8 rounded-2xl border border-white/10 bg-[#081225] px-6 py-4 text-sm text-gray-400">
            Prior coaching evaluated for this chat — no action needed.
          </div>
        ) : null}

        <div className="mb-8">
          <CoachingMessageSection text={coachingMessage} analysisId={String(analysis.id)} />
        </div>

        <div className="mb-8">
          <CoachingDeliveryControls
            analysisId={String(analysis.id)}
            initialDelivered={analysis.coaching_delivered === true}
            initialDeliveredAt={analysis.coaching_delivered_at}
            initialNotes={analysis.coaching_notes || ""}
          />
        </div>

        <div className="mb-8 rounded-3xl border border-white/10 bg-[#081225] p-6">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div
              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${getRiskClasses(
                analysis.churn_risk
              )}`}
            >
              {analysis.churn_risk || "low"} churn risk
            </div>

            <div
              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${getPriorityClasses(
                analysis.attention_priority
              )}`}
            >
              {analysis.attention_priority || "low"} attention priority
            </div>

            <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase text-gray-300">
              {formatLabel(analysis.chat_type)}
            </div>
          </div>

          <div className="grid gap-4 text-sm text-gray-300 md:grid-cols-3">
            <div>Empathy: {analysis.empathy ?? "-"}</div>
            <div>Clarity: {analysis.clarity ?? "-"}</div>
            <div>Ownership: {analysis.ownership ?? "-"}</div>
            <div>Resolution Quality: {analysis.resolution_quality ?? "-"}</div>
            <div>Professionalism: {analysis.professionalism ?? "-"}</div>
            <div>Agent: {analysis.agent_name || "-"}</div>
            <div>Customer: {analysis.customer_name || "-"}</div>
            <div>File: {analysis.file_name || "-"}</div>
            <div>Analysis ID: {analysis.id}</div>
          </div>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <BooleanPill label="Deleted Message" value={analysis.deleted_message} />
          <BooleanPill label="Missed Confirmation" value={analysis.missed_confirmation} />
          <BooleanPill label="Premature Close" value={analysis.premature_close} />
          <BooleanPill
            label="Product Limitation Chat"
            value={analysis.product_limitation_chat}
          />
          <BooleanPill
            label="Customer Frustration"
            value={analysis.customer_frustration_present}
          />
          <BooleanPill
            label="Escalation Done Well"
            value={analysis.escalation_done_well}
          />
        </div>

        <div className="mb-8 rounded-3xl border border-white/10 bg-[#081225] p-6">
          <h2 className="mb-4 text-2xl font-semibold text-white">Issue Summary</h2>
          <p className="text-gray-300">{analysis.issue_summary || "No summary."}</p>
        </div>

        {analysis.what_this_chat_really_was && (
          <div className="mb-8 rounded-3xl border border-white/10 bg-[#081225] p-6">
            <h2 className="mb-4 text-2xl font-semibold text-white">
              What This Chat Really Was
            </h2>
            <p className="text-gray-300">{analysis.what_this_chat_really_was}</p>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <ListSection title="What You Did Well" items={analysis.what_you_did_well} />
          <ListSection title="Improvement Areas" items={analysis.improvement_areas} />
          <ListSection
            title="How This Could Be Handled"
            items={analysis.how_this_could_be_handled}
          />
          <ListSection title="Summary Strengths" items={analysis.summary_strengths} />
          <ListSection
            title="Summary Improvements"
            items={analysis.summary_improvements}
          />
        </div>

        {hasTranscript ? (
          <details className="mt-8 rounded-3xl border border-white/10 bg-[#081225] p-6">
            <summary className="cursor-pointer text-2xl font-semibold text-white">
              View Transcript
            </summary>
            <p className="mt-2 text-sm text-gray-400">
              The stored chat this analysis was generated from — for verifying coaching
              claims when an agent contests them. You should rarely need this.
            </p>
            <div className="mt-4 max-h-[32rem] space-y-4 overflow-y-auto rounded-2xl border border-white/10 bg-black/20 p-5 text-sm leading-6">
              {transcriptGroups.map((group, groupIndex) => {
                if (group.isSystem) {
                  return (
                    <div key={groupIndex} className="space-y-1">
                      {group.messages.map((message, messageIndex) => (
                        <p key={messageIndex} className="text-xs italic text-gray-600">
                          {message.text}
                        </p>
                      ))}
                    </div>
                  );
                }

                const isAgent = matchesName(group.sender, analysis.agent_name);
                const isCustomer =
                  !isAgent && matchesName(group.sender, analysis.customer_name);

                return (
                  <div
                    key={groupIndex}
                    className={`border-l-2 pl-4 ${
                      isAgent
                        ? "border-emerald-400/50"
                        : isCustomer
                          ? "border-sky-400/40"
                          : "border-white/10"
                    }`}
                  >
                    <p
                      className={`mb-1 text-xs font-semibold uppercase tracking-wide ${
                        isAgent
                          ? "text-emerald-300"
                          : isCustomer
                            ? "text-sky-300"
                            : "text-gray-400"
                      }`}
                    >
                      {group.sender || "Unknown"}
                      {isAgent ? " · Agent" : isCustomer ? " · Customer" : ""}
                    </p>
                    <div className="space-y-1">
                      {group.messages.map((message, messageIndex) => (
                        <p key={messageIndex} className="text-gray-200">
                          {message.text}{" "}
                          <span className="text-xs text-gray-600">{message.time}</span>
                        </p>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </details>
        ) : null}
      </div>
    </main>
  );
}
