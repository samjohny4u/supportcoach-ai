// app/api/reclassify-topics/route.ts
import OpenAI from "openai";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 500;

type ReclassifyRequestBody = {
  organization_id?: string;
};

type ChatAnalysisRow = {
  id: string;
  conversation_id: string | null;
};

type ConversationRow = {
  id: string;
  raw_transcript_text: string | null;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeChatType(value: unknown): string | null {
  if (!isNonEmptyString(value)) {
    return null;
  }

  return value.trim();
}

async function classifyChatType(transcriptText: string): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: "gpt-5.4",
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content: `You are classifying a customer support chat transcript for a SaaS product used by contractors.

Return ONLY a JSON object with one field:
{ "chat_type": "" }

chat_type rules:
- Must be a short, consistent category name describing the product module or issue type.
- Use general module-level categories, not overly specific descriptions.
- Always use Title Case.
- Always use the shortest accurate category name.
- If a chat covers multiple topics, choose the primary one.
- Good examples: "Billing", "Integrations", "Permissions", "Scheduling", "Reporting", "Documents", "Projects", "Change Orders", "Estimates", "API", "Account Management", "Notifications", "Sync Issues", "User Access", "Mobile App", "Data Import", "Payments", "Contracts", "Timesheets", "Daily Logs", "Feature Request", "Project Settings"
- Bad examples: "Customer asking about invoice discrepancy" (too specific), "Support" (too vague), "Technical Issue" (too vague), "Unknown" (meaningless), "Abandoned Chat" (that's an outcome, not a topic), "Workflow Confusion" (that's a symptom, not a topic)`,
      },
      {
        role: "user",
        content: `Classify this transcript.

Transcript:
${transcriptText}`,
      },
    ],
    response_format: {
      type: "json_object",
    },
  });

  const content = completion.choices[0]?.message?.content || "";

  if (!isNonEmptyString(content)) {
    throw new Error("OpenAI returned an empty classification response.");
  }

  let parsed: { chat_type?: unknown } | null = null;

  try {
    parsed = JSON.parse(content) as { chat_type?: unknown };
  } catch (error) {
    throw new Error(
      `Failed to parse OpenAI classification JSON: ${
        error instanceof Error ? error.message : "Unknown JSON parse error"
      }`
    );
  }

  const chatType = normalizeChatType(parsed?.chat_type);

  if (!chatType) {
    throw new Error("OpenAI response did not contain a valid chat_type.");
  }

  return chatType;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ReclassifyRequestBody;
    const organizationId =
      typeof body.organization_id === "string" && body.organization_id.trim().length > 0
        ? body.organization_id.trim()
        : null;

    if (!organizationId) {
      return NextResponse.json(
        { error: "organization_id is required" },
        { status: 400 }
      );
    }

    const { count, error: countError } = await supabase
      .from("chat_analyses")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId);

    if (countError) {
      console.error("[reclassify-topics] Failed to count chat analyses:", countError);
      return NextResponse.json(
        { error: countError.message || "Failed to count chat analyses" },
        { status: 500 }
      );
    }

    const totalRecords = typeof count === "number" ? count : 0;

    let processed = 0;
    let updated = 0;
    let skipped = 0;
    let failed = 0;
    let offset = 0;

    console.log(
      `[reclassify-topics] Starting re-classification for organization ${organizationId}. Total records: ${totalRecords}.`
    );

    while (true) {
      const { data: analysisBatch, error: analysisError } = await supabase
        .from("chat_analyses")
        .select("id, conversation_id")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: true })
        .range(offset, offset + BATCH_SIZE - 1);

      if (analysisError) {
        console.error("[reclassify-topics] Failed to fetch analysis batch:", analysisError);
        return NextResponse.json(
          {
            error: analysisError.message || "Failed to fetch analysis batch",
            organization_id: organizationId,
            total_records: totalRecords,
            processed,
            updated,
            skipped,
            failed,
          },
          { status: 500 }
        );
      }

      const batch = Array.isArray(analysisBatch)
        ? (analysisBatch as ChatAnalysisRow[])
        : [];

      if (batch.length === 0) {
        break;
      }

      const conversationIds = batch
        .map((row) => row.conversation_id)
        .filter((value): value is string => isNonEmptyString(value));

      const transcriptMap = new Map<string, string>();

      if (conversationIds.length > 0) {
        const { data: conversations, error: conversationsError } = await supabase
          .from("conversations")
          .select("id, raw_transcript_text")
          .in("id", conversationIds);

        if (conversationsError) {
          console.error(
            "[reclassify-topics] Failed to fetch conversations:",
            conversationsError
          );

          return NextResponse.json(
            {
              error: conversationsError.message || "Failed to fetch conversations",
              organization_id: organizationId,
              total_records: totalRecords,
              processed,
              updated,
              skipped,
              failed,
            },
            { status: 500 }
          );
        }

        const conversationRows = Array.isArray(conversations)
          ? (conversations as ConversationRow[])
          : [];

        for (const conversation of conversationRows) {
          if (
            typeof conversation.id === "string" &&
            isNonEmptyString(conversation.raw_transcript_text)
          ) {
            transcriptMap.set(conversation.id, conversation.raw_transcript_text.trim());
          }
        }
      }

      for (const analysis of batch) {
        processed += 1;

        try {
          if (!isNonEmptyString(analysis.conversation_id)) {
            skipped += 1;
            console.error(
              `[reclassify-topics] Skipping analysis ${analysis.id}: missing conversation_id.`
            );
            continue;
          }

          const transcriptText = transcriptMap.get(analysis.conversation_id);

          if (!isNonEmptyString(transcriptText)) {
            skipped += 1;
            console.error(
              `[reclassify-topics] Skipping analysis ${analysis.id}: missing raw_transcript_text.`
            );
            continue;
          }

          const newChatType = await classifyChatType(transcriptText);

          const { error: updateError } = await supabase
            .from("chat_analyses")
            .update({ chat_type: newChatType })
            .eq("id", analysis.id)
            .eq("organization_id", organizationId);

          if (updateError) {
            failed += 1;
            console.error(
              `[reclassify-topics] Failed to update analysis ${analysis.id}:`,
              updateError
            );
            continue;
          }

          updated += 1;
          console.log(
            `[reclassify-topics] Updated analysis ${analysis.id} with chat_type "${newChatType}".`
          );
        } catch (error) {
          failed += 1;
          console.error(
            `[reclassify-topics] Failed to re-classify analysis ${analysis.id}:`,
            error
          );
        }
      }

      console.log(
        `[reclassify-topics] Re-classified ${processed} of ${totalRecords} records. Updated: ${updated}, Skipped: ${skipped}, Failed: ${failed}.`
      );

      offset += batch.length;

      if (batch.length < BATCH_SIZE) {
        break;
      }

      await sleep(BATCH_DELAY_MS);
    }

    console.log(
      `[reclassify-topics] Complete for organization ${organizationId}. Processed: ${processed}, Updated: ${updated}, Skipped: ${skipped}, Failed: ${failed}, Total: ${totalRecords}.`
    );

    return NextResponse.json({
      success: true,
      organization_id: organizationId,
      total_records: totalRecords,
      processed,
      updated,
      skipped,
      failed,
    });
  } catch (error: any) {
    console.error("[reclassify-topics] Unexpected error:", error);

    return NextResponse.json(
      { error: error?.message || "Failed to re-classify topics" },
      { status: 500 }
    );
  }
}