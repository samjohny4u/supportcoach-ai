"use client";

import { useState } from "react";

type CoachingDeliveryControlsProps = {
  analysisId: string;
  initialDelivered: boolean;
  initialDeliveredAt: string | null;
  initialNotes: string;
};

function formatDeliveredAt(value: string | null): string {
  if (!value) return "";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "";
  }
}

export default function CoachingDeliveryControls({
  analysisId,
  initialDelivered,
  initialDeliveredAt,
  initialNotes,
}: CoachingDeliveryControlsProps) {
  const [delivered, setDelivered] = useState(initialDelivered);
  const [deliveredAt, setDeliveredAt] = useState(initialDeliveredAt);
  const [notes, setNotes] = useState(initialNotes);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSave() {
    setIsSaving(true);
    setStatusMessage("");
    setErrorMessage("");

    const payload: {
      analysis_id: string;
      delivered: boolean;
      source: "manual";
      notes: string;
    } = {
      analysis_id: analysisId,
      delivered,
      source: "manual",
      notes: "",
    };

    payload.notes = notes.trim();

    try {
      const res = await fetch("/api/update-coaching-delivery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "Failed to save");
      }

      if (delivered) {
        setDeliveredAt(new Date().toISOString());
      } else {
        setDeliveredAt(null);
      }

      setStatusMessage("Saved");
      setTimeout(() => setStatusMessage(""), 3000);
    } catch (error: any) {
      setErrorMessage(error?.message || "Failed to save");
    } finally {
      setIsSaving(false);
    }
  }

  const formattedDeliveredAt = formatDeliveredAt(deliveredAt);

  return (
    <div className="rounded-3xl border border-white/10 bg-[#081225] p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-white">Coaching Delivery</h2>
          <p className="mt-2 text-sm text-gray-400">
            Track whether you have delivered this coaching to the agent. Notes are optional.
          </p>
        </div>
      </div>

      <label className="mb-4 flex items-center gap-3 text-sm text-gray-200">
        <input
          type="checkbox"
          checked={delivered}
          onChange={(event) => setDelivered(event.target.checked)}
          className="h-4 w-4 rounded border-white/20 bg-black/30"
        />
        <span className="font-medium">Coaching delivered</span>
        {delivered && formattedDeliveredAt ? (
          <span className="text-xs text-gray-400">Delivered on {formattedDeliveredAt}</span>
        ) : null}
      </label>

      <label className="mb-2 block text-sm font-medium text-gray-200">
        Coaching notes (optional)
      </label>
      <textarea
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        rows={4}
        placeholder="What did you actually say to the agent? Any context worth remembering."
        className="mb-4 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-gray-200 placeholder-gray-500 focus:border-indigo-400/50 focus:outline-none"
      />

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-4 py-2 text-sm font-semibold text-indigo-300 hover:bg-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? "Saving..." : "Save"}
        </button>

        {statusMessage ? (
          <span className="text-sm text-emerald-300">{statusMessage}</span>
        ) : null}

        {errorMessage ? (
          <span className="text-sm text-red-300">{errorMessage}</span>
        ) : null}
      </div>
    </div>
  );
}
