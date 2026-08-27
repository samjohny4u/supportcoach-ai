import Link from "next/link";

export const metadata = {
  title: "Security and IT Review | Support Coach AI",
  description:
    "What the Support Coach Chrome extension can access, what leaves the browser, what is stored, and how to deploy it across a managed Chrome fleet.",
};

const glance: { q: string; a: string; good: boolean }[] = [
  { q: "Chrome permissions requested", a: "storage only", good: true },
  { q: "Sites it can run on", a: "Five help-desk domains. Nothing else.", good: true },
  { q: "Customer messages transmitted", a: "No. They never leave the browser.", good: true },
  { q: "Agent draft reply transmitted", a: "Yes, over HTTPS, to our API and OpenAI", good: false },
  { q: "Draft reply stored in a database", a: "No. Transient processing only.", good: true },
  { q: "Remote code execution", a: "No. All code ships inside the extension package.", good: true },
  { q: "Works with no sign-in or no network", a: "Yes. The local rules layer needs neither.", good: true },
  { q: "SOC 2 or SSO", a: "Not available today. See section 7.", good: false },
];

const transmitted: { field: string; what: string }[] = [
  { field: "draft_text", what: "The reply the agent has typed and not yet sent." },
  { field: "triggered_rules", what: "Rule family names and numeric weights. No message text." },
  { field: "local_score", what: "A number from 0 to 100 produced on the agent's machine." },
  { field: "draft_hash", what: "A non-reversible hash used to avoid processing the same draft twice." },
];

const subprocessors: { name: string; purpose: string; receives: string }[] = [
  { name: "OpenAI", purpose: "Analyses the draft and returns coaching feedback", receives: "The agent's draft reply text" },
  { name: "Railway", purpose: "Hosts our API", receives: "The draft reply in transit" },
  { name: "Supabase", purpose: "Database for accounts and aggregate statistics", receives: "Account details, aggregate counts" },
  { name: "Vercel", purpose: "Hosts the admin console and this site", receives: "Account details" },
  { name: "Resend", purpose: "Sends transactional and weekly summary email", receives: "Name, email address" },
  { name: "Paddle", purpose: "Merchant of record for billing", receives: "Billing details you enter at checkout" },
];

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-white mb-3">
        {n}. {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-black text-gray-300">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-white mb-2">Security and IT Review</h1>
        <p className="text-gray-400 mb-2">
          Support Coach is a Chrome extension that coaches support agents on a reply before the
          customer sees it. This page is written for IT and security reviewers. It sets out what the
          extension can access, what leaves the browser, what we store, and how to deploy it across a
          managed fleet.
        </p>
        <p className="text-gray-500 mb-10">Last updated: August 20, 2026</p>

        <div className="mb-12 rounded-lg border border-gray-800 overflow-hidden">
          <div className="bg-gray-900/60 px-5 py-3 text-white text-sm font-semibold">At a glance</div>
          <table className="w-full text-sm">
            <tbody>
              {glance.map((row) => (
                <tr key={row.q} className="border-t border-gray-800/80">
                  <td className="px-5 py-3 text-gray-400 align-top w-[52%]">{row.q}</td>
                  <td
                    className={`px-5 py-3 align-top ${row.good ? "text-emerald-400" : "text-gray-200"}`}
                  >
                    {row.a}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-10 text-sm leading-relaxed">
          <Section n={1} title="What the extension is allowed to access">
            <p>
              Chrome enforces an extension&apos;s permissions from its manifest. Ours requests a
              single permission, and access to five help-desk domains. This is the complete list, as
              published:
            </p>
            <pre className="bg-gray-900/70 border border-gray-800 rounded-lg p-4 overflow-x-auto text-xs text-gray-300">
{`"permissions": ["storage"],
"host_permissions": [
  "*://*.zendesk.com/*",
  "*://*.intercom.com/*",
  "*://*.intercom.io/*",
  "*://*.salesiq.zoho.com/*",
  "*://*.zohosalesiq.com/*"
]`}
            </pre>
            <p>
              It does not request <span className="text-white">tabs</span>,{" "}
              <span className="text-white">cookies</span>,{" "}
              <span className="text-white">webRequest</span>,{" "}
              <span className="text-white">scripting</span>,{" "}
              <span className="text-white">downloads</span>, clipboard access, or{" "}
              <span className="text-white">&lt;all_urls&gt;</span>. It cannot read other tabs, cannot
              see browsing history, and cannot run on any site outside the five domains above.
            </p>
            <p>
              The <span className="text-white">storage</span> permission holds the agent&apos;s
              session token and their coaching preferences, in Chrome&apos;s extension-local storage.
            </p>
            <p>
              All executable code ships inside the extension package and is reviewed by Google before
              publication. The extension does not fetch or evaluate remote code.
            </p>
          </Section>

          <Section n={2} title="What leaves the browser">
            <p>
              When an agent pauses typing, or clicks Check before sending, the extension sends four
              fields to our API over HTTPS. This is the entire payload:
            </p>
            <div className="rounded-lg border border-gray-800 overflow-hidden">
              <table className="w-full text-sm">
                <tbody>
                  {transmitted.map((row) => (
                    <tr key={row.field} className="border-t border-gray-800/80 first:border-t-0">
                      <td className="px-5 py-3 align-top w-[34%] font-mono text-xs text-emerald-400">
                        {row.field}
                      </td>
                      <td className="px-5 py-3 align-top text-gray-400">{row.what}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-white font-medium mt-4">What is never transmitted</p>
            <p>
              The customer&apos;s messages, the conversation history, attachments or files shared in
              the chat, customer contact records, and ticket metadata all stay in the browser. The
              coaching model analyses the agent&apos;s own draft in isolation and has no visibility of
              the conversation it belongs to.
            </p>
            <p>
              The instant feedback layer, which flags blame language and abrupt closings as the agent
              types, runs entirely on the agent&apos;s machine and makes no network request at all. It
              keeps working with no sign-in and no internet connection.
            </p>
          </Section>

          <Section n={3} title="What we store, and for how long">
            <p>
              <span className="text-white">Draft reply text is not stored in our database.</span> It
              is processed in memory to produce the coaching response. A short-lived cache, up to 60
              seconds and keyed by a non-reversible hash, prevents the same draft being processed
              twice while an agent edits it. After that it is discarded.
            </p>
            <p>
              What we do retain is account information (name, email address, organisation name) and
              aggregate coaching statistics: which categories of coaching rule were triggered, and
              counts of suggestions shown, accepted, or dismissed. These statistics contain no message
              content, no draft text, and no customer data.
            </p>
            <p>
              Full detail on retention, deletion, and the Chrome Web Store Limited Use requirements is
              in our{" "}
              <Link href="/privacy" className="text-emerald-400 hover:text-emerald-300 underline">
                Privacy Policy
              </Link>
              , section 9.
            </p>
          </Section>

          <Section n={4} title="Subprocessors">
            <div className="rounded-lg border border-gray-800 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-900/60 text-white text-xs uppercase tracking-wide">
                    <th className="px-5 py-3 text-left font-semibold">Provider</th>
                    <th className="px-5 py-3 text-left font-semibold">Purpose</th>
                    <th className="px-5 py-3 text-left font-semibold">Receives</th>
                  </tr>
                </thead>
                <tbody>
                  {subprocessors.map((row) => (
                    <tr key={row.name} className="border-t border-gray-800/80">
                      <td className="px-5 py-3 align-top text-white">{row.name}</td>
                      <td className="px-5 py-3 align-top text-gray-400">{row.purpose}</td>
                      <td className="px-5 py-3 align-top text-gray-400">{row.receives}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>
              OpenAI processes the draft through its API. As of the date above, OpenAI does not use
              API inputs or outputs to train its models.
            </p>
          </Section>

          <Section n={5} title="Accounts and access control">
            <p>
              Agents do not create their own accounts. An administrator at your organisation creates
              the organisation and invites agents to it. Removing an agent from the organisation
              revokes their access.
            </p>
            <p>
              Sessions are token based. The token is held in the extension&apos;s own storage, is not
              readable by web pages, and expires. Signing out clears it from the device.
            </p>
            <p>
              Administrators manage the team, coaching sensitivity, and billing at{" "}
              <span className="text-white">admin.supportcoach.io</span>.
            </p>
          </Section>

          <Section n={6} title="Deploying across a managed Chrome fleet">
            <p>
              If your organisation manages Chrome centrally, you can deploy Support Coach to agents
              rather than having them install it individually. It is published on the Chrome Web
              Store, so it works with the standard Chrome Enterprise policies.
            </p>
            <p className="text-white font-medium mt-4">Extension ID</p>
            <pre className="bg-gray-900/70 border border-gray-800 rounded-lg p-4 overflow-x-auto text-xs text-emerald-400">
kfmbekgngkgbcejoinohlalmbmkegnbi
            </pre>
            <p>
              Add this to <span className="text-white">ExtensionInstallForcelist</span> to deploy it,
              or to <span className="text-white">ExtensionInstallAllowlist</span> if your policy
              blocks extensions by default and you would rather agents opt in.
            </p>
            <p className="text-white font-medium mt-4">Domains to allow</p>
            <p>
              If you filter outbound traffic or run split DNS, these two hostnames need to resolve and
              be reachable over HTTPS from agent machines:
            </p>
            <pre className="bg-gray-900/70 border border-gray-800 rounded-lg p-4 overflow-x-auto text-xs text-gray-300">
{`api.supportcoach.io      coaching requests from the extension
admin.supportcoach.io    administrator console`}
            </pre>
            <p>
              We have seen corporate DNS filtering block the API hostname before. If agents report
              that coaching never loads while the rest of the help desk works normally, that is the
              first thing to check.
            </p>
          </Section>

          <Section n={7} title="Current limitations, stated plainly">
            <p>
              We would rather you learn these here than discover them during a review.
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-400">
              <li>
                <span className="text-white">No SOC 2 report today.</span> We are a small team and
                have not completed an audit.
              </li>
              <li>
                <span className="text-white">No SSO or SAML.</span> Access is email and password, with
                administrator-managed invitations.
              </li>
              <li>
                <span className="text-white">No configurable data region.</span> Processing happens in
                our providers&apos; default regions.
              </li>
            </ul>
            <p>
              The compensating control is the scope of the data itself. No customer conversation
              content is stored anywhere in our systems, because none of it is ever sent. The most
              sensitive thing that reaches us is a reply an agent was about to send to a customer, and
              we do not keep it.
            </p>
          </Section>

          <Section n={8} title="Questions">
            <p>
              If your review needs something that is not covered here, write to{" "}
              <a
                href="mailto:support@supportcoach.io"
                className="text-emerald-400 hover:text-emerald-300 underline"
              >
                support@supportcoach.io
              </a>{" "}
              and we will answer directly.
            </p>
          </Section>
        </div>

        <div className="mt-14 pt-8 border-t border-gray-800 flex flex-wrap gap-6 text-sm">
          <Link href="/extension" className="text-gray-400 hover:text-white transition">
            Live Agent Coach
          </Link>
          <Link href="/privacy" className="text-gray-400 hover:text-white transition">
            Privacy Policy
          </Link>
          <Link href="/terms" className="text-gray-400 hover:text-white transition">
            Terms
          </Link>
        </div>
      </div>
    </div>
  );
}
