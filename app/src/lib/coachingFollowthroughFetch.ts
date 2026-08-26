import type { SupabaseClient } from "@supabase/supabase-js";
import {
  COACHING_FOLLOWTHROUGH_LIMIT,
  getFollowthroughWindowDays,
} from "./planAccess";

export type PriorCoachingPoint = {
  point_id: string;
  source_analysis_id: string;
  source_date: string;
  area: string;
  specific_behavior: string;
  recommended_behavior: string;
};

export async function fetchPriorDeliveredCoachingPoints(
  supabase: SupabaseClient,
  organizationId: string,
  agentName: string | null,
  plan: string | null,
  excludeAnalysisId: string | number | null
): Promise<PriorCoachingPoint[]> {
  if (!agentName || !agentName.trim()) return [];

  const windowDays = getFollowthroughWindowDays(plan);
  const cutoff = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();

  let query = supabase
    .from("chat_analyses")
    .select("id, coaching_points, created_at")
    .eq("organization_id", organizationId)
    .eq("agent_name", agentName.trim())
    .eq("coaching_delivered", true)
    .eq("excluded", false)
    .gte("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(50);

  if (excludeAnalysisId !== null && excludeAnalysisId !== undefined) {
    query = query.neq("id", excludeAnalysisId);
  }

  const { data, error } = await query;

  if (error || !data) return [];

  const flat: PriorCoachingPoint[] = [];

  for (const row of data) {
    if (!Array.isArray(row.coaching_points)) continue;

    const sourceDate = row.created_at
      ? new Date(row.created_at).toISOString().split("T")[0]
      : "";

    for (const point of row.coaching_points) {
      if (!point || typeof point !== "object") continue;

      const candidate = point as Record<string, unknown>;
      const id = typeof candidate.id === "string" ? candidate.id.trim() : "";
      const area = typeof candidate.area === "string" ? candidate.area.trim() : "";
      const specific =
        typeof candidate.specific_behavior === "string"
          ? candidate.specific_behavior.trim()
          : "";
      const recommended =
        typeof candidate.recommended_behavior === "string"
          ? candidate.recommended_behavior.trim()
          : "";

      if (!id || !area || !specific || !recommended) continue;

      flat.push({
        point_id: id,
        source_analysis_id: String(row.id),
        source_date: sourceDate,
        area,
        specific_behavior: specific,
        recommended_behavior: recommended,
      });

      if (flat.length >= COACHING_FOLLOWTHROUGH_LIMIT) {
        return flat;
      }
    }
  }

  return flat;
}

export type OverrideCalibration = {
  point_id: string;
  ai_status: string;
  manager_status: string;
  corrected_on: string;
};

// Manager overrides where the manager DISAGREED with the AI, newest first.
// Fed back into future analyses as calibration — the closest this
// architecture gets to "learning" from the manager (prompt-level only).
export async function fetchOverrideCalibrations(
  supabase: SupabaseClient,
  organizationId: string,
  agentName: string | null
): Promise<OverrideCalibration[]> {
  if (!agentName || !agentName.trim()) return [];

  try {
    const { data, error } = await supabase
      .from("coaching_followthrough")
      .select("source_coaching_point_id, status, manager_override, created_at")
      .eq("organization_id", organizationId)
      .eq("agent_name", agentName.trim())
      .not("manager_override", "is", null)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error || !data) return [];

    const calibrations: OverrideCalibration[] = [];

    for (const row of data) {
      const aiStatus = typeof row.status === "string" ? row.status.trim() : "";
      const managerStatus =
        typeof row.manager_override === "string" ? row.manager_override.trim() : "";
      const pointId =
        typeof row.source_coaching_point_id === "string"
          ? row.source_coaching_point_id.trim()
          : "";

      // Only actual corrections teach anything — skip overrides that match the AI.
      if (!pointId || !aiStatus || !managerStatus || aiStatus === managerStatus) continue;

      calibrations.push({
        point_id: pointId,
        ai_status: aiStatus,
        manager_status: managerStatus,
        corrected_on: row.created_at
          ? new Date(row.created_at).toISOString().split("T")[0]
          : "",
      });

      if (calibrations.length >= 10) break;
    }

    return calibrations;
  } catch {
    return [];
  }
}

export function buildFollowthroughPromptSection(
  points: PriorCoachingPoint[],
  calibrations: OverrideCalibration[] = []
): string {
  if (points.length === 0) return "";

  const formatted = points
    .map(
      (point, index) =>
        `${index + 1}. point_id: "${point.point_id}"
   source_analysis_id: "${point.source_analysis_id}"
   source_date: ${point.source_date || "unknown"}
   area: ${point.area}
   specific_behavior: ${point.specific_behavior}
   recommended_behavior: ${point.recommended_behavior}`
    )
    .join("\n\n");

  return `

=== PREVIOUSLY DELIVERED COACHING - FOLLOW-THROUGH CHECK ===

This agent has been coached on the following specific behaviors in earlier chats. For each one, check whether the current chat shows:
- "followed_through": the agent applied the recommended behavior, OR a similar situation arose and the agent handled it correctly.
- "repeated": the agent did the same thing the original coaching said NOT to do.
- "no_opportunity": the situation that the coaching applies to did not arise in this chat.

Output a coaching_followthrough array. Each entry must have shape:
{
  "point_id": "<the original point_id, exactly as given below>",
  "source_analysis_id": "<the original source_analysis_id, exactly as given below>",
  "status": "followed_through" | "repeated" | "no_opportunity",
  "evidence": "<one short sentence quoting or describing what in the current chat supports this status. For no_opportunity, briefly state why the situation didn't arise.>"
}

Rules:
- Output one entry per prior coaching point listed below. Do not skip any.
- Be honest. If the situation didn't arise, say no_opportunity - do not invent follow-through evidence.
- For abandoned chats (per the Abandoned Chat Detection rules above), output coaching_followthrough: [] - there isn't enough interaction to assess any prior coaching.
- Use point_id and source_analysis_id values EXACTLY as given. Do not modify, shorten, or normalize them.

COACHING MESSAGE INTEGRATION - "SINCE LAST COACHING" SECTION:
- copy_coaching_message must include a compact section titled ":repeat: Since Last Coaching", placed immediately AFTER the opening paragraph and BEFORE the ":white_check_mark: What You Did Well" section.
- Format: 1 to 5 single-line bullets, maximum ~90 words for the whole section:
  - For each followed_through point: "- Applied: <short restatement of the recommended behavior> - seen in this chat. Nice work."
  - For each repeated point: "- Came back around: <short restatement> - let's make this the focus."
  - Skip no_opportunity points entirely. If there are more than 5 applied/repeated points, keep the 5 most important.
- If NO prior point is followed_through or repeated (all no_opportunity), OMIT the section entirely and do not mention prior coaching anywhere in the message.
- Tone: supportive continuity, not a scoreboard. Never list dates of past occurrences, never count strikes.
- Elsewhere in the message you may reference continuity briefly ("as we discussed before"), but do not restate the Since Last Coaching bullets in full.
- The overall message must stay within its normal length - trim elsewhere to make room for this section.
${
    calibrations.length > 0
      ? `
MANAGER CALIBRATION - LEARN FROM THESE CORRECTIONS:
The manager reviewed some of your past follow-through assessments for this agent and corrected them. The manager knows context you cannot see. Weight these corrections when assessing the points below, especially when the same point or a similar situation appears. Corrections, newest first:
${calibrations
          .map(
            (c) =>
              `- On point "${c.point_id}": you assessed "${c.ai_status}", the manager corrected it to "${c.manager_status}"${c.corrected_on ? ` (${c.corrected_on})` : ""}.`
          )
          .join("\n")}
`
      : ""
  }
Prior coaching points to assess:

${formatted}

=== END FOLLOW-THROUGH CHECK ===
`;
}
