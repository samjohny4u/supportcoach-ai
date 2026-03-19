// src/app/upload/page.tsx
"use client";

import { useEffect, useState } from "react";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import WorkerTriggerButton from "@/components/WorkerTriggerButton";

pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.mjs";

type DuplicateResult = {
  file_name: string;
  matched_file_name: string | null;
  reason: string;
};

type QueueResponse = {
  success?: boolean;
  job_id?: string;
  total_files?: number;
  error?: string;
  duplicates?: DuplicateResult[];
};

type Job = {
  id: string;
  status: string;
  total_files: number;
  processed_files: number;
  created_at: string;
};

type JobsResponse = {
  jobs?: Job[];
  error?: string;
};

function getProgressPercent(processed: number, total: number) {
  if (!total || total <= 0) return 0;
  return Math.min(100, Math.round((processed / total) * 100));
}

function formatJobDisplayName(createdAt: string) {
  return `Upload - ${new Date(createdAt).toLocaleString()}`;
}

function getStatusClasses(status: string) {
  if (status === "completed") {
    return "border border-emerald-500/20 bg-emerald-500/15 text-emerald-300";
  }
  if (status === "processing") {
    return "border border-yellow-500/20 bg-yellow-500/15 text-yellow-300";
  }
  if (status === "pending") {
    return "border border-blue-500/20 bg-blue-500/15 text-blue-300";
  }
  return "border border-red-500/20 bg-red-500/15 text-red-300";
}

export default function UploadPage() {
  const [status, setStatus] = useState("No files uploaded yet.");
  const [jobId, setJobId] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isTriggeringWorker, setIsTriggeringWorker] = useState(false);
  const [queuedCount, setQueuedCount] = useState(0);
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [duplicateResults, setDuplicateResults] = useState<DuplicateResult[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  async function loadRecentJobs() {
    try {
      setLoadingJobs(true);
      const res = await fetch("/api/job-status", { cache: "no-store" });
      if (!res.ok) {
        setRecentJobs([]);
        return;
      }
      const data = (await res.json()) as JobsResponse;
      setRecentJobs(data.jobs || []);
    } catch (error) {
      console.error("Failed to load recent jobs:", error);
      setRecentJobs([]);
    } finally {
      setLoadingJobs(false);
    }
  }

  useEffect(() => {
    loadRecentJobs();
  }, []);

  async function extractPdfText(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let extractedText = "";
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => ("str" in item ? item.str : ""))
        .join(" ");
      extractedText += `--- Page ${pageNumber} ---\n${pageText}\n\n`;
    }
    return extractedText;
  }

  function triggerWorkerAutomatically() {
    setIsTriggeringWorker(true);
    setStatus("Job queued successfully. Processing queued transcripts...");
    void (async () => {
      try {
        const res = await fetch("/api/process-jobs", { method: "GET", cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error || "Worker trigger failed");
        setStatus("Processing started successfully.");
        await loadRecentJobs();
      } catch (error: any) {
        console.error("Auto worker trigger error:", error);
        setStatus(
          `Job queued successfully, but processing did not start automatically: ${error?.message || "Unknown error"}`
        );
      } finally {
        setIsTriggeringWorker(false);
      }
    })();
  }

  async function handleManualWorkerSuccess() {
    setStatus("Processing started successfully. Refreshing jobs...");
    await loadRecentJobs();
  }

  function handleManualWorkerError(message: string) {
    setStatus(`Processing failed: ${message}`);
  }

  function processFileList(files: File[]) {
    const pdfFiles = files.filter((f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
    setSelectedFiles(pdfFiles);
    if (pdfFiles.length > 0) {
      setStatus(`${pdfFiles.length} file(s) selected. Click "Upload and Analyze" to begin.`);
      setJobId("");
      setQueuedCount(0);
      setDuplicateResults([]);
    } else {
      setStatus("No valid PDF files found. Please select PDF transcripts.");
    }
  }

  function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    processFileList(files);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    processFileList(files);
  }

  async function handleUpload() {
    if (selectedFiles.length === 0) return;
    try {
      setIsUploading(true);
      setJobId("");
      setQueuedCount(0);
      setDuplicateResults([]);
      setStatus(`Extracting text from ${selectedFiles.length} PDF(s)...`);

      const extractedFiles: { file_name: string; transcript_text: string }[] = [];
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        setStatus(`Reading PDF ${i + 1} of ${selectedFiles.length}: ${file.name}`);
        const transcriptText = await extractPdfText(file);
        extractedFiles.push({ file_name: file.name, transcript_text: transcriptText });
      }

      setStatus(`Creating analysis job for ${selectedFiles.length} transcript(s)...`);
      const res = await fetch("/api/create-analysis-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: extractedFiles }),
      });

      const data = (await res.json()) as QueueResponse;
      const duplicates = Array.isArray(data.duplicates) ? data.duplicates : [];

      if (!res.ok || !data.success) {
        setDuplicateResults(duplicates);
        if (data.error === "All uploaded files were duplicates" && duplicates.length > 0) {
          setStatus("No new job was created because all uploaded files were duplicates.");
          setSelectedFiles([]);
          return;
        }
        throw new Error(data.error || "Failed to queue files");
      }

      setJobId(data.job_id || "");
      setQueuedCount(data.total_files || selectedFiles.length);
      setDuplicateResults(duplicates);

      if (duplicates.length > 0) {
        setStatus(
          `Job created successfully. ${data.total_files || selectedFiles.length} transcript(s) queued. ${duplicates.length} duplicate file(s) were skipped.`
        );
      } else {
        setStatus(
          `Job created successfully. ${data.total_files || selectedFiles.length} transcript(s) queued for processing.`
        );
      }

      setSelectedFiles([]);
      await loadRecentJobs();
      triggerWorkerAutomatically();
    } catch (error: any) {
      console.error("Upload queue error:", error);
      setStatus(`Failed: ${error?.message || "Unknown error"}`);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <main className="px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10">
          <div className="mb-3 inline-flex items-center rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300">
            Transcript Queue Upload
          </div>
          <h1 className="mb-3 text-4xl font-bold tracking-tight">
            Upload Chat Transcript PDFs
          </h1>
          <p className="max-w-3xl text-gray-300">
            Upload one or more support transcript PDFs. Files will be added to a background
            processing queue and processing will start automatically.
          </p>
        </div>

        <div className="mb-8 rounded-3xl border border-white/10 bg-[#081225] p-8">
          <label className="mb-3 block text-sm font-medium text-gray-200">
            Choose PDF transcripts
          </label>

          <div
            onClick={() => {
              if (selectedFiles.length === 0) {
                document.getElementById("file-upload")?.click();
              }
            }}
            onDragOver={handleDragOver}
            onDragEnter={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 transition-colors ${
              isDragging
                ? "border-emerald-400 bg-emerald-400/10"
                : selectedFiles.length > 0
                  ? "border-emerald-400/40 bg-black/50"
                  : "cursor-pointer border-white/20 bg-black/30 hover:border-emerald-400/40 hover:bg-black/50"
            }`}
          >
            {selectedFiles.length === 0 ? (
              <>
                <p className="text-lg font-semibold text-emerald-300">
                  {isDragging ? "Drop files here" : "Click or Drag to Upload"}
                </p>
                <p className="mt-2 text-sm text-gray-400">Select one or more PDF transcripts</p>
              </>
            ) : (
              <>
                <p className="mb-3 text-sm text-gray-400">
                  {selectedFiles.length} file(s) ready:
                </p>
                <ul className="mb-5 space-y-1 text-center">
                  {selectedFiles.map((file, index) => (
                    <li key={index} className="text-sm text-gray-300">
                      {file.name}
                    </li>
                  ))}
                </ul>
                <div className="flex gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUpload();
                    }}
                    className="rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-white transition-colors hover:bg-emerald-400"
                  >
                    Upload and Analyze
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFiles([]);
                      setStatus("No files uploaded yet.");
                    }}
                    className="rounded-xl border border-white/10 px-6 py-3 font-semibold text-gray-300 transition-colors hover:bg-white/5"
                  >
                    Cancel
                  </button>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    document.getElementById("file-upload")?.click();
                  }}
                  className="mt-3 text-sm text-gray-500 transition-colors hover:text-gray-300"
                >
                  Choose different files
                </button>
              </>
            )}
          </div>

          <input
            id="file-upload"
            type="file"
            accept=".pdf"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className="mt-5 space-y-2">
            <p className="text-sm text-gray-400">{status}</p>

            {isUploading && (
              <div className="inline-flex rounded-full border border-blue-400/20 bg-blue-400/10 px-3 py-1 text-xs font-medium text-blue-300">
                Uploading and queuing...
              </div>
            )}

            {isTriggeringWorker && (
              <div className="inline-flex rounded-full border border-yellow-400/20 bg-yellow-400/10 px-3 py-1 text-xs font-medium text-yellow-300">
                Processing...
              </div>
            )}

            {duplicateResults.length > 0 && (
              <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4">
                <p className="text-sm font-semibold text-yellow-300">
                  Duplicate {duplicateResults.length === 1 ? "file" : "files"} skipped: {duplicateResults.length}
                </p>
                <div className="mt-3 space-y-2">
                  {duplicateResults.map((item) => (
                    <div key={`${item.file_name}-${item.matched_file_name || "unknown"}`}>
                      <p className="text-sm text-gray-300">{item.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {jobId && (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                <p className="text-sm text-emerald-300">Job created successfully.</p>
                <p className="mt-1 text-sm text-gray-300">
                  Job ID: <span className="font-mono">{jobId}</span>
                </p>
                <p className="mt-1 text-sm text-gray-300">
                  Queued transcripts: {queuedCount}
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <a
                    href="/jobs"
                    className="rounded-xl border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-blue-300 hover:bg-blue-500/20"
                  >
                    View All Jobs
                  </a>
                  <a
                    href={`/jobs/${jobId}`}
                    className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-4 py-2 text-sm font-semibold text-indigo-300 hover:bg-indigo-500/20"
                  >
                    View This Job
                  </a>
                  <WorkerTriggerButton
                    onSuccess={handleManualWorkerSuccess}
                    onError={handleManualWorkerError}
                    className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 px-4 py-2 text-sm font-semibold text-yellow-300 hover:bg-yellow-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-[#081225] p-8">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold text-white">Recent Upload Jobs</h2>
              <p className="mt-1 text-sm text-gray-400">
                Recent transcript queue submissions and their current processing status.
              </p>
            </div>
            <button
              onClick={loadRecentJobs}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-gray-300 hover:bg-white/5 hover:text-white"
            >
              Refresh
            </button>
          </div>

          <div className="space-y-4">
            {loadingJobs ? (
              <p className="text-gray-400">Loading recent jobs...</p>
            ) : recentJobs.length === 0 ? (
              <p className="text-gray-400">No recent jobs found yet.</p>
            ) : (
              recentJobs.slice(0, 5).map((job) => {
                const progress = getProgressPercent(
                  job.processed_files || 0,
                  job.total_files || 0
                );
                return (
                  <div
                    key={job.id}
                    className="rounded-2xl border border-white/10 bg-black/20 p-5"
                  >
                    <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white">
                          {formatJobDisplayName(job.created_at)}
                        </p>
                        <p className="text-sm text-gray-400">
                          Created {new Date(job.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div
                        className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${getStatusClasses(
                          job.status
                        )}`}
                      >
                        {job.status}
                      </div>
                    </div>
                    <div className="mb-3 grid gap-2 text-sm text-gray-300 md:grid-cols-3">
                      <div>Total Files: {job.total_files}</div>
                      <div>Processed: {job.processed_files}</div>
                      <div>Progress: {progress}%</div>
                    </div>
                    <div className="h-3 rounded-full bg-white/10">
                      <div
                        className="h-3 rounded-full bg-blue-400"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <a
                        href={`/jobs/${job.id}`}
                        className="text-sm font-semibold text-indigo-300 hover:text-indigo-200"
                      >
                        {"View Job →"}
                      </a>
                      {job.status !== "completed" && (
                        <WorkerTriggerButton
                          onSuccess={handleManualWorkerSuccess}
                          onError={handleManualWorkerError}
                          className="text-sm font-semibold text-yellow-300 hover:text-yellow-200 disabled:cursor-not-allowed disabled:opacity-60"
                        />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </main>
  );
}