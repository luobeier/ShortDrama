import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/siteUrl";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Private/per-user or non-content surfaces.
      disallow: ["/admin", "/api/", "/diary", "/onboarding", "/signin", "/share", "/offline"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
