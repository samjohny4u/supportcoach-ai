"use client";

import { useState } from "react";

export default function OnboardingPage() {
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function completeOnboarding(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const trimmedCompanyName = companyName.trim();

    if (!trimmedCompanyName) {
      setError("Company name is required.");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ companyName: trimmedCompanyName }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data?.error || "Failed to complete onboarding.");
      setLoading(false);
      return;
    }

    window.location.href = "/dashboard";
  }

  return (
    <main className="px-6 py-20">
      <div className="mx-auto max-w-md rounded-2xl border border-white/10 bg-[#081225] p-8">
        <h1 className="mb-2 text-2xl font-semibold text-white">
          Set up your workspace
        </h1>

        <p className="mb-6 text-sm text-gray-400">
          Create your company workspace to start analyzing support transcripts.
        </p>

        <form onSubmit={completeOnboarding} className="space-y-4">
          <input
            type="text"
            placeholder="Company name"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white"
          />

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            disabled={loading}
            className="w-full rounded-xl bg-white py-3 font-semibold text-black"
          >
            {loading ? "Creating workspace..." : "Create Workspace"}
          </button>
        </form>
      </div>
    </main>
  );
}