export default function RefundPage() {
  return (
    <div className="min-h-screen bg-black text-gray-300">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-white mb-2">Refund Policy</h1>
        <p className="text-gray-500 mb-10">Last updated: March 22, 2026</p>

        <div className="space-y-8 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Overview</h2>
            <p>
              SupportCoach AI is a subscription-based SaaS product billed on a per-agent, per-month
              basis. We want every customer to be satisfied with the Service. If you are not, this
              policy explains your options.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">14-Day Satisfaction Guarantee</h2>
            <p>
              If you are not satisfied with the Service within the first 14 days of your initial
              subscription, you may request a full refund. To request a refund, contact us at{" "}
              <a href="mailto:support@supportcoach.io" className="text-emerald-400 hover:text-emerald-300 underline">
                support@supportcoach.io
              </a>{" "}
              within 14 days of your first payment. Refunds will be processed within 5-10 business days
              to the original payment method.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">After 14 Days</h2>
            <p>
              After the initial 14-day period, subscriptions are non-refundable for the current billing
              period. You may cancel your subscription at any time, and your access will continue until
              the end of the current billing cycle. No partial refunds will be issued for unused time
              within a billing period.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">How to Cancel</h2>
            <p>
              You can cancel your subscription at any time through your account settings or by
              contacting us at{" "}
              <a href="mailto:support@supportcoach.io" className="text-emerald-400 hover:text-emerald-300 underline">
                support@supportcoach.io
              </a>
              . Upon cancellation:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-gray-400">
              <li>Your access continues until the end of the current billing period</li>
              <li>No further charges will be made</li>
              <li>Your data will be retained for 30 days after the billing period ends</li>
              <li>After 30 days, your data may be permanently deleted</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Downgrades</h2>
            <p>
              If you downgrade from a higher tier to a lower tier, the change will take effect at the
              start of your next billing period. You will retain access to your current tier&apos;s
              features until then. No refunds are issued for downgrades within a billing period.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Exceptions</h2>
            <p>
              We may, at our sole discretion, issue refunds outside of this policy in cases of
              significant service disruption, billing errors, or other exceptional circumstances.
              Contact us to discuss your situation.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Contact</h2>
            <p>
              For refund requests or billing questions, contact us at{" "}
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