import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { PLATFORMS } from "@/lib/enums";
import { SITE_URL } from "@/lib/siteUrl";

// Public, crawlable content: home + series + tropes + platforms + actors.
// Per-user surfaces (diary, share) are disallowed in robots.ts instead.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [series, tropes, actors] = await Promise.all([
    prisma.series.findMany({ select: { id: true, updatedAt: true } }),
    prisma.trope.findMany({ select: { slug: true } }),
    prisma.actor.findMany({ select: { slug: true } }),
  ]);

  return [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/search`, changeFrequency: "daily", priority: 0.6 },
    ...series.map((s) => ({
      url: `${SITE_URL}/series/${s.id}`,
      lastModified: s.updatedAt,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...tropes.map((t) => ({
      url: `${SITE_URL}/trope/${t.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
    ...PLATFORMS.filter((p) => p !== "Other").map((p) => ({
      url: `${SITE_URL}/platform/${p.toLowerCase()}`,
      changeFrequency: "daily" as const,
      priority: 0.6,
    })),
    ...actors.map((a) => ({
      url: `${SITE_URL}/actor/${a.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.4,
    })),
  ];
}
