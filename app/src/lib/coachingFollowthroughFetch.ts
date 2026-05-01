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

export function buildFollowthroughPromptSection(
  points: PriorCoachingPoint[]
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

Prior coaching points to assess:

${formatted}

=== END FOLLOW-THROUGH CHECK ===
`;
}
