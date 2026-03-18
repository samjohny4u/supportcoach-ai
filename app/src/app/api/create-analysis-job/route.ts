// src/app/api/create-analysis-job/route.ts
import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { createSupabaseServer } from "@/lib/supabaseServer";
import { getCurrentOrganization } from "@/lib/currentOrganization";

export const runtime = "nodejs";

type IncomingFile = {
  file_name: string;
  transcript_text: string;
};

function buildTranscriptHash(transcriptText: string) {
  return createHash("sha256").update(transcriptText).digest("hex");
}

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServer();

    const body = await req.json();
    const files = body.files;

    if (!Array.isArray(files) || files.length === 0) {
      return NextResponse.json(
        { error: "files array is required" },
        { status: 400 }
      );
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { organizationId } = await getCurrentOrganization();

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 400 }
      );
    }

    const validFiles: IncomingFile[] = files.filter((file: unknown) => {
      if (!file || typeof file !== "object") return false;

      const candidate = file as Record<string, unknown>;

      return (
        typeof candidate.file_name === "string" &&
        candidate.file_name.trim() !== "" &&
        typeof candidate.transcript_text === "string" &&
        candidate.transcript_text.trim() !== ""
      );
    }) as IncomingFile[];

    if (validFiles.length === 0) {
      return NextResponse.json(
        { error: "No valid files were provided" },
        { status: 400 }
      );
    }

    const newItems: Array<{
      file_name: string;
      transcript_text: string;
      transcript_hash: string;
    }> = [];

    const duplicates: Array<{
      file_name: string;
      matched_file_name: string | null;
      reason: string;
    }> = [];

    const seenHashesInBatch = new Map<string, string>();

    for (const file of validFiles) {
      const transcriptText = file.transcript_text.trim();
      const transcriptHash = buildTranscriptHash(transcriptText);

      const batchMatch = seenHashesInBatch.get(transcriptHash);
      if (batchMatch) {
        duplicates.push({
          file_name: file.file_name,
          matched_file_name: batchMatch,
          reason: `Skipped "${file.file_name}" — identical content already included in this upload as "${batchMatch}".`,
        });
        continue;
      }

      const { data: existingItem, error: existingItemError } = await supabase
        .from("analysis_job_items")
        .select("id, file_name")
        .eq("organization_id", organizationId)
        .eq("transcript_hash", transcriptHash)
        .limit(1)
        .maybeSingle();

      if (existingItemError) {
        return NextResponse.json(
          { error: existingItemError.message },
          { status: 500 }
        );
      }

      if (existingItem) {
        duplicates.push({
          file_name: file.file_name,
          matched_file_name: existingItem.file_name || null,
          reason: `Skipped "${file.file_name}" — identical content already uploaded as "${existingItem.file_name || "another file"}".`,
        });
        continue;
      }

      seenHashesInBatch.set(transcriptHash, file.file_name);

      newItems.push({
        file_name: file.file_name,
        transcript_text: transcriptText,
        transcript_hash: transcriptHash,
      });
    }

    if (newItems.length === 0) {
      return NextResponse.json(
        {
          error: "All uploaded files were duplicates",
          duplicates,
          total_files: 0,
        },
        { status: 400 }
      );
    }

    const { data: job, error: jobError } = await supabase
      .from("analysis_jobs")
      .insert({
        organization_id: organizationId,
        status: "pending",
        total_files: newItems.length,
        processed_files: 0,
      })
      .select()
      .single();

    if (jobError || !job) {
      return NextResponse.json(
        { error: jobError?.message || "Failed to create job" },
        { status: 500 }
      );
    }

    const items = newItems.map((file) => ({
      job_id: job.id,
      file_name: file.file_name,
      transcript_text: file.transcript_text,
      transcript_hash: file.transcript_hash,
      status: "pending",
      organization_id: organizationId,
    }));

    const { error: itemError } = await supabase
      .from("analysis_job_items")
      .insert(items);

    if (itemError) {
      return NextResponse.json({ error: itemError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      job_id: job.id,
      total_files: newItems.length,
      duplicates,
    });
  } catch (error: any) {
    console.error("Create analysis job error:", error);

    return NextResponse.json(
      { error: error?.message || "Failed to create analysis job" },
      { status: 500 }
    );
  }
}