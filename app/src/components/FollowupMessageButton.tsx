"use client";

import { useState } from "react";

type FollowupMessageButtonProps = {
  agentName: string;
  sourceRecommendedBehavior: string;
  sourceDeliveredAt: string | null;
  detectedAt: string;
  detectedInCustomerName: string | null;
  evidence: string | null;
  className?: string;
};

function formatLongDate(value: string | null): string {
  if (!value) return "a previous chat";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "a previous chat";

  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function lowercaseFirstCharacter(value: string): string {
  const trimmed = value.trim().replace(/\.$/, "");
  if (!trimmed) return "";

  return trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
}

function trimTrailingPunctuation(value: string): string {
  return value.trim().replace(/[.!?;:]+$/g, "");
}

export default function FollowupMessageButton({
  sourceRecommendedBehavior,
  sourceDeliveredAt,
  detectedAt,
  detectedInCustomerName,
  evidence,
  className = "",
}: FollowupMessageButtonProps) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");

  async function handleCopy() {
    try {
      const sourceDeliveredDate = formatLongDate(sourceDeliveredAt);
      const recommendedBehaviorLowercased =
        lowercaseFirstCharacter(sourceRecommendedBehavior);
      const detectedDate = formatLongDate(detectedAt);
      const safeCustomerName =
        typeof detectedInCustomerName === "string" &&
        detectedInCustomerName.trim().length > 0
          ? detectedInCustomerName.trim()
          : "";
      const safeEvidence =
        typeof evidence === "string" && evidence.trim().length > 0
          ? trimTrailingPunctuation(evidence)
          : "";
      const customerClause = safeCustomerName ? ` with ${safeCustomerName}` : "";
      const evidenceClause = safeEvidence ? ` — ${safeEvidence}` : "";

      const message = `On ${sourceDeliveredDate}, I coached you that ${recommendedBehaviorLowercased}. Looking at your chat from ${detectedDate}${customerClause}, I noticed the same pattern came up again${evidenceClause}. What's blocking you from applying the new approach? Let's work through it.`;

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
      : "Copy follow-up message";

  const buttonClassName =
    className ||
    "rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-4 py-2 text-sm font-semibold text-indigo-300 hover:bg-indigo-500/20";

  return (
    <button type="button" onClick={handleCopy} className={buttonClassName}>
      {label}
    </button>
  );
}
