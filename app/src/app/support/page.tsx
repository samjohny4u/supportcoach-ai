export default function SupportPage() {
  return (
    <div className="min-h-screen bg-black text-gray-300">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-white mb-2">Customer Support</h1>
        <p className="text-gray-500 mb-10">We&apos;re here to help.</p>

        <div className="space-y-8 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Contact Us</h2>
            <p>
              If you have questions about the platform, need help with your account, or want to
              report an issue, reach out to us directly. We aim to respond within 24 hours on
              business days.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Email</h2>
            <p>
              <a
                href="mailto:support@supportcoach.io"
                className="text-emerald-400 hover:text-emerald-300 underline text-base"
              >
                support@supportcoach.io
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Business Address</h2>
            <p>
              SupportCoach AI<br />
              House No 5, Phase 3, Sree Daksha Advya<br />
              Navavoor, Coimbatore – 641046<br />
              Tamil Nadu, India
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Phone</h2>
            <p>
              <a
                href="tel:+919176183684"
                className="text-emerald-400 hover:text-emerald-300 underline text-base"
              >
                +91-9176183684
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Hours</h2>
            <p>
              Monday – Friday, 9:00 AM – 6:00 PM IST<br />
              Excluding public holidays
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Billing & Subscriptions</h2>
            <p>
              For billing questions, subscription changes, cancellations, or refund requests,
              email us at{" "}
              <a
                href="mailto:support@supportcoach.io"
                className="text-emerald-400 hover:text-emerald-300 underline"
              >
                support@supportcoach.io
              </a>
              . Please include your account email and organization name so we can assist you quickly.
            </p>
            <p className="mt-3">
              You can also review our policies:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-gray-400">
              <li>
                <a href="/terms" className="text-emerald-400 hover:text-emerald-300 underline">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="/privacy" className="text-emerald-400 hover:text-emerald-300 underline">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="/refund" className="text-emerald-400 hover:text-emerald-300 underline">
                  Refund Policy
                </a>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Bug Reports & Feature Requests</h2>
            <p>
              Found a bug or have a feature idea? Email us at{" "}
              <a
                href="mailto:support@supportcoach.io"
                className="text-emerald-400 hover:text-emerald-300 underline"
              >
                support@supportcoach.io
              </a>{" "}
              with a description of what you experienced or what you&apos;d like to see. Screenshots
              are always helpful.
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