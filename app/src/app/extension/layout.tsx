import type { Metadata } from "next";
import type { ReactNode } from "react";

// The /extension page is a client component, so it cannot export metadata itself.
// This server-side layout supplies the route's title, description, and link-preview
// (Open Graph / Twitter) tags — including the branded OG image used by WhatsApp etc.
const title = "Support Coach AI — Real-time reply coaching for support teams";
const description =
  "A Chrome extension that catches risky support replies as your agents type and suggests a better rewrite — before the customer sees it. Works with Zendesk, Intercom & Zoho SalesIQ.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/extension" },
  openGraph: {
    title: "Support Coach AI — Real-time reply coaching",
    description:
      "Catch risky support replies before they're sent. AI coaching for Zendesk, Intercom & Zoho SalesIQ.",
    url: "https://www.supportcoach.io/extension",
    siteName: "Support Coach AI",
    type: "website",
    images: [
      {
        url: "/og-extension.png",
        width: 1200,
        height: 630,
        alt: "Support Coach AI — real-time reply coaching",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Support Coach AI — Real-time reply coaching",
    description:
      "Catch risky support replies before they're sent. AI coaching for Zendesk, Intercom & Zoho SalesIQ.",
    images: ["/og-extension.png"],
  },
};

export default function ExtensionLayout({ children }: { children: ReactNode }) {
  return children;
}
