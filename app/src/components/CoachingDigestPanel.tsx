"use client";

import { useState } from "react";

type CoachingDigestPanelProps = {
  agentName: string;
  lastDigestDate?: string | null;
  daysSinceLastDigest?: number | null;
};

type DigestResponse = {
  digest?: string;
  empty?: boolean;
  message?: string;
  chat_count?: number;
  window_days?: number;
  last_digest_at?: string | null;
  error?: string;
};

export default function CoachingDigestPanel({
  agentName,
  lastDigestDate = null,
  daysSinceLastDigest = null,
}: CoachingDigestPanelProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [digest, setDigest] = useState("");
  const [emptyMessage, setEmptyMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");
  const [generatedJustNow, setGeneratedJustNow] = useState(false);

  const isDue =
    !generatedJustNow && (lastDigestDate === null || (daysSinceLastDigest ?? 0) >= 14);

  async function handleGenerate() {
    try {
      setIsGenerating(true);
      setErrorMessage("");
      setEmptyMessage("");
      setDigest("");
      setCopyStatus("idle");

      const res = await fetch(
        `/api/coaching-digest?agent=${encodeURIComponent(agentName)}`,
        { cache: "no-store" }
      );
      const data = (await res.json()) as DigestResponse;

      if (!res.ok) {
        setErrorMessage(data.error || "Digest generation failed. Please try again.");
        return;
      }

      if (data.empty) {
        setEmptyMessage(
          data.message || "No problem chats found in the window. Nothing to digest."
        );
        return;
      }

      setDigest(typeof data.digest === "string" ? data.digest : "");
      setGeneratedJustNow(true);
    } catch {
      setErrorMessage("Digest generation failed. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(digest);
      setCopyStatus("copied");
      window.setTimeout(() => setCopyStatus("idle"), 2000);
    } catch {
      setCopyStatus("error");
      window.setTimeout(() => setCopyStatus("idle"), 2000);
    }
  }

  return (
    <div className="mb-10 rounded-3xl border border-white/10 bg-[#081225] p-8">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-2xl font-semibold">Coaching Digest</h2>
          {isDue ? (
            <span className="rounded-full border border-amber-500/20 bg-amber-500/15 px-3 py-1 text-xs font-semibold uppercase text-amber-300">
              Due
            </span>
          ) : null}
        </div>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating}
          className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-4 py-2 text-sm font-semibold text-indigo-300 hover:bg-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isGenerating ? "Generating..." : "Generate Coaching Digest"}
        </button>
      </div>

      <p className="mb-1 text-sm text-gray-400">
        Consolidates this agent&apos;s high-attention, high-churn-risk, and
        frustration-flagged chats into one supportive, paste-ready message with a plan of
        action. Covers everything since the last digest (minimum 14 days, capped at 30).
      </p>

      <p className="mb-4 text-sm text-gray-500">
        {generatedJustNow
          ? "Last digest: just now."
          : lastDigestDate
            ? `Last digest: ${lastDigestDate} (${daysSinceLastDigest} ${
                daysSinceLastDigest === 1 ? "day" : "days"
              } ago).${(daysSinceLastDigest ?? 0) >= 14 ? " A new digest is due." : ` Next one due in ${14 - (daysSinceLastDigest ?? 0)} ${14 - (daysSinceLastDigest ?? 0) === 1 ? "day" : "days"}.`}`
            : "No digest has been generated for this agent yet."}
      </p>

      {errorMessage ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
          {errorMessage}
        </div>
      ) : null}

      {emptyMessage ? (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-300">
          {emptyMessage}
        </div>
      ) : null}

      {digest ? (
        <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
          <div className="mb-3 flex justify-end">
            <button
              type="button"
              onClick={handleCopy}
              className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-4 py-2 text-sm font-semibold text-indigo-300 hover:bg-indigo-500/20"
            >
              {copyStatus === "copied"
                ? "Copied!"
                : copyStatus === "error"
                  ? "Copy Failed"
                  : "Copy Digest"}
            </button>
          </div>
          <div className="whitespace-pre-wrap text-[15px] leading-7 text-gray-200">
            {digest}
          </div>
        </div>
      ) : null}
    </div>
  );
}
