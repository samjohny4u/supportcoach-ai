"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function signUp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const trimmedFullName = fullName.trim();
    const trimmedCompanyName = companyName.trim();
    const trimmedEmail = email.trim();

    if (!trimmedFullName) {
      setError("Full name is required.");
      setLoading(false);
      return;
    }

    if (!trimmedCompanyName) {
      setError("Company name is required.");
      setLoading(false);
      return;
    }

    if (!trimmedEmail) {
      setError("Email is required.");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      setLoading(false);
      return;
    }

    // Durable fix:
    // If someone is already logged in, clear that session first so onboarding
    // happens for the newly created user, not the previous session.
    await supabase.auth.signOut();

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        data: {
          full_name: trimmedFullName,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    const session = signUpData.session;

    if (!session) {
      setError(
        "Account created, but no session was returned. Please log in to continue."
      );
      setLoading(false);
      return;
    }

    const onboardingRes = await fetch("/api/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        companyName: trimmedCompanyName,
      }),
    });

    const onboardingData = await onboardingRes.json();

    if (!onboardingRes.ok) {
      setError(onboardingData?.error || "Failed to complete account setup.");
      setLoading(false);
      return;
    }

    window.location.href = "/dashboard";
  }

  return (
    <main className="px-6 py-20">
      <div className="mx-auto max-w-md rounded-2xl border border-white/10 bg-[#081225] p-8">
        <h1 className="mb-2 text-2xl font-semibold text-white">
          Create your SupportCoach account
        </h1>

        <p className="mb-6 text-sm text-gray-400">
          Set up your company workspace and start analyzing support transcripts.
        </p>

        <form onSubmit={signUp} className="space-y-4">
          <input
            type="text"
            placeholder="Full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white"
          />

          <input
            type="text"
            placeholder="Company name"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white"
          />

          <input
            type="email"
            placeholder="Work email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white"
          />

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            disabled={loading}
            className="w-full rounded-xl bg-white py-3 font-semibold text-black"
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p className="mt-6 text-sm text-gray-400">
          Already have an account?{" "}
          <a href="/login" className="text-white hover:underline">
            Sign in
          </a>
        </p>
      </div>
    </main>
  );
}