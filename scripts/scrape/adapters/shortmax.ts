import { readFileSync } from "fs";
import path from "path";
import type { Page } from "playwright";
import type { PlatformAdapter, RawSeries } from "../types";
import { politeDelay } from "../etiquette";

// ============================================================================
// THESE WILL ROT — every pattern for shorttv.live lives here.
// Verified against the live site 2026-07-16:
//  - shorttv.live IS ShortMax (og:site_name "ShortMax"; the ShortTV app is
//    being rebranded — see data/catalog-notes.md). Platform = "ShortMax";
//    catalog seed URLs cover both old ShortTV and ShortMax aliases since
//    they share this domain.
//  - series pages: /drama/<slug>-<numericId>; robots.txt only disallows
//    /search/ for *
//  - Nuxt 3 app; __NUXT_DATA__ payload strings are obfuscated, so we parse
//    the server-rendered HTML instead:
//      title    → og:title
//      poster   → og:image (portrait cover on their akamai CDN)
//      synopsis → the first class="…desc…" container (description-clamp)
//      episodes → <span>N Episodes</span> inside class="episode-count"
//      genres   → <a href="/genres/…" class="tag">Label</a> chips
//  - discovery: /dramas (All Dramas) + homepage; each lists ~20-45 series
// ============================================================================
const ORIGIN = "https://www.shorttv.live";
const DISCOVERY_PATHS = ["/dramas", "/"];

const PATTERNS = {
  dramaHref: /href="(\/drama\/[a-z0-9%-]+)"/g,
  ogTitle: /<meta[^>]*property="og:title"[^>]*content="([^"]+)"/,
  ogImage: /<meta[^>]*property="og:image"[^>]*content="([^"]+)"/,
  episodes: /class="episode-count"[^>]*>[\s\S]{0,80}?(\d+)\s*Episodes/,
  genreChip: /href="\/genres\/[^"]+"[^>]*class="tag"[^>]*>([^<]{1,40})</g,
  descBlock: /class="[^"]*desc[^"]*"[^>]*>([\s\S]{0,900}?)<\/div>/,
};

function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

/** Strip tags/comments from an HTML fragment, collapse whitespace. */
function textOf(fragment: string): string {
  return decodeEntities(fragment.replace(/<!--[\s\S]*?-->/g, "").replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

/** shorttv.live alias URLs from data/catalog.json (ShortMax AND ShortTV). */
function catalogSeedUrls(): string[] {
  try {
    const file = path.resolve(__dirname, "..", "..", "..", "data", "catalog.json");
    const rows = JSON.parse(readFileSync(file, "utf8"));
    if (!Array.isArray(rows)) return [];
    const urls: string[] = [];
    for (const r of rows) {
      for (const a of r?.aliases ?? []) {
        if (typeof a?.url === "string" && a.url.includes("shorttv.live/drama/")) urls.push(a.url);
      }
    }
    return urls;
  } catch {
    return [];
  }
}

export const shortmax: PlatformAdapter = {
  platform: "ShortMax",
  origin: ORIGIN,
  robotsProbePaths: ["/", "/dramas", "/drama/"],

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

    const title = html.match(PATTERNS.ogTitle)?.[1];
    if (!title) return null;

    const epMatch = html.match(PATTERNS.episodes);
    const descRaw = html.match(PATTERNS.descBlock)?.[1] ?? "";
    const genreLabels = [...html.matchAll(PATTERNS.genreChip)].map((m) => textOf(m[1])).filter(Boolean);
    const ogImage = html.match(PATTERNS.ogImage)?.[1];

    return {
      title: decodeEntities(title),
      url,
      // Platform marketing text, truncated — a human paraphrases it during
      // the import spot-check (flagged in the run summary).
      synopsis: textOf(descRaw).slice(0, 300),
      episodeCount: epMatch ? Number(epMatch[1]) : null,
      // No reliable completion flag in the served HTML — we don't guess.
      statusHint: null,
      genreLabels: [...new Set(genreLabels)],
      castNames: [],
      posterSource:
        ogImage && /^https?:\/\//.test(ogImage) ? decodeEntities(ogImage).split("?")[0] : null,
    };
  },
};
