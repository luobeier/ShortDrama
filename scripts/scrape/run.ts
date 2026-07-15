/* eslint-disable no-console */
// Catalog scraper — MANUAL RUNS ONLY, never CI/build. Selectors WILL rot;
// each adapter keeps its patterns at the top of its file.
//
//   npm run scrape -- reelshort --limit 50
//
// Output: data/scraped/<platform>.json  — a paste-ready ImportSeriesRow[]
//         data/scraped/<platform>.summary.json — failures + unmapped genres
//
// Etiquette (enforced in code, see etiquette.ts): honest bot UA, fail-closed
// robots.txt check before the browser launches, ≥2s+jitter between pages,
// image/media/font requests blocked. Metadata only — never video URLs, never
// poster downloads (posterUrl stays null; the platform link goes on the alias).

import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { USER_AGENT, checkRobots, politeDelay } from "./etiquette";
import { mapGenres } from "./tropeMap";
import { normalizeTitle } from "../../src/lib/importSchema";
import type { PlatformAdapter, RunSummary, ScrapedRow } from "./types";
import { reelshort } from "./adapters/reelshort";

const ADAPTERS: Record<string, PlatformAdapter> = {
  reelshort,
  // dramabox / shortmax / goodshort / shorttv: add an adapter file and list it here.
};

async function main() {
  const args = process.argv.slice(2);
  const name = args.find((a) => !a.startsWith("--"))?.toLowerCase();
  const limitIdx = args.indexOf("--limit");
  const limit = limitIdx >= 0 ? Math.max(1, Number(args[limitIdx + 1]) || 50) : 50;

  const adapter = name ? ADAPTERS[name] : undefined;
  if (!adapter) {
    console.error(`Usage: npm run scrape -- <${Object.keys(ADAPTERS).join("|")}> [--limit N]`);
    process.exit(1);
  }

  console.log(`Scraping ${adapter.platform} (limit ${limit})…`);

  // Robots first — this throws (aborting the run) if any path is disallowed.
  const delayFloor = await checkRobots(adapter.origin, adapter.robotsProbePaths);
  console.log("robots.txt: allowed ✓");

  const browser = await chromium.launch();
  const context = await browser.newContext({ userAgent: USER_AGENT });
  // Metadata only, and bandwidth-polite: never fetch media.
  await context.route("**/*", (route) => {
    const type = route.request().resourceType();
    if (type === "image" || type === "media" || type === "font") return route.abort();
    return route.continue();
  });
  const page = await context.newPage();

  const summary: RunSummary = {
    platform: adapter.platform,
    fetchedAt: new Date().toISOString(),
    pagesVisited: 0,
    ok: 0,
    failed: [],
    unmappedGenreCounts: {},
  };

  let urls: string[] = [];
  try {
    urls = await adapter.discover(page, limit);
    summary.pagesVisited++;
    console.log(`discovered ${urls.length} series URLs`);

    const rows: ScrapedRow[] = [];
    const seenTitles = new Set<string>();

    for (const url of urls) {
      await politeDelay(delayFloor);
      try {
        const raw = await adapter.parseSeries(page, url);
        summary.pagesVisited++;
        if (!raw) {
          summary.failed.push({ url, error: "not a parseable series page" });
          continue;
        }
        const norm = normalizeTitle(raw.title);
        if (seenTitles.has(norm)) continue;
        seenTitles.add(norm);

        const { slugs, unmapped } = mapGenres(raw.genreLabels);
        for (const g of unmapped) {
          summary.unmappedGenreCounts[g] = (summary.unmappedGenreCounts[g] ?? 0) + 1;
        }

        rows.push({
          canonicalTitle: raw.title,
          synopsis: raw.synopsis,
          // Omitted when unknown → the importer errors that row on create,
          // surfacing it for a manual fix instead of writing a guess.
          episodeCount: raw.episodeCount ?? undefined,
          status: raw.statusHint ?? "ongoing",
          aliases: [{ aliasTitle: raw.title, platform: adapter.platform, url: raw.url }],
          tropes: slugs,
          ...(raw.castNames.length ? { actors: raw.castNames.slice(0, 12) } : {}),
          // Ignored by the importer; consumed by `npm run posters`.
          ...(raw.posterSource ? { _posterSource: raw.posterSource } : {}),
          ...(unmapped.length ? { _unmappedGenres: unmapped } : {}),
        });
        summary.ok++;
        console.log(`  ✓ ${raw.title} (${raw.episodeCount ?? "?"} eps, ${slugs.length} tropes)`);
      } catch (e) {
        summary.failed.push({ url, error: e instanceof Error ? e.message : String(e) });
        console.log(`  ✗ ${url}`);
      }
    }

    const outDir = path.resolve(__dirname, "..", "..", "data", "scraped");
    mkdirSync(outDir, { recursive: true });
    const base = adapter.platform.toLowerCase();
    writeFileSync(path.join(outDir, `${base}.json`), JSON.stringify(rows, null, 2));
    writeFileSync(path.join(outDir, `${base}.summary.json`), JSON.stringify(summary, null, 2));

    console.log(
      `\nDone: ${summary.ok} rows → data/scraped/${base}.json (${summary.failed.length} failed)`
    );
    console.log(
      "Synopses are the platform's own text — paraphrase during the import spot-check.\n" +
        "Next: paste the file into /admin → Import → Validate. Committing stays a human decision."
    );
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
