"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const SIGNUP_URL = "https://admin.supportcoach.io/signup";
const ADMIN_URL = "https://admin.supportcoach.io/";

const featureCards = [
  {
    num: "01",
    title: "Instant Rules Check",
    description:
      "Detects dismissive tone, missing empathy, weak ownership, and 9 other risk patterns the moment your agent starts typing. Zero AI cost.",
  },
  {
    num: "02",
    title: "AI Coaching Card",
    description:
      "After a 3-second pause, AI rewrites the entire reply to match your company's support tone and coaching standards.",
  },
  {
    num: "03",
    title: "Pre-Send Safety Check",
    description:
      "One click scores the reply across 8 dimensions before it reaches the customer. Full rewrite included.",
  },
];

const platforms = ["Zendesk", "Intercom", "Zoho SalesIQ", "More coming soon"];

const PRICING = {
  // Both plans are priced per agent/month and anchored to the real post-launch rate ($20),
  // so the strikethrough means one thing everywhere: "our regular $20/agent/mo rate".
  // Annual stacks the launch + annual discount, so it lands at $10/agent/mo (50% off $20).
  monthly: {
    label: "Monthly",
    regular: "$20" as string | null,
    price: "$15",
    unit: "/agent/month",
    savings: "Save 25%" as string | null,
    note: "Billed monthly. Cancel anytime.",
    badge: null as string | null,
  },
  annual: {
    label: "Annual",
    regular: "$20" as string | null,
    price: "$10",
    unit: "/agent/month",
    savings: "Save 50%" as string | null,
    note: "Billed annually ($120/agent/year). Cancel anytime.",
    badge: "Best value 🔥",
  },
} as const;

const includedFeatures = [
  "Real-time rules check (zero AI cost)",
  "AI coaching card with full rewrite",
  "Pre-send safety check across 8 dimensions",
  "Works on Zendesk, Intercom & Zoho SalesIQ",
  "Manager dashboard & weekly summaries",
];

export default function ExtensionPage() {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");

  useEffect(() => {
    document.body.classList.add("hide-dashboard-nav");
    return () => document.body.classList.remove("hide-dashboard-nav");
  }, []);

  const plan = PRICING[billing];

  return (
    <main className="relative min-h-screen overflow-hidden text-white bg-black">
      {/* Background gradient - matches main site exactly */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(circle at top left, rgba(16,185,129,0.14), transparent 28%), radial-gradient(circle at top right, rgba(99,102,241,0.16), transparent 30%), linear-gradient(180deg, #04070d 0%, #050816 45%, #000000 100%)",
          pointerEvents: "none",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-6 py-10 sm:px-10 lg:px-12">

        {/* NAV */}
        <nav className="mb-16 flex items-center justify-between">
          <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.3em", color: "#6ee7b7" }}>
            SUPPORTCOACH
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <a
              href={ADMIN_URL}
              style={{
                fontSize: "13px",
                color: "rgba(255,255,255,0.7)",
                textDecoration: "none",
              }}
            >
              Sign In
            </a>
            <a
              href={SIGNUP_URL}
              style={{
                fontSize: "13px",
                fontWeight: 700,
                color: "#000000",
                background: "#34d399",
                borderRadius: "999px",
                padding: "8px 20px",
                textDecoration: "none",
              }}
            >
              Start Free Trial
            </a>
          </div>
        </nav>

        {/* HERO */}
        <section className="grid items-center gap-16 pb-24 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                borderRadius: "999px",
                border: "1px solid rgba(110,231,183,0.25)",
                background: "rgba(110,231,183,0.08)",
                padding: "8px 16px",
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.28em",
                color: "#a7f3d0",
                marginBottom: "24px",
              }}
            >
              CHROME EXTENSION FOR SUPPORT TEAMS
            </div>

            <h1
              style={{
                fontSize: "clamp(40px, 6vw, 72px)",
                fontWeight: 700,
                lineHeight: 1.02,
                color: "#ffffff",
                marginBottom: "24px",
              }}
            >
              Prevent bad support replies before they happen.
            </h1>

            <p style={{ fontSize: "18px", lineHeight: 1.7, color: "rgba(255,255,255,0.6)", maxWidth: "520px", marginBottom: "36px" }}>
              Support Coach AI watches your agents&apos; drafts in real time, detects risky replies, and suggests a complete rewrite &mdash; before the customer ever sees it.
            </p>

            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <a
                href={SIGNUP_URL}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "999px",
                  background: "#34d399",
                  color: "#000000",
                  fontWeight: 700,
                  fontSize: "14px",
                  padding: "13px 28px",
                  textDecoration: "none",
                }}
              >
                Start Free Trial
              </a>
              <a
                href="#how-it-works"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "999px",
                  border: "1px solid rgba(255,255,255,0.15)",
                  background: "rgba(255,255,255,0.05)",
                  color: "#ffffff",
                  fontWeight: 600,
                  fontSize: "14px",
                  padding: "13px 28px",
                  textDecoration: "none",
                }}
              >
                See How It Works
              </a>
            </div>
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.45)", marginTop: "16px" }}>
              14-day free trial. No credit card required.
            </p>
          </div>

          {/* MOCK COACHING CARD */}
          <div style={{ position: "relative" }}>
            <div
              style={{
                position: "absolute",
                inset: "-8px",
                borderRadius: "36px",
                background: "rgba(52,211,153,0.07)",
                filter: "blur(24px)",
              }}
            />
            <div
              style={{
                position: "relative",
                borderRadius: "28px",
                border: "1px solid rgba(255,255,255,0.1)",
                background: "#081225",
                padding: "24px",
                backdropFilter: "blur(12px)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "16px", marginBottom: "20px" }}>
                <div>
                  <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.28em", color: "#6ee7b7", marginBottom: "6px" }}>LIVE COACH</p>
                  <p style={{ fontSize: "16px", fontWeight: 600, color: "#ffffff" }}>Reply Risk Check</p>
                </div>
                <span style={{ fontSize: "11px", fontWeight: 600, color: "#fcd34d", background: "rgba(252,211,77,0.1)", border: "1px solid rgba(252,211,77,0.2)", borderRadius: "999px", padding: "4px 12px" }}>
                  Medium Risk
                </span>
              </div>

              <div style={{ borderRadius: "16px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.2)", padding: "16px", marginBottom: "12px" }}>
                <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.22em", color: "rgba(255,255,255,0.4)", marginBottom: "10px" }}>ORIGINAL REPLY</p>
                <p style={{ fontSize: "14px", lineHeight: 1.6, color: "rgba(255,255,255,0.6)" }}>
                  We can&apos;t do that, and it&apos;s not currently supported. You&apos;ll need to handle it manually.
                </p>
              </div>

              <div style={{ borderRadius: "16px", border: "1px solid rgba(52,211,153,0.2)", background: "rgba(52,211,153,0.06)", padding: "16px", marginBottom: "16px" }}>
                <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.22em", color: "#6ee7b7", marginBottom: "10px" }}>SUGGESTED REWRITE</p>
                <p style={{ fontSize: "14px", lineHeight: 1.6, color: "#ffffff" }}>
                  I understand that&apos;s frustrating. While that workflow isn&apos;t supported today, here&apos;s the fastest path forward and what I can do to help from my side.
                </p>
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                <button style={{ flex: 1, borderRadius: "999px", background: "#34d399", color: "#000000", fontWeight: 700, fontSize: "13px", padding: "10px", border: "none", cursor: "pointer" }}>
                  Accept
                </button>
                <button style={{ flex: 1, borderRadius: "999px", border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "rgba(255,255,255,0.7)", fontWeight: 600, fontSize: "13px", padding: "10px", cursor: "pointer" }}>
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" style={{ paddingBottom: "96px" }}>
          <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.3em", color: "#6ee7b7", marginBottom: "12px" }}>3 LAYERS OF COACHING</p>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 700, color: "#ffffff", marginBottom: "48px", maxWidth: "600px" }}>
            Coaching that runs before the reply is sent
          </h2>
          <div style={{ display: "grid", gap: "20px", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
            {featureCards.map((card) => (
              <div
                key={card.num}
                style={{
                  borderRadius: "24px",
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.03)",
                  padding: "28px",
                }}
              >
                <div style={{ width: "40px", height: "40px", borderRadius: "999px", background: "rgba(52,211,153,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 700, color: "#34d399", marginBottom: "16px" }}>
                  {card.num}
                </div>
                <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#ffffff", marginBottom: "10px" }}>{card.title}</h3>
                <p style={{ fontSize: "14px", lineHeight: 1.6, color: "rgba(255,255,255,0.55)" }}>{card.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* PLATFORMS */}
        <section style={{ paddingBottom: "96px" }}>
          <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.3em", color: "#6ee7b7", marginBottom: "12px" }}>COMPATIBILITY</p>
          <h2 style={{ fontSize: "clamp(24px, 3vw, 36px)", fontWeight: 700, color: "#ffffff", marginBottom: "32px" }}>
            Works on major support platforms
          </h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
            {platforms.map((p) => (
              <span
                key={p}
                style={{
                  borderRadius: "999px",
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.05)",
                  padding: "10px 20px",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: p === "More coming soon" ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.8)",
                }}
              >
                {p}
              </span>
            ))}
          </div>
        </section>

        {/* VIDEO */}
        <section id="demo" style={{ paddingBottom: "96px" }}>
          <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.3em", color: "#6ee7b7", marginBottom: "12px" }}>SEE IT IN ACTION</p>
          <h2 style={{ fontSize: "clamp(24px, 3vw, 36px)", fontWeight: 700, color: "#ffffff", marginBottom: "32px" }}>
            Watch it catch a bad reply in real time
          </h2>
          <div
            style={{
              position: "relative",
              borderRadius: "24px",
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.03)",
              aspectRatio: "16/9",
            }}
          >
            <iframe
              src="https://www.youtube-nocookie.com/embed/_t77xhDO8B0?rel=0&modestbranding=1"
              title="Support Coach AI — live demo"
              loading="lazy"
              allow="autoplay; encrypted-media; picture-in-picture; web-share"
              allowFullScreen
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
            />
          </div>
        </section>

        {/* PRICING */}
        <section id="pricing" style={{ paddingBottom: "96px" }}>
          <div style={{ textAlign: "center", marginBottom: "40px" }}>
            <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.3em", color: "#6ee7b7", marginBottom: "12px" }}>PRICING</p>
            <h2 style={{ fontSize: "clamp(24px, 3vw, 36px)", fontWeight: 700, color: "#ffffff", marginBottom: "12px" }}>
              Simple per-agent pricing
            </h2>
            <p style={{ fontSize: "15px", lineHeight: 1.6, color: "rgba(255,255,255,0.55)", maxWidth: "460px", margin: "0 auto" }}>
              One price per agent. Every coaching layer included. At $15/agent/month, that&apos;s about
              50&cent; a day &mdash; less than the cost of a single mishandled conversation.
            </p>
          </div>

          {/* Launch offer banner — the launch discount lives here (applies to either plan),
              so the strikethrough in the card can mean one thing only: the regular price. */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              flexWrap: "wrap",
              textAlign: "center",
              borderRadius: "16px",
              border: "1px solid rgba(252,211,77,0.25)",
              background: "rgba(252,211,77,0.07)",
              padding: "14px 20px",
              maxWidth: "640px",
              margin: "0 auto 28px",
            }}
          >
            <span style={{ fontSize: "14px", fontWeight: 700, color: "#fcd34d" }}>🚀 Launch pricing</span>
            <span style={{ fontSize: "14px", lineHeight: 1.5, color: "rgba(255,255,255,0.75)" }}>
              From $10/agent/mo. Lock in your rate before our regular price rises to $20 &mdash; early teams keep it for the life of their subscription.
            </span>
          </div>

          {/* Billing toggle */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "32px" }}>
            <div style={{ display: "inline-flex", borderRadius: "999px", border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)", padding: "4px" }}>
              {(["monthly", "annual"] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setBilling(key)}
                  style={{
                    borderRadius: "999px",
                    border: "none",
                    cursor: "pointer",
                    padding: "8px 22px",
                    fontSize: "13px",
                    fontWeight: 700,
                    background: billing === key ? "#34d399" : "transparent",
                    color: billing === key ? "#000000" : "rgba(255,255,255,0.6)",
                  }}
                >
                  {PRICING[key].label}
                  {key === "annual" ? " · Save 50%" : ""}
                </button>
              ))}
            </div>
          </div>

          {/* Price card */}
          <div
            style={{
              position: "relative",
              borderRadius: "28px",
              border: "1px solid rgba(52,211,153,0.2)",
              background: "rgba(52,211,153,0.05)",
              padding: "clamp(32px, 5vw, 56px)",
              maxWidth: "520px",
              margin: "0 auto",
            }}
          >
            {plan.badge ? (
              <span style={{ position: "absolute", top: "24px", right: "24px", fontSize: "11px", fontWeight: 700, color: "#000000", background: "#34d399", borderRadius: "999px", padding: "5px 12px" }}>
                {plan.badge}
              </span>
            ) : null}

            <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.28em", color: "#6ee7b7", marginBottom: "16px" }}>
              SUPPORT COACH AI
            </p>

            <div style={{ display: "flex", alignItems: "flex-end", gap: "10px", flexWrap: "wrap", marginBottom: "10px" }}>
              {plan.regular ? (
                <span style={{ fontSize: "22px", fontWeight: 500, color: "rgba(255,255,255,0.4)", textDecoration: "line-through", paddingBottom: "8px" }}>
                  {plan.regular}
                </span>
              ) : null}
              <span style={{ fontSize: "56px", fontWeight: 700, color: "#ffffff", lineHeight: 1 }}>
                {plan.price}
              </span>
              <span style={{ fontSize: "15px", fontWeight: 500, color: "rgba(255,255,255,0.55)", paddingBottom: "8px" }}>
                {plan.unit}
              </span>
              {plan.savings ? (
                <span style={{ fontSize: "12px", fontWeight: 700, color: "#000000", background: "#fcd34d", borderRadius: "999px", padding: "5px 12px", marginLeft: "4px", marginBottom: "9px" }}>
                  {plan.savings}
                </span>
              ) : null}
            </div>
            <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.55)", marginBottom: "8px" }}>
              {plan.note}
            </p>
            <p style={{ fontSize: "13px", color: "#a7f3d0", marginBottom: "28px" }}>
              Lock in this rate for the life of your subscription.
            </p>

            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 32px", display: "flex", flexDirection: "column", gap: "12px" }}>
              {includedFeatures.map((feature) => (
                <li key={feature} style={{ display: "flex", alignItems: "flex-start", gap: "10px", fontSize: "14px", color: "rgba(255,255,255,0.8)" }}>
                  <span style={{ color: "#34d399", fontWeight: 700 }}>&#10003;</span>
                  {feature}
                </li>
              ))}
            </ul>

            <a
              href={SIGNUP_URL}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "999px",
                background: "#34d399",
                color: "#000000",
                fontWeight: 700,
                fontSize: "15px",
                padding: "15px",
                textDecoration: "none",
              }}
            >
              Start Free Trial
            </a>
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.45)", textAlign: "center", marginTop: "14px" }}>
              14-day free trial. No credit card required.
            </p>
          </div>
        </section>

        {/* FOOTER CTA */}
        <section style={{ paddingBottom: "64px", textAlign: "center" }}>
          <div style={{ borderRadius: "24px", border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)", padding: "48px 32px" }}>
            <h2 style={{ fontSize: "clamp(20px, 3vw, 28px)", fontWeight: 700, color: "#ffffff", marginBottom: "12px" }}>
              Already using Support Coach?
            </h2>
            <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.5)", marginBottom: "28px", maxWidth: "480px", margin: "0 auto 28px" }}>
              Sign in to manage your team, tone profile, and billing &mdash; or start your free trial above.
            </p>
            <a
              href={ADMIN_URL}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "999px",
                border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(255,255,255,0.05)",
                color: "#ffffff",
                fontWeight: 600,
                fontSize: "14px",
                padding: "12px 28px",
                textDecoration: "none",
              }}
            >
              Sign In
            </a>
          </div>
        </section>

        {/* FOOTER LINKS */}
        <footer style={{ paddingBottom: "48px", textAlign: "center", display: "flex", justifyContent: "center", gap: "20px", flexWrap: "wrap" }}>
          <Link href="/privacy" style={{ fontSize: "13px", color: "rgba(255,255,255,0.45)", textDecoration: "none" }}>
            Privacy Policy
          </Link>
          <Link href="/terms" style={{ fontSize: "13px", color: "rgba(255,255,255,0.45)", textDecoration: "none" }}>
            Terms of Service
          </Link>
          <a href="mailto:support@supportcoach.io" style={{ fontSize: "13px", color: "rgba(255,255,255,0.45)", textDecoration: "none" }}>
            support@supportcoach.io
          </a>
        </footer>

      </div>
    </main>
  );
}
