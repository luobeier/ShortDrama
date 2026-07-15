import { readFileSync } from "fs";
import path from "path";
import type { Page } from "playwright";
import type { PlatformAdapter, RawSeries } from "../types";
import { politeDelay } from "../etiquette";

// ============================================================================
// THESE WILL ROT — every pattern for goodshort.com lives here.
// Verified against the live site 2026-07-16:
//  - series pages: /drama/<slug>-<numericId>; robots.txt only disallows
//    /subscription, /results, /pay for *
//  - pages embed rich JSON-LD:
//      TVSeries        → name, image (portrait cover), description,
//                        numberOfEpisodes (the true total), genre
//      BreadcrumbList  → position-2 name is the genre ("Urban", …) fallback
//      ItemList        → VideoObjects for the FREE episodes only — NEVER use
//                        its length as the episode count (6 vs a real 24)
//  - "writeStatus":"COMPLETED" appears in the page state for finished series
//  - the visible /tags/ links are a global tag cloud, NOT this drama's tags —
//    never harvest them (they would mis-tag every series)
//  - discovery: homepage lists ~45 dramas; genre hubs (/dramas/…-playlets)
//    exist but the homepage + catalog seeds are plenty
// ============================================================================
const ORIGIN = "https://www.goodshort.com";
const DISCOVERY_PATHS = ["/"];

const PATTERNS = {
  dramaHref: /href="(\/drama\/[a-z0-9%-]+)"/g,
  jsonLd: /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
  completed: /"writeStatus"\s*:\s*"COMPLETED"/,
};

/** GoodShort alias URLs from data/catalog.json — enrich these first. */
function catalogSeedUrls(): string[] {
  try {
    const file = path.resolve(__dirname, "..", "..", "..", "data", "catalog.json");
    const rows = JSON.parse(readFileSync(file, "utf8"));
    if (!Array.isArray(rows)) return [];
    const urls: string[] = [];
    for (const r of rows) {
      for (const a of r?.aliases ?? []) {
        if (a?.platform === "GoodShort" && typeof a?.url === "string" && a.url.includes("/drama/")) {
          urls.push(a.url);
        }
      }
    }
    return urls;
  } catch {
    return [];
  }
}

interface LdNode {
  "@type"?: string;
  name?: string;
  image?: string;
  description?: string;
  numberOfEpisodes?: number;
  genre?: string;
  itemListElement?: { "@type"?: string; position?: number; name?: string }[];
}

export const goodshort: PlatformAdapter = {
  platform: "GoodShort",
  origin: ORIGIN,
  robotsProbePaths: ["/", "/drama/"],

  async discover(page: Page, limit: number): Promise<string[]> {
    const urls: string[] = [];
    const seen = new Set<string>();
    const push = (u: string) => {
      const clean = u.split("?")[0];
      if (seen.has(clean)) return;
      seen.add(clean);
      urls.push(clean);
    };

    for (const u of catalogSeedUrls()) push(u);

    for (const p of DISCOVERY_PATHS) {
      if (urls.length >= limit) break;
      if (urls.length > 0) await politeDelay();
      await page.goto(`${ORIGIN}${p}`, { waitUntil: "domcontentloaded" });
      const html = await page.content();
      for (const m of html.matchAll(PATTERNS.dramaHref)) push(`${ORIGIN}${m[1]}`);
    }
    return urls.slice(0, limit);
  },

  async parseSeries(page: Page, url: string): Promise<RawSeries | null> {
    await page.goto(url, { waitUntil: "domcontentloaded" });
    const html = await page.content();

    let series: LdNode | null = null;
    let genre: string | null = null;

    for (const m of html.matchAll(PATTERNS.jsonLd)) {
      let node: LdNode;
      try {
        node = JSON.parse(m[1]);
      } catch {
        continue;
      }
      if (node["@type"] === "TVSeries") {
        series = node;
      } else if (node["@type"] === "BreadcrumbList") {
        const second = node.itemListElement?.find((i) => i.position === 2);
        if (second?.name && second.name !== "All Dramas") genre = second.name;
      }
    }
    if (!series?.name) return null;
    if (typeof series.genre === "string" && series.genre.trim()) genre = series.genre.trim();

    return {
      title: series.name,
      url,
      // Platform marketing text, truncated — a human paraphrases it during
      // the import spot-check (flagged in the run summary).
      synopsis: (series.description ?? "").slice(0, 300),
      episodeCount:
        typeof series.numberOfEpisodes === "number" && series.numberOfEpisodes > 0
          ? series.numberOfEpisodes
          : null,
      statusHint: PATTERNS.completed.test(html) ? "complete" : null,
      genreLabels: genre ? [genre] : [],
      castNames: [],
      posterSource:
        typeof series.image === "string" && /^https?:\/\//.test(series.image) ? series.image : null,
    };
  },
};
