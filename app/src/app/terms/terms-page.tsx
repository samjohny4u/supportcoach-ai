export default function TermsPage() {
  return (
    <div className="min-h-screen bg-black text-gray-300">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-white mb-2">Terms of Service</h1>
        <p className="text-gray-500 mb-10">Last updated: March 22, 2026</p>

        <div className="space-y-8 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">1. Agreement to Terms</h2>
            <p>
              By accessing or using SupportCoach AI (&quot;the Service&quot;), operated by SupportCoach AI
              (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;), you agree to be bound by these Terms of Service.
              If you do not agree to these terms, do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">2. Description of Service</h2>
            <p>
              SupportCoach AI is a SaaS platform that analyzes customer support chat transcripts
              using artificial intelligence to generate coaching feedback, performance scores, topic
              intelligence, and management reports. The Service is designed for use by support team
              managers and team leads.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">3. Account Registration</h2>
            <p>
              To use the Service, you must create an account and provide accurate, complete information.
              You are responsible for maintaining the confidentiality of your account credentials and for
              all activity that occurs under your account. You must notify us immediately of any
              unauthorized use of your account.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">4. Subscription and Payment</h2>
            <p>
              The Service is offered on a per-agent, per-month subscription basis. Pricing is published
              on our website and may be updated from time to time with reasonable notice. Payment is
              processed through our third-party payment provider. By subscribing, you authorize us to
              charge your payment method on a recurring basis until you cancel.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">5. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-gray-400">
              <li>Use the Service for any unlawful purpose</li>
              <li>Upload content that violates the rights of any third party</li>
              <li>Attempt to gain unauthorized access to any part of the Service</li>
              <li>Interfere with or disrupt the integrity or performance of the Service</li>
              <li>Reverse engineer, decompile, or disassemble any part of the Service</li>
              <li>Resell, sublicense, or redistribute the Service without written permission</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">6. Data Ownership</h2>
            <p>
              You retain ownership of all data you upload to the Service, including chat transcripts,
              coaching context, and organization settings. We do not claim ownership of your data.
              We process your data solely to provide and improve the Service. AI-generated coaching
              feedback, scores, and reports produced by the Service are provided to you as part of your
              subscription.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">7. Data Privacy</h2>
            <p>
              Your use of the Service is also governed by our{" "}
              <a href="/privacy" className="text-emerald-400 hover:text-emerald-300 underline">
                Privacy Policy
              </a>
              , which describes how we collect, use, and protect your information.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">8. AI-Generated Content</h2>
            <p>
              The Service uses artificial intelligence to analyze transcripts and generate coaching
              feedback. AI-generated content is provided as a tool to assist managers and should not
              be treated as a substitute for professional judgment. We do not guarantee the accuracy,
              completeness, or suitability of AI-generated coaching feedback for any specific purpose.
              Managers are responsible for reviewing and validating coaching content before sharing it
              with agents.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">9. Service Availability</h2>
            <p>
              We strive to maintain high availability of the Service but do not guarantee uninterrupted
              access. The Service may be temporarily unavailable due to maintenance, updates, or
              circumstances beyond our control. We will make reasonable efforts to notify users of
              planned downtime.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">10. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, SupportCoach AI shall not be liable for any
              indirect, incidental, special, consequential, or punitive damages, including but not
              limited to loss of profits, data, or business opportunities, arising out of or related to
              your use of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">11. Cancellation</h2>
            <p>
              You may cancel your subscription at any time. Upon cancellation, your access will continue
              until the end of the current billing period. After that, your account will be downgraded
              and you will no longer have access to paid features. Your data will be retained for 30 days
              after cancellation, after which it may be permanently deleted.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">12. Refund Policy</h2>
            <p>
              Please refer to our{" "}
              <a href="/refund" className="text-emerald-400 hover:text-emerald-300 underline">
                Refund Policy
              </a>{" "}
              for details on refunds and cancellations.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">13. Changes to Terms</h2>
            <p>
              We reserve the right to modify these Terms of Service at any time. We will notify users
              of material changes via email or through the Service. Your continued use of the Service
              after changes are posted constitutes acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">14. Termination</h2>
            <p>
              We may suspend or terminate your access to the Service at any time if you violate these
              Terms of Service or engage in activity that we determine, in our sole discretion, is
              harmful to the Service or other users.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">15. Contact</h2>
            <p>
              If you have questions about these Terms of Service, please contact us at{" "}
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