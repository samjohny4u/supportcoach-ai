// src/components/WorkerTriggerButton.tsx
"use client";

import { useEffect, useState } from "react";

type WorkerTriggerButtonProps = {
  className?: string;
  label?: string;
  onSuccess?: () => void | Promise<void>;
  onError?: (message: string) => void;
};

export default function WorkerTriggerButton({
  className = "",
  label = "Process Now",
  onSuccess,
  onError,
}: WorkerTriggerButtonProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [showDone, setShowDone] = useState(false);

  useEffect(() => {
    if (!showDone) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setShowDone(false);
    }, 1200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [showDone]);

  async function handleClick() {
    try {
      setIsRunning(true);
      setShowDone(false);

      const res = await fetch("/api/process-jobs", {
        method: "GET",
        cache: "no-store",
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Worker trigger failed");
      }

      setIsRunning(false);
      setShowDone(true);
      await onSuccess?.();
    } catch (error: any) {
      console.error("Worker trigger error:", error);
      setIsRunning(false);
      onError?.(error?.message || "Worker trigger failed");
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isRunning}
      className={className}
    >
      {isRunning ? (
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-current animate-pulse" />
          Processing...
        </span>
      ) : showDone ? (
        "Done"
      ) : (
        label
      )}
    </button>
  );
}
