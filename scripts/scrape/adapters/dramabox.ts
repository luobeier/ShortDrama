import { readFileSync } from "fs";
import path from "path";
import type { Page } from "playwright";
import type { PlatformAdapter, RawSeries } from "../types";
import { politeDelay } from "../etiquette";

// ============================================================================
// THESE WILL ROT — every pattern for dramaboxapp.com lives here.
// Verified against the live site 2026-07-16:
//  - series pages: /film/<numeric bookId>; robots.txt allows them (only
//    /search?*, /download?*, /uc?*, /renewal?*, /product?* are disallowed)
//  - pages are server-rendered Next.js; __NEXT_DATA__ → props.pageProps
//    .bookInfo with bookName, chapterCount, introduction, labels/tags,
//    typeTwoNames (taxonomy), performerList (cast)
//  - bookInfo.cover is EMPTY server-side, but the CDN cover URL is
//    deterministic from the bookId (pattern observed on recommend cards):
//      https://thwztchapter.dramaboxdb.com/data/cppartner/
//        <id0>x<id1>/<id0..1>x<id2>/<id0..2>x<id3>/<id>/<id>.jpg@w=480
//  - discovery surfaces are all small (~12–21 series each): homepage,
//    /browse, /more/trending, /more/must-sees, /more/hidden-gems. The
//    catalog's existing DramaBox alias URLs are seeded first so already-known
//    series get enriched (posters + cast) before new discoveries fill up
//    the --limit.
// ============================================================================
const ORIGIN = "https://www.dramaboxapp.com";
const DISCOVERY_PATHS = ["/", "/browse", "/more/trending", "/more/must-sees", "/more/hidden-gems"];

const PATTERNS = {
  filmHref: /\/film\/(\d{5,})/g,
  nextData: /<script id="__NEXT_DATA__" type="application\/json"[^>]*>(.*?)<\/script>/s,
};

function derivedCoverUrl(bookId: string): string | null {
  if (!/^\d{5,}$/.test(bookId)) return null;
  const seg = `${bookId.slice(0, 1)}x${bookId.slice(1, 2)}/${bookId.slice(0, 2)}x${bookId.slice(2, 3)}/${bookId.slice(0, 3)}x${bookId.slice(3, 4)}`;
  return `https://thwztchapter.dramaboxdb.com/data/cppartner/${seg}/${bookId}/${bookId}.jpg@w=480`;
}

/** Existing DramaBox alias URLs from data/catalog.json — enrich these first. */
function catalogSeedUrls(): string[] {
  try {
    const file = path.resolve(__dirname, "..", "..", "..", "data", "catalog.json");
    const rows = JSON.parse(readFileSync(file, "utf8"));
    if (!Array.isArray(rows)) return [];
    const urls: string[] = [];
    for (const r of rows) {
      for (const a of r?.aliases ?? []) {
        if (a?.platform === "DramaBox" && typeof a?.url === "string" && a.url.includes("/film/")) {
          urls.push(a.url);
        }
      }
    }
    return urls;
  } catch {
    return [];
  }
}

interface BookInfo {
  bookId?: string;
  bookName?: string;
  cover?: string;
  chapterCount?: number;
  introduction?: string;
  labels?: unknown[];
  tags?: unknown[];
  typeTwoNames?: unknown[];
  performerList?: { performerName?: string }[];
}

export const dramabox: PlatformAdapter = {
  platform: "DramaBox",
  origin: ORIGIN,
  robotsProbePaths: ["/", "/browse", "/more/", "/film/"],

  async discover(page: Page, limit: number): Promise<string[]> {
    const urls: string[] = [];
    const seenIds = new Set<string>();
    const push = (id: string) => {
      if (seenIds.has(id)) return;
      seenIds.add(id);
      urls.push(`${ORIGIN}/film/${id}`);
    };

    // Known catalog series first: enrichment beats discovery when limited.
    for (const u of catalogSeedUrls()) {
      const id = u.match(/\/film\/(\d{5,})/)?.[1];
      if (id) push(id);
    }

    for (const p of DISCOVERY_PATHS) {
      if (urls.length >= limit) break;
      if (urls.length > 0) await politeDelay(); // not the first navigation of the run
      await page.goto(`${ORIGIN}${p}`, { waitUntil: "domcontentloaded" });
      const html = await page.content();
      for (const m of html.matchAll(PATTERNS.filmHref)) push(m[1]);
    }
    return urls.slice(0, limit);
  },

  async parseSeries(page: Page, url: string): Promise<RawSeries | null> {
    await page.goto(url, { waitUntil: "domcontentloaded" });
    const html = await page.content();

    const dataJson = html.match(PATTERNS.nextData)?.[1];
    if (!dataJson) return null;

    let book: BookInfo | null = null;
    try {
      book = JSON.parse(dataJson)?.props?.pageProps?.bookInfo ?? null;
    } catch {
      return null;
    }
    if (!book?.bookName) return null;

    // labels + tags + typeTwoNames all carry taxonomy; mapGenres dedupes.
    const labels = new Set<string>();
    for (const arr of [book.labels, book.tags, book.typeTwoNames]) {
      if (!Array.isArray(arr)) continue;
      for (const t of arr) if (typeof t === "string" && t.trim()) labels.add(t.trim());
    }

    const castNames: string[] = [];
    if (Array.isArray(book.performerList)) {
      for (const p of book.performerList) {
        if (typeof p?.performerName === "string" && p.performerName.trim()) {
          castNames.push(p.performerName.trim());
        }
      }
    }

    const bookId = book.bookId ?? url.match(/\/film\/(\d{5,})/)?.[1] ?? "";
    const posterSource =
      (typeof book.cover === "string" && /^https?:\/\//.test(book.cover) && book.cover) ||
      derivedCoverUrl(bookId);

    return {
      title: book.bookName,
      url: `${ORIGIN}/film/${bookId}`,
      // Platform marketing text, truncated — a human paraphrases it during
      // the import spot-check (flagged in the run summary).
      synopsis: (typeof book.introduction === "string" ? book.introduction : "").slice(0, 300),
      episodeCount: typeof book.chapterCount === "number" && book.chapterCount > 0 ? book.chapterCount : null,
      // No reliable completion flag exposed server-side — we don't guess.
      statusHint: null,
      genreLabels: [...labels],
      castNames,
      posterSource,
    };
  },
};
