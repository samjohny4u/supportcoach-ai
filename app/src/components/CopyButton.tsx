"use client";

import { useState } from "react";

type CopyButtonProps = {
  text: string;
  analysisId?: string;
  className?: string;
  idleLabel?: string;
};

export default function CopyButton({
  text,
  analysisId,
  className = "",
  idleLabel = "Copy",
}: CopyButtonProps) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setStatus("copied");
      window.setTimeout(() => setStatus("idle"), 2000);

      const safeAnalysisId =
        typeof analysisId === "string" && analysisId.trim().length > 0
          ? analysisId.trim()
          : "";

      if (safeAnalysisId) {
        void (async () => {
          try {
            await fetch("/api/update-coaching-delivery", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                analysis_id: safeAnalysisId,
                delivered: true,
                source: "auto",
              }),
            });
          } catch {
            // Copy feedback should not depend on the silent delivery marker.
          }
        })();
      }
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
      : idleLabel;

  return (
    <button type="button" onClick={handleCopy} className={className}>
      {label}
    </button>
  );
}
