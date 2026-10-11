import Link from "next/link";
import HideAppNav from "./HideAppNav";

// The page prospects are sent to after a positive reply to outbound email. It explains the
// 30-day guided pilot in one read. Copy rules (support-coach-extension docs/POSITIONING.md):
// no outcome numbers (CSAT, escalations), no testimonials, the founder's employer is never
// named, and the AI never sees the customer's messages.

export const metadata = {
  title: "30-Day Guided Pilot | Support Coach AI",
  description:
    "Run Support Coach with your whole live-chat team for 30 days. A 20-minute setup call with the founder, your tone profile configured for you, and a review against two measures you choose.",
  alternates: { canonical: "/pilot" },
};

const CALL_MAILTO =
  "mailto:support@supportcoach.io?subject=Support%20Coach%20pilot%20-%20setup%20call&body=Hi%20Johny%2C%0A%0AWe%27d%20like%20to%20run%20the%2030-day%20pilot.%0A%0AHelp%20desk%20(Zendesk%20%2F%20Intercom%20%2F%20Zoho%20SalesIQ)%3A%20%0ANumber%20of%20chat%20agents%3A%20%0AThree%20times%20that%20suit%20you%20for%20a%2020-minute%20call%3A%20%0A";

const included: { title: string; body: string }[] = [
  {
    title: "Your whole team, every feature",
    body: "Every agent you invite gets the instant hints, the coaching card and the pre-send check. No seat limit and no card during the pilot.",
  },
  {
    title: "A 20-minute setup call with the founder",
    body: "We set up your admin account, invite your agents and walk through the first coached reply together on your own help desk.",
  },
  {
    title: "Your tone profile, configured for you",
    body: "Send us a few replies you love and a few you would never want sent. We turn them into the standards Support Coach coaches against.",
  },
  {
    title: "A review on day 25",
    body: "We look at your team's coaching report against the two measures you chose on the setup call, and you decide whether to continue.",
  },
];

const timeline: { day: string; title: string; body: string }[] = [
  { day: "Day 0", title: "Setup call", body: "Admin account, tone profile, two success measures agreed, first agents installed." },
  { day: "Day 1-3", title: "Agents start", body: "The rest of the team installs the extension from the Chrome Web Store and signs in." },
  { day: "Day 7", title: "Check-in", body: "A short email: what is firing, what is noisy, anything to tune." },
  { day: "Day 14", title: "Midpoint", body: "Your first weekly summary is in. We adjust sensitivity or the tone profile if needed." },
  { day: "Day 25", title: "Review", body: "We go through the coaching report against your two measures. 15 minutes." },
  { day: "Day 30", title: "Decide", body: "Continue on a paid plan, or stop. If you stop, the instant hints keep working for free." },
];

const weNeed: string[] = [
  "One admin who can invite agents (usually the support lead or manager)",
  "Your help desk: Zendesk, Intercom or Zoho SalesIQ, used in Google Chrome",
  "Three to five replies your best agent sent that you would like everyone to sound like",
  "Two or three replies you never want sent again (names and details removed)",
  "If your company manages Chrome centrally, a word with IT. Our security page has everything they need",
];

const measures: string[] = [
  "Share of replies that get a coaching flag in week 1 versus week 4",
  "How often agents accept the suggested rewrite",
  "Fewer replies flagged for blame language or flat refusals in your own QA reviews",
  "Time your team lead spends correcting new agents' tone",
  "A measure of your own: if you already track it, we will look at it with you",
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-white mb-4">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export default function PilotPage() {
  return (
    <div className="min-h-screen bg-black text-gray-300">
      <HideAppNav />
      <div className="max-w-3xl mx-auto px-6 py-16">
        <p className="text-emerald-400 text-sm font-semibold tracking-wide uppercase mb-3">
          30-day guided pilot
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4 leading-tight">
          Run Support Coach with your whole chat team for 30 days
        </h1>
        <p className="text-gray-400 text-base mb-8 leading-relaxed">
          Your help desk&apos;s AI rewrites replies when agents ask. Support Coach speaks up when they
          don&apos;t. The pilot shows you, on your own team&apos;s chats, which replies it catches and
          whether your agents act on it.
        </p>
        <div className="flex flex-wrap gap-3 mb-14">
          <a
            href={CALL_MAILTO}
            className="rounded-full bg-emerald-400 px-6 py-3 text-sm font-bold text-black transition hover:bg-emerald-300"
          >
            Book the setup call
          </a>
          <a
            href="https://youtu.be/oaGdlgw8p-o"
            className="rounded-full border border-gray-700 px-6 py-3 text-sm font-semibold text-white transition hover:border-gray-500"
          >
            Watch the 61-second demo
          </a>
        </div>

        <div className="space-y-12 text-sm leading-relaxed">
          <Section title="What the pilot includes">
            <div className="grid gap-4 sm:grid-cols-2">
              {included.map((item) => (
                <div key={item.title} className="rounded-lg border border-gray-800 bg-gray-900/40 p-5">
                  <p className="text-white font-semibold mb-2">{item.title}</p>
                  <p className="text-gray-400">{item.body}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section title="How the 30 days run">
            <div className="rounded-lg border border-gray-800 overflow-hidden">
              <table className="w-full text-sm">
                <tbody>
                  {timeline.map((row) => (
                    <tr key={row.day} className="border-t border-gray-800/80 first:border-t-0">
                      <td className="px-5 py-3 align-top w-[22%] font-semibold text-emerald-400 whitespace-nowrap">
                        {row.day}
                      </td>
                      <td className="px-5 py-3 align-top">
                        <span className="text-white font-medium">{row.title}.</span>{" "}
                        <span className="text-gray-400">{row.body}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section title="What we need from you">
            <ul className="list-disc list-inside space-y-2 text-gray-400">
              {weNeed.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Section>

          <Section title="Pick two measures on the call">
            <p>
              A pilot without a measure is a demo. On the setup call we agree two measures, so day 25
              is a yes or no, not a feeling. Teams usually choose from these:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-400">
              {measures.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Section>

          <Section title="What it costs">
            <p>
              <span className="text-white font-medium">Nothing during the pilot.</span> No card is
              needed to start. If you continue, it is{" "}
              <span className="text-white">$15 per agent per month</span>, or{" "}
              <span className="text-white">$10 per agent per month billed annually</span>.
            </p>
            <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-5 py-4 text-gray-300">
              <span className="text-emerald-400 font-semibold">Founding teams:</span> the first ten
              teams to continue after a pilot keep $15 per agent per month for as long as they stay
              subscribed, even after the regular price rises to $20. Open until December 31, 2026.
            </p>
            <p>
              If you decide not to continue, the instant hints keep working for your agents at no
              cost. They run on the agent&apos;s machine and need no AI.
            </p>
          </Section>

          <Section title="Privacy, in one paragraph">
            <p>
              Support Coach reads only the reply your agent is typing, never the customer&apos;s
              messages. The draft is processed to produce coaching and is not stored. Built for our own
              support team first, where 13 agents have used it daily since March 2026. For the full
              detail your IT or security team will want, see our{" "}
              <Link href="/security" className="text-emerald-400 hover:text-emerald-300 underline">
                security page
              </Link>
              .
            </p>
          </Section>

          <Section title="Ready?">
            <p>
              Reply to the email that brought you here, or book the setup call below. You will speak
              with Johny, the founder. Support Coach was built for the live-chat team Johny runs.
            </p>
            <div>
              <a
                href={CALL_MAILTO}
                className="inline-block rounded-full bg-emerald-400 px-6 py-3 text-sm font-bold text-black transition hover:bg-emerald-300"
              >
                Book the setup call
              </a>
            </div>
          </Section>
        </div>

        <div className="mt-14 pt-8 border-t border-gray-800 flex flex-wrap gap-6 text-sm">
          <Link href="/extension" className="text-gray-400 hover:text-white transition">
            Live Agent Coach
          </Link>
          <Link href="/security" className="text-gray-400 hover:text-white transition">
            Security
          </Link>
          <Link href="/privacy" className="text-gray-400 hover:text-white transition">
            Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  );
}
