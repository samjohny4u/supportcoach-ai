import type { MetadataRoute } from "next";

// Next.js serves this at /robots.txt. Allow crawling of public pages, point to the sitemap,
// and keep gated app areas out of the index.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/settings", "/upload", "/jobs", "/analysis", "/onboarding", "/select-plan"],
    },
    sitemap: "https://www.supportcoach.io/sitemap.xml",
  };
}
