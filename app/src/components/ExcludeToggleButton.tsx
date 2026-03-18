"use client";

import { useState } from "react";

type ExcludeToggleButtonProps = {
  analysisId: string;
  excluded: boolean;
};

export default function ExcludeToggleButton({
  analysisId,
  excluded,
}: ExcludeToggleButtonProps) {
  const [isSaving, setIsSaving] = useState(false);

  async function handleClick() {
    try {
      setIsSaving(true);

      const res = await fetch("/api/toggle-exclude", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          analysis_id: analysisId,
          excluded: !excluded,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Failed to update report visibility.");
      }

      window.location.reload();
    } catch (error: any) {
      console.error("Exclude toggle error:", error);
      window.alert(error?.message || "Failed to update report visibility.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isSaving}
      className={`rounded-xl px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${
        excluded
          ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
          : "border border-red-500/20 bg-red-500/10 text-red-300 hover:bg-red-500/20"
      }`}
    >
      {isSaving
        ? "Saving..."
        : excluded
        ? "Include In Reports"
        : "Exclude From Reports"}
    </button>
  );
}