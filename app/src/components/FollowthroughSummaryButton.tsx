"use client";

import { useState } from "react";

type SummaryRow = {
  finalStatus: string;
  recommendedBehavior: string;
  sourceDate: string;
  evidence: string;
  repeatCount: number;
};

type FollowthroughSummaryButtonProps = {
  agentName: string;
  rows: SummaryRow[];
};

function ordinal(count: number): string {
  const words = ["", "first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth"];
  if (count >= 1 && count < words.length) return words[count];
  return `${count}th`;
}

function lowercaseFirst(value: string): string {
  const trimmed = value.trim().replace(/\.$/, "");
  if (!trimmed) return "";
  return trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
}

function trimPunctuation(value: string): string {
  return value.trim().replace(/[.!?;:]+$/g, "");
}

function buildSummaryMessage(agentName: string, rows: SummaryRow[]): string {
  const safeAgent = agentName.trim() || "Hi";
  const applied = rows.filter((row) => row.finalStatus === "followed_through");
  const repeated = rows.filter((row) => row.finalStatus === "repeated");

  const lines: string[] = [];
  lines.push(`${safeAgent} - quick follow-up on your recent coaching.`);
  lines.push("");

  if (applied.length > 0) {
    lines.push("What you applied:");
    for (const row of applied) {
      const evidence = row.evidence ? ` - ${trimPunctuation(row.evidence)}` : "";
      lines.push(
        `- From our coaching on ${row.sourceDate || "an earlier chat"}: ${lowercaseFirst(row.recommendedBehavior)}. I saw you do this${evidence}. Nice work.`
      );
    }
    lines.push("");
  }

  if (repeated.length > 0) {
    lines.push("What came back around:");
    for (const row of repeated) {
      const countClause =
        row.repeatCount >= 2 ? ` (this is the ${ordinal(row.repeatCount)} time it has come up)` : "";
      const evidence = row.evidence ? ` - ${trimPunctuation(row.evidence)}` : "";
      lines.push(
        `- From our coaching on ${row.sourceDate || "an earlier chat"}: ${lowercaseFirst(row.recommendedBehavior)}${countClause}${evidence}.`
      );
    }
    lines.push("");
    lines.push(
      "Nothing here changes the good work above - let's make this the focus for the week and work through what's blocking it together."
    );
  } else if (applied.length > 0) {
    lines.push("Keep it up - this is exactly what applied coaching looks like.");
  }

  return lines.join("\n").trim();
}

export default function FollowthroughSummaryButton({
  agentName,
  rows,
}: FollowthroughSummaryButtonProps) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");

  const hasContent = rows.some(
    (row) => row.finalStatus === "followed_through" || row.finalStatus === "repeated"
  );

  if (!hasContent) return null;

  async function handleCopy() {
    try {
      const message = buildSummaryMessage(agentName, rows);
      await navigator.clipboard.writeText(message);
      setStatus("copied");
      window.setTimeout(() => setStatus("idle"), 2000);
    } catch (error) {
      console.error("Copy failed:", error);
      setStatus("error");
      window.setTimeout(() => setStatus("idle"), 2000);
    }
  }

  const label =
    status === "copied"
      ? "Copied!"
      : status === "error"
        ? "Copy Failed"
        : "Copy follow-through summary";

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-4 py-2 text-sm font-semibold text-indigo-300 hover:bg-indigo-500/20"
    >
      {label}
    </button>
  );
}
