"use client";

import { useState } from "react";

type CoachingDigestPanelProps = {
  agentName: string;
};

type DigestResponse = {
  digest?: string;
  empty?: boolean;
  message?: string;
  chat_count?: number;
  error?: string;
};

export default function CoachingDigestPanel({ agentName }: CoachingDigestPanelProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [digest, setDigest] = useState("");
  const [emptyMessage, setEmptyMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");

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
        <h2 className="text-2xl font-semibold">Coaching Digest</h2>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating}
          className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-4 py-2 text-sm font-semibold text-indigo-300 hover:bg-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isGenerating ? "Generating..." : "Generate Coaching Digest (last 14 days)"}
        </button>
      </div>

      <p className="mb-4 text-sm text-gray-400">
        Consolidates this agent&apos;s high-attention, high-churn-risk, and
        frustration-flagged chats from the last 14 days into one supportive message with a
        plan of action — ready to paste.
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
