"use client";

import { useState } from "react";

type FollowthroughOverrideSelectProps = {
  followthroughId: string;
  initialOverride: string | null;
};

const OPTIONS = [
  { value: "", label: "Use AI assessment" },
  { value: "followed_through", label: "Followed through" },
  { value: "repeated", label: "Repeated" },
  { value: "no_opportunity", label: "No opportunity" },
];

export default function FollowthroughOverrideSelect({
  followthroughId,
  initialOverride,
}: FollowthroughOverrideSelectProps) {
  const [value, setValue] = useState(initialOverride || "");
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  async function handleChange(newValue: string) {
    setValue(newValue);
    setIsSaving(true);
    setStatusMessage("");

    try {
      const res = await fetch("/api/update-followthrough-override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          followthrough_id: followthroughId,
          override: newValue === "" ? null : newValue,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "Failed to save");
      }

      setStatusMessage("Saved");
      setTimeout(() => setStatusMessage(""), 2000);
    } catch (error: any) {
      setStatusMessage(error?.message || "Failed to save");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={value}
        onChange={(event) => handleChange(event.target.value)}
        disabled={isSaving}
        className="rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-xs text-gray-200"
      >
        {OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {statusMessage ? (
        <span className="text-xs text-gray-400">{statusMessage}</span>
      ) : null}
    </div>
  );
}
