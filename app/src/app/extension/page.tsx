"use client";

import { useState } from "react";

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

const workflowSteps = [
  "Agent types a reply in Chrome.",
  "Support Coach detects coaching risk in real time.",  
  "A stronger rewrite appears before the message goes out.",
];

const platforms = ["Zendesk", "Intercom", "Zoho SalesIQ", "More coming soon"];

const teamSizes = [
  "1â€“5 agents",
  "6â€“15 agents",
  "16â€“50 agents",
  "50+ agents",
];

export default function ExtensionPage() {
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [teamSize, setTeamSize] = useState("");
  const [submitted, setSubmitted] = useState(false);    
  const [loading, setLoading] = useState(false);        
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {     
    e.preventDefault();
    setError("");
    if (!email || !company || !teamSize) {
      setError("Please fill in all fields.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/extension-waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, company_name: company, team_size: teamSize }),
      });
      const data = await res.json();
      if (data.error === "already_registered") {        
        setError("This email is already on the waitlist.");
      } else if (data.ok) {
        setSubmitted(true);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } catch {
      setError("Could not connect. Please try again."); 
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      className="relative min-h-screen overflow-hidden text-white bg-black"
    >
      {/* Background gradient â€” matches main site exactly */}
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
          <span
            style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.3em", color: "#6ee7b7" }}
          >
            SUPPORTCOACH
          </span>
          <a
            href="/"
            style={{
              fontSize: "13px",
              color: "rgba(255,255,255,0.7)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "999px",
              padding: "8px 20px",
              textDecoration: "none",
              background: "rgba(255,255,255,0.04)",     
            }}
          >
            Manager Dashboard â†’
          </a>
        </nav>

        {/* HERO */}
        <section
          className="grid items-center gap-16 pb-24 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]"
        >
          <div>
            {/* Badge */}
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
              Support Coach AI watches your agents&apos; drafts in real time, detects risky replies, and suggests a complete rewrite â€” before the customer ever sees it.
            </p>

            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <a
                href="#waitlist"
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
                Join the Waitlist
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

        {/* VIDEO PLACEHOLDER */}
        <section style={{ paddingBottom: "96px" }}>     
          <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.3em", color: "#6ee7b7", marginBottom: "12px" }}>SEE IT IN ACTION</p>
          <h2 style={{ fontSize: "clamp(24px, 3vw, 36px)", fontWeight: 700, color: "#ffffff", marginBottom: "32px" }}>
            Watch it catch a bad reply in real time     
          </h2>
          <div
            style={{
              borderRadius: "24px",
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.03)",     
              aspectRatio: "16/9",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "12px",
            }}
          >
            <span style={{ fontSize: "40px", opacity: 0.3 }}>â–¶</span>
            <p style={{ fontSize: "16px", fontWeight: 500, color: "rgba(255,255,255,0.4)" }}>Demo video coming soon</p>
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.25)", textAlign: "center", maxWidth: "360px" }}>
              We&apos;re finishing our internal beta. A full walkthrough will be posted here shortly.
            </p>
          </div>
        </section>

        {/* WAITLIST FORM */}
        <section id="waitlist" style={{ paddingBottom: "96px" }}>
          <div
            style={{
              borderRadius: "28px",
              border: "1px solid rgba(52,211,153,0.15)",
              background: "rgba(52,211,153,0.04)",      
              padding: "clamp(32px, 5vw, 64px)",        
              maxWidth: "600px",
              margin: "0 auto",
            }}
          >
            <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.3em", color: "#6ee7b7", marginBottom: "12px" }}>EARLY ACCESS</p>
            <h2 style={{ fontSize: "clamp(24px, 3vw, 36px)", fontWeight: 700, color: "#ffffff", marginBottom: "12px" }}>
              Be first when we launch
            </h2>
            <p style={{ fontSize: "15px", lineHeight: 1.6, color: "rgba(255,255,255,0.55)", marginBottom: "36px" }}>
              We&apos;re running a controlled rollout. Join the waitlist and we&apos;ll reach out when your spot is ready.
            </p>

            {submitted ? (
              <div style={{ borderRadius: "16px", border: "1px solid rgba(52,211,153,0.25)", background: "rgba(52,211,153,0.08)", padding: "24px", textAlign: "center" }}>
                <p style={{ fontSize: "18px", fontWeight: 600, color: "#34d399", marginBottom: "8px" }}>You&apos;re on the list! ðŸŽ‰</p>
                <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.55)" }}>We&apos;ll be in touch soon.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>  
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "rgba(255,255,255,0.5)", marginBottom: "8px", letterSpacing: "0.05em" }}> 
                    WORK EMAIL *
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"       
                    style={{
                      width: "100%",
                      borderRadius: "12px",
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(255,255,255,0.05)",
                      padding: "13px 16px",
                      fontSize: "15px",
                      color: "#ffffff",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "rgba(255,255,255,0.5)", marginBottom: "8px", letterSpacing: "0.05em" }}> 
                    COMPANY NAME *
                  </label>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Acme Inc."
                    style={{
                      width: "100%",
                      borderRadius: "12px",
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(255,255,255,0.05)",
                      padding: "13px 16px",
                      fontSize: "15px",
                      color: "#ffffff",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "rgba(255,255,255,0.5)", marginBottom: "8px", letterSpacing: "0.05em" }}> 
                    SUPPORT TEAM SIZE *
                  </label>
                  <select
                    value={teamSize}
                    onChange={(e) => setTeamSize(e.target.value)}
                    style={{
                      width: "100%",
                      borderRadius: "12px",
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "#081225",
                      padding: "13px 16px",
                      fontSize: "15px",
                      color: teamSize ? "#ffffff" : "rgba(255,255,255,0.35)",
                      outline: "none",
                      boxSizing: "border-box",
                      cursor: "pointer",
                    }}
                  >
                    <option value="" disabled>Select team size</option>
                    {teamSizes.map((s) => (
                      <option key={s} value={s} style={{ color: "#ffffff", background: "#081225" }}>{s}</option>
                    ))}
                  </select>
                </div>

                {error && (
                  <p style={{ fontSize: "13px", color: "#f87171", marginTop: "-4px" }}>{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    borderRadius: "999px",
                    background: loading ? "rgba(52,211,153,0.5)" : "#34d399",
                    color: "#000000",
                    fontWeight: 700,
                    fontSize: "15px",
                    padding: "15px",
                    border: "none",
                    cursor: loading ? "not-allowed" : "pointer",
                    marginTop: "8px",
                  }}
                >
                  {loading ? "Submitting..." : "Request Early Access"}
                </button>
              </form>
            )}
          </div>
        </section>

        {/* FOOTER CTA */}
        <section style={{ paddingBottom: "64px", textAlign: "center" }}>
          <div style={{ borderRadius: "24px", border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)", padding: "48px 32px" }}>
            <h2 style={{ fontSize: "clamp(20px, 3vw, 28px)", fontWeight: 700, color: "#ffffff", marginBottom: "12px" }}>
              Already using the dashboard?
            </h2>
            <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.5)", marginBottom: "28px", maxWidth: "480px", margin: "0 auto 28px" }}>
              Support Coach AI Live Agent Coach works alongside the manager dashboard â€” the same platform, two layers of coaching.
            </p>
            <a
              href="/"
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
              Back to Dashboard
            </a>
          </div>
        </section>

      </div>
    </main>
  );
}