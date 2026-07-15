import type { Page } from "playwright";
import type { PlatformAdapter, RawSeries } from "../types";

// ============================================================================
// THESE WILL ROT — every pattern for reelshort.com lives here.
// Verified against the live site 2026-07-15:
//  - homepage is server-rendered and links each series via its episode-1 page:
//      /episodes/episode-1-<series-slug>-<24-hex-book-id>-<code>
//    (hrefs appear percent-encoded as /episodes/%2Fepisodes%2F…)
//  - the page embeds a Next.js __NEXT_DATA__ JSON blob; the series lives in
//    the object whose book_id matches the id in the URL, with fields
//    book_title, chapter_count, description, tag[] (genre labels).
//    NOTE: regexing the first "tag":[…] in the raw HTML is WRONG — sidebar /
//    recommendation books embed their own tag arrays. Walk the JSON instead.
// ============================================================================
const PATTERNS = {
  episodeHref: /\/episodes\/(?:%2Fepisodes%2F)?episode-1-[a-z0-9%.\-']+/gi,
  bookId: /([0-9a-f]{24})/,
  nextData: /<script id="__NEXT_DATA__" type="application\/json"[^>]*>(.*?)<\/script>/s,
};

const ORIGIN = "https://www.reelshort.com";

interface BookLike {
  book_id?: string;
  book_title?: string;
  chapter_count?: number;
  description?: string;
  /** Fuller series-level blurb (chapter `description` is episode-specific). */
  special_desc?: string;
  /** Poster/cover image on their CDN. */
  book_pic?: string;
  /** Sparse on newer titles — tag_list is the structured taxonomy. */
  tag?: unknown[];
  /** category_id 1001 = cast names; excluded from genre labels. */
  tag_list?: { category_id?: string; text?: string }[];
}

/** Depth-first walk collecting objects that look like a book record. */
function findBook(node: unknown, wantedId: string | null): BookLike | null {
  let best: BookLike | null = null;
  let bestScore = -1;
  const visit = (n: unknown) => {
    if (Array.isArray(n)) {
      for (const item of n) visit(item);
      return;
    }
    if (n === null || typeof n !== "object") return;
    const o = n as Record<string, unknown>;
    if (typeof o.book_title === "string") {
      let score = 0;
      if (wantedId && o.book_id === wantedId) score += 4;
      if (Array.isArray(o.tag)) score += 2;
      if (typeof o.chapter_count === "number") score += 1;
      if (typeof o.description === "string") score += 1;
      if (score > bestScore) {
        bestScore = score;
        best = o as BookLike;
      }
    }
    for (const v of Object.values(o)) visit(v);
  };
  visit(node);
  return best;
}

export const reelshort: PlatformAdapter = {
  platform: "ReelShort",
  origin: ORIGIN,
  robotsProbePaths: ["/", "/episodes/"],

  async discover(page: Page, limit: number): Promise<string[]> {
    // Homepage alone lists a few dozen series. Genre/browse pages can be
    // added here later if more coverage is needed.
    await page.goto(`${ORIGIN}/`, { waitUntil: "domcontentloaded" });
    const html = await page.content();

    const urls: string[] = [];
    const seenBookIds = new Set<string>();
    for (const m of html.matchAll(PATTERNS.episodeHref)) {
      const path = decodeURIComponent(m[0]).replace(/^\/episodes\/\/episodes\//, "/episodes/");
      const id = path.match(PATTERNS.bookId)?.[1];
      if (!id || seenBookIds.has(id)) continue;
      seenBookIds.add(id);
      urls.push(`${ORIGIN}${path}`);
      if (urls.length >= limit) break;
    }
    return urls;
  },

  async parseSeries(page: Page, url: string): Promise<RawSeries | null> {
    await page.goto(url, { waitUntil: "domcontentloaded" });
    const html = await page.content();

    const dataJson = html.match(PATTERNS.nextData)?.[1];
    if (!dataJson) return null;

    let book: BookLike | null = null;
    try {
      const wantedId = url.match(PATTERNS.bookId)?.[1] ?? null;
      book = findBook(JSON.parse(dataJson), wantedId);
    } catch {
      return null;
    }
    if (!book?.book_title) return null;

    // Genre labels: legacy `tag` strings + `tag_list` texts. Category 1001 is
    // the cast — split out for actor pages instead of discarding.
    const labels = new Set<string>();
    const castNames = new Set<string>();
    if (Array.isArray(book.tag_list)) {
      for (const t of book.tag_list) {
        if (!t?.text) continue;
        if (t.category_id === "1001") castNames.add(t.text);
        else labels.add(t.text);
      }
    }
    if (Array.isArray(book.tag)) {
      for (const t of book.tag) {
        if (typeof t === "string" && !castNames.has(t)) labels.add(t);
      }
    }

    const synopsis =
      (typeof book.special_desc === "string" && book.special_desc) ||
      (typeof book.description === "string" && book.description) ||
      "";

    return {
      title: book.book_title,
      url,
      // Platform marketing text, truncated — a human paraphrases it during
      // the import spot-check (flagged in the run summary).
      synopsis: synopsis.slice(0, 300),
      episodeCount: typeof book.chapter_count === "number" ? book.chapter_count : null,
      // update_status exists but is 1 even on long-complete titles — not a
      // reliable completion flag, so we don't guess.
      statusHint: null,
      genreLabels: [...labels],
      castNames: [...castNames],
      posterSource:
        typeof book.book_pic === "string" && /^https?:\/\//.test(book.book_pic)
          ? book.book_pic
          : null,
    };
  },
};
