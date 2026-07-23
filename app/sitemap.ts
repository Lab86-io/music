import type { MetadataRoute } from "next";
import { getRecentUniversalLinks } from "@/lib/universal-links";
import { CONVERSION_PAIRS } from "@/lib/seo-pairs";
import { SEO_PAGES } from "@/lib/seo-pages";

const BASE = "https://music.lab86.io";

// Regenerate hourly so newly recorded universal links get picked up
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/convert`, changeFrequency: "weekly", priority: 0.9 },
  ];

  const pairRoutes: MetadataRoute.Sitemap = [
    ...CONVERSION_PAIRS.map((pair) => ({ url: `${BASE}/${pair.slug}` })),
    ...SEO_PAGES.map((page) => ({ url: `${BASE}/${page.slug}` })),
  ].map((entry) => ({
    ...entry,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  const links = await getRecentUniversalLinks();
  const linkRoutes: MetadataRoute.Sitemap = links.map((link) => ({
    url: `${BASE}/link/${link.service}/${link.type}/${link.itemId}`,
    lastModified: link.updatedAt,
    changeFrequency: "yearly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...pairRoutes, ...linkRoutes];
}
