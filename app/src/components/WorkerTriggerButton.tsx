// src/components/WorkerTriggerButton.tsx
"use client";

import { useState } from "react";

type WorkerTriggerButtonProps = {
  className?: string;
  label?: string;
};

export default function WorkerTriggerButton({
  className = "",
  label = "Process Now",
}: WorkerTriggerButtonProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [showDone, setShowDone] = useState(false);

  async function handleClick() {
    try {
      setIsRunning(true);
      setShowDone(false);

      const res = await fetch("/api/process-jobs", {
        method: "GET",
        cache: "no-store",
      });

      await res.json().catch(() => null);

      setIsRunning(false);
      setShowDone(true);

      setTimeout(() => {
        window.location.reload();
      }, 700);
    } catch (error) {
      console.error("Worker trigger error:", error);
      setIsRunning(false);
      window.location.reload();
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isRunning}
      className={className}
    >
      {isRunning ? "Processing..." : showDone ? "Done ✓" : label}
    </button>
  );
}