import type { MetadataRoute } from "next";
import { articles } from "./blog/articles";

// Next.js serves this at /sitemap.xml. Only public, indexable pages are listed —
// the app/dashboard routes (/, /dashboard, /login, etc.) are gated and intentionally omitted.
const BASE_URL = "https://www.supportcoach.io";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: `${BASE_URL}/extension`, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE_URL}/blog`, lastModified, changeFrequency: "weekly", priority: 0.7 },
    ...articles.map((a) => ({
      url: `${BASE_URL}/blog/${a.slug}`,
      lastModified: new Date(a.date),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    { url: `${BASE_URL}/support`, lastModified, changeFrequency: "monthly", priority: 0.4 },
    { url: `${BASE_URL}/security`, lastModified, changeFrequency: "monthly", priority: 0.4 },
    { url: `${BASE_URL}/privacy`, lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/terms`, lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/refund`, lastModified, changeFrequency: "yearly", priority: 0.2 },
  ];
}
