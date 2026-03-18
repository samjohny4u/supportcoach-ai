"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-screen bg-[#020817] px-6 py-16 text-white">
      <div className="mx-auto max-w-2xl rounded-3xl border border-white/10 bg-[#081225] p-8">
        <div className="mb-3 inline-flex items-center rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs font-medium text-red-300">
          Error
        </div>
        <h1 className="mb-4 text-4xl font-bold tracking-tight">Something went wrong</h1>
        <p className="mb-8 text-gray-300">
          Something went wrong. Please try refreshing the page.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-4 py-2 text-sm font-semibold text-indigo-300 hover:bg-indigo-500/20"
          >
            Try Again
          </button>
          <Link
            href="/dashboard"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
