export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-black text-gray-300">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
        <p className="text-gray-500 mb-10">Last updated: March 22, 2026</p>

        <div className="space-y-8 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">1. Introduction</h2>
            <p>
              SupportCoach AI (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) is committed to
              protecting the privacy of our users. This Privacy Policy explains how we collect, use,
              store, and protect information when you use our platform at supportcoach.io
              (&quot;the Service&quot;).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">2. Information We Collect</h2>
            <p className="mb-3">We collect the following types of information:</p>
            <p className="font-medium text-white mt-3 mb-1">Account Information</p>
            <p>
              When you create an account, we collect your email address, name, and organization name.
              This information is used for authentication and to associate your data with your organization.
            </p>
            <p className="font-medium text-white mt-3 mb-1">Chat Transcript Data</p>
            <p>
              When you upload chat transcripts for analysis, we store the transcript text, parsed
              messages, and AI-generated analysis results (coaching feedback, scores, topic
              classifications, and flags). This data is stored in our database and processed by
              our AI service to generate coaching insights.
            </p>
            <p className="font-medium text-white mt-3 mb-1">Company Coaching Context</p>
            <p>
              If you provide company-specific coaching context (product workflows, process knowledge,
              coaching standards), this is stored and used to improve the relevance of AI-generated
              coaching feedback for your organization.
            </p>
            <p className="font-medium text-white mt-3 mb-1">Usage Data</p>
            <p>
              We may collect basic usage information such as login times, pages visited, and features
              used. This data is used to improve the Service and is not shared with third parties.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">3. How We Use Your Information</h2>
            <p>We use your information to:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-gray-400">
              <li>Provide, maintain, and improve the Service</li>
              <li>Generate AI-powered coaching feedback and performance analytics</li>
              <li>Authenticate your identity and manage your account</li>
              <li>Process payments through our third-party payment provider</li>
              <li>Communicate with you about your account or the Service</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">4. Data Isolation</h2>
            <p>
              SupportCoach AI is a multi-tenant platform. All data is isolated by organization. Your
              chat transcripts, analysis results, coaching context, and reports are only accessible to
              authenticated users within your organization. No other customer can access your data.
              Row-level security policies are enforced at the database level.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">5. AI Processing</h2>
            <p>
              Chat transcripts are sent to OpenAI&apos;s API for analysis. OpenAI processes the
              transcript text to generate coaching feedback and returns the results to our platform.
              We use OpenAI&apos;s API in accordance with their data usage policies. As of the date of
              this policy, OpenAI does not use API inputs or outputs for model training. We recommend
              reviewing OpenAI&apos;s current data usage policy at{" "}
              <a
                href="https://openai.com/policies/api-data-usage-policies"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 hover:text-emerald-300 underline"
              >
                openai.com/policies
              </a>{" "}
              for the most current information.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">6. Third-Party Services</h2>
            <p>We use the following third-party services to operate the platform:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-gray-400">
              <li><span className="text-gray-300">Supabase</span> — database hosting and authentication</li>
              <li><span className="text-gray-300">OpenAI</span> — AI analysis of chat transcripts</li>
              <li><span className="text-gray-300">Vercel</span> — application hosting</li>
              <li><span className="text-gray-300">Paddle</span> — payment processing</li>
            </ul>
            <p className="mt-2">
              We do not sell, rent, or share your personal information or chat data with any other
              third parties.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">7. Data Storage and Security</h2>
            <p>
              Your data is stored in Supabase (PostgreSQL) with row-level security enabled. All
              communication between your browser and our servers is encrypted via HTTPS. We do not
              store payment card numbers, CVVs, or bank account details — all payment processing is
              handled by our payment provider. API keys and service credentials are stored securely
              as environment variables and are never exposed to client-side code.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">8. Data Retention</h2>
            <p>
              Your data is retained for as long as your account is active. If you cancel your
              subscription, your data will be retained for 30 days to allow for reactivation. After
              30 days, your data may be permanently deleted. You may request deletion of your data at
              any time by contacting us.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">9. Your Rights</h2>
            <p>Depending on your jurisdiction, you may have the right to:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-gray-400">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Export your data in a portable format</li>
              <li>Object to or restrict certain processing of your data</li>
            </ul>
            <p className="mt-2">
              To exercise any of these rights, contact us at{" "}
              <a href="mailto:support@supportcoach.io" className="text-emerald-400 hover:text-emerald-300 underline">
                support@supportcoach.io
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">10. Cookies</h2>
            <p>
              We use essential cookies for authentication and session management. We do not use
              tracking cookies, advertising cookies, or third-party analytics cookies.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">11. Children&apos;s Privacy</h2>
            <p>
              The Service is not intended for use by individuals under the age of 18. We do not
              knowingly collect personal information from children.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">12. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify users of material
              changes via email or through the Service. Your continued use of the Service after changes
              are posted constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">13. Contact</h2>
            <p>
              If you have questions about this Privacy Policy, please contact us at{" "}
              <a href="mailto:support@supportcoach.io" className="text-emerald-400 hover:text-emerald-300 underline">
                support@supportcoach.io
              </a>
              .
            </p>
          </section>
        </div>

        <div className="mt-16 pt-8 border-t border-gray-800 text-center text-gray-600 text-xs">
          <a href="/" className="hover:text-gray-400">← Back to SupportCoach AI</a>
        </div>
      </div>
    </div>
  );
}