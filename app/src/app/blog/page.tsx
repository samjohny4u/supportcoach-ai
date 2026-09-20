import Link from "next/link";
import { articles } from "./articles";

export const metadata = {
  title: "Blog | Support Coach AI",
  description:
    "Pre-send coaching for support teams: catching the risky reply before the customer reads it. Guides on reply quality, QA timing, and coaching live-chat agents.",
};

export default function BlogIndexPage() {
  return (
    <div className="min-h-screen bg-black text-gray-300">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-white mb-2">Blog</h1>
        <p className="text-gray-400 mb-10">
          On catching the risky support reply before the customer reads it — reply quality,
          coaching, and why timing beats review.
        </p>
        <div className="space-y-8">
          {articles.map((a) => (
            <Link
              key={a.slug}
              href={`/blog/${a.slug}`}
              className="block rounded-xl border border-gray-800 bg-gray-950 p-6 hover:border-emerald-700 transition-colors"
            >
              <h2 className="text-xl font-semibold text-white mb-2">{a.title}</h2>
              <p className="text-gray-400 text-sm leading-relaxed">{a.description}</p>
              <p className="text-emerald-500 text-sm mt-3">Read the article →</p>
            </Link>
          ))}
        </div>
        <p className="text-gray-500 text-sm mt-12">
          Support Coach coaches replies inside Zoho SalesIQ, Zendesk and Intercom — $15 per
          agent per month, 14-day free trial.{" "}
          <Link href="/extension" className="text-emerald-500 hover:underline">
            See how it works
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
