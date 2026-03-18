"use client";

import { useState } from "react";

type CopyButtonProps = {
  text: string;
  className?: string;
  idleLabel?: string;
};

export default function CopyButton({
  text,
  className = "",
  idleLabel = "Copy",
}: CopyButtonProps) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
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
      : idleLabel;

  return (
    <button type="button" onClick={handleCopy} className={className}>
      {label}
    </button>
  );
}