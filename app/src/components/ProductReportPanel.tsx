"use client";

import { useState } from "react";

type ProductReportPanelProps = {
  range: string;
  rangeLabel: string;
};

type ReportResponse = {
  report?: string;
  empty?: boolean;
  message?: string;
  chat_count?: number;
  error?: string;
};

export default function ProductReportPanel({ range, rangeLabel }: ProductReportPanelProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [report, setReport] = useState("");
  const [emptyMessage, setEmptyMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");

  async function handleGenerate() {
    try {
      setIsGenerating(true);
      setErrorMessage("");
      setEmptyMessage("");
      setReport("");
      setCopyStatus("idle");

      const res = await fetch(
        `/api/product-issues-report?range=${encodeURIComponent(range)}`,
        { cache: "no-store" }
      );
      const data = (await res.json()) as ReportResponse;

      if (!res.ok) {
        setErrorMessage(data.error || "Report generation failed. Please try again.");
        return;
      }

      if (data.empty) {
        setEmptyMessage(
          data.message || "No product-blocker chats found for this period."
        );
        return;
      }

      setReport(typeof data.report === "string" ? data.report : "");
    } catch {
      setErrorMessage("Report generation failed. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(report);
      setCopyStatus("copied");
      window.setTimeout(() => setCopyStatus("idle"), 2000);
    } catch {
      setCopyStatus("error");
      window.setTimeout(() => setCopyStatus("idle"), 2000);
    }
  }

  return (
    <div className="mb-8 rounded-3xl border border-white/10 bg-[#081225] p-6">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold text-white">Product Friction Report</h2>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating}
          className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-4 py-2 text-sm font-semibold text-indigo-300 hover:bg-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isGenerating ? "Generating..." : `Generate Report (${rangeLabel})`}
        </button>
      </div>

      <p className="mb-4 text-sm text-gray-400">
        Consolidates every product-blocker chat in the selected period into one copyable
        report for product, churn, and leadership — totals, per-topic friction summaries,
        and high churn risk callouts with the reason for each.
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

      {report ? (
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
                  : "Copy Report"}
            </button>
          </div>
          <div className="whitespace-pre-wrap text-[15px] leading-7 text-gray-200">
            {report}
          </div>
        </div>
      ) : null}
    </div>
  );
}
