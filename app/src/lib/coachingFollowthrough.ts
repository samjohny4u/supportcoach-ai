import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type FollowthroughStatus = "followed_through" | "repeated" | "no_opportunity";

type FollowthroughRow = {
  id: string;
  source_analysis_id: string;
  source_coaching_point_id: string;
  detected_in_analysis_id: string;
  status: string | null;
  evidence: string | null;
  manager_override: string | null;
  created_at: string;
};

type CoachingPointRecord = {
  id?: unknown;
  specific_behavior?: unknown;
  recommended_behavior?: unknown;
};

type AnalysisLookupRow = {
  id: string;
  coaching_points?: unknown;
  coaching_delivered_at?: string | null;
  customer_name?: string | null;
};

export type AgentScorecard = {
  followed_through: number;
  repeated: number;
  no_opportunity: number;
  total: number;
  followthrough_rate: number;
};

export type RepeatedCoaching = {
  followthrough_id: string;
  source_analysis_id: string;
  source_coaching_point_id: string;
  source_specific_behavior: string;
  source_recommended_behavior: string;
  source_delivered_at: string | null;
  detected_in_analysis_id: string;
  detected_in_customer_name: string | null;
  detected_at: string;
  evidence: string | null;
  repeat_count: number;
};

function zeroScorecard(): AgentScorecard {
  return {
    followed_through: 0,
    repeated: 0,
    no_opportunity: 0,
    total: 0,
    followthrough_rate: 0,
  };
}

function getWindowStart(windowDays: number): string {
  const safeWindowDays =
    typeof windowDays === "number" && Number.isFinite(windowDays) && windowDays > 0
      ? windowDays
      : 30;

  return new Date(Date.now() - safeWindowDays * 24 * 60 * 60 * 1000).toISOString();
}

function effectiveStatus(row: {
  status: string | null;
  manager_override: string | null;
}): FollowthroughStatus | null {
  const value = row.manager_override || row.status || "";

  if (
    value === "followed_through" ||
    value === "repeated" ||
    value === "no_opportunity"
  ) {
    return value;
  }

  return null;
}

function findCoachingPoint(
  points: unknown,
  pointId: string
): { specific_behavior: string; recommended_behavior: string } | null {
  if (!Array.isArray(points)) return null;

  const match = points.find((point: CoachingPointRecord) => {
    return point && typeof point === "object" && point.id === pointId;
  });

  if (!match || typeof match !== "object") return null;

  const specificBehavior =
    typeof match.specific_behavior === "string" ? match.specific_behavior : "";
  const recommendedBehavior =
    typeof match.recommended_behavior === "string" ? match.recommended_behavior : "";

  if (!specificBehavior || !recommendedBehavior) return null;

  return {
    specific_behavior: specificBehavior,
    recommended_behavior: recommendedBehavior,
  };
}

export async function getAgentScorecard(
  organizationId: string,
  agentName: string,
  windowDays: number
): Promise<AgentScorecard> {
  try {
    const { data, error } = await supabaseAdmin
      .from("coaching_followthrough")
      .select("status, manager_override")
      .eq("organization_id", organizationId)
      .eq("agent_name", agentName)
      .gte("created_at", getWindowStart(windowDays));

    if (error) {
      console.error("Failed to load agent coaching scorecard:", error.message);
      return zeroScorecard();
    }

    const scorecard = zeroScorecard();

    for (const row of data || []) {
      const status = effectiveStatus(row);
      if (!status) continue;

      scorecard[status] += 1;
      scorecard.total += 1;
    }

    const denominator = scorecard.followed_through + scorecard.repeated;
    scorecard.followthrough_rate =
      denominator > 0 ? Math.round((scorecard.followed_through / denominator) * 100) : 0;

    return scorecard;
  } catch (error) {
    console.error("Failed to load agent coaching scorecard:", error);
    return zeroScorecard();
  }
}

export async function getRepeatedCoachingForAgent(
  organizationId: string,
  agentName: string,
  windowDays: number
): Promise<RepeatedCoaching[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from("coaching_followthrough")
      .select(
        "id, source_analysis_id, source_coaching_point_id, detected_in_analysis_id, status, evidence, manager_override, created_at"
      )
      .eq("organization_id", organizationId)
      .eq("agent_name", agentName)
      .gte("created_at", getWindowStart(windowDays));

    if (error) {
      console.error("Failed to load repeated coaching rows:", error.message);
      return [];
    }

    const repeatedRows = ((data || []) as FollowthroughRow[]).filter((row) => {
      return effectiveStatus(row) === "repeated";
    });

    if (repeatedRows.length === 0) return [];

    const sourceIds = Array.from(
      new Set(repeatedRows.map((row) => row.source_analysis_id).filter(Boolean))
    );
    const detectedIds = Array.from(
      new Set(repeatedRows.map((row) => row.detected_in_analysis_id).filter(Boolean))
    );

    const [sourceResult, detectedResult] = await Promise.all([
      supabaseAdmin
        .from("chat_analyses")
        .select("id, coaching_points, coaching_delivered_at")
        .eq("organization_id", organizationId)
        .eq("excluded", false)
        .in("id", sourceIds),
      supabaseAdmin
        .from("chat_analyses")
        .select("id, customer_name")
        .eq("organization_id", organizationId)
        .eq("excluded", false)
        .in("id", detectedIds),
    ]);

    if (sourceResult.error) {
      console.error("Failed to load source analyses for repeated coaching:", sourceResult.error.message);
      return [];
    }

    if (detectedResult.error) {
      console.error(
        "Failed to load detected analyses for repeated coaching:",
        detectedResult.error.message
      );
      return [];
    }

    const sourceMap = new Map<string, AnalysisLookupRow>();
    for (const row of (sourceResult.data || []) as AnalysisLookupRow[]) {
      sourceMap.set(String(row.id), row);
    }

    const detectedMap = new Map<string, AnalysisLookupRow>();
    for (const row of (detectedResult.data || []) as AnalysisLookupRow[]) {
      detectedMap.set(String(row.id), row);
    }

    const enrichedRows: RepeatedCoaching[] = [];

    for (const row of repeatedRows) {
      const source = sourceMap.get(String(row.source_analysis_id));
      const detected = detectedMap.get(String(row.detected_in_analysis_id));
      if (!source || !detected) continue;

      const point = findCoachingPoint(
        source.coaching_points,
        row.source_coaching_point_id
      );
      if (!point) continue;

      enrichedRows.push({
        followthrough_id: String(row.id),
        source_analysis_id: String(row.source_analysis_id),
        source_coaching_point_id: String(row.source_coaching_point_id),
        source_specific_behavior: point.specific_behavior,
        source_recommended_behavior: point.recommended_behavior,
        source_delivered_at: source.coaching_delivered_at || null,
        detected_in_analysis_id: String(row.detected_in_analysis_id),
        detected_in_customer_name:
          typeof detected.customer_name === "string" ? detected.customer_name : null,
        detected_at: row.created_at,
        evidence: row.evidence || null,
        repeat_count: 1,
      });
    }

    // One card per behavior (Task 21): collapse multiple detections of the
    // same source coaching point into the LATEST one, carrying the total
    // repeat count so the card can say "repeated 3 times".
    const groupedByPoint = new Map<string, RepeatedCoaching>();

    for (const row of enrichedRows) {
      const key = `${row.source_analysis_id}|${row.source_coaching_point_id}`;
      const existing = groupedByPoint.get(key);

      if (!existing) {
        groupedByPoint.set(key, row);
        continue;
      }

      const totalCount = existing.repeat_count + row.repeat_count;
      const latest =
        new Date(row.detected_at).getTime() > new Date(existing.detected_at).getTime()
          ? row
          : existing;

      groupedByPoint.set(key, { ...latest, repeat_count: totalCount });
    }

    return Array.from(groupedByPoint.values()).sort((a, b) => {
      return new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime();
    });
  } catch (error) {
    console.error("Failed to load repeated coaching for agent:", error);
    return [];
  }
}
