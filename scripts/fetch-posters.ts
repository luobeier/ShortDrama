/* eslint-disable no-console */
// Poster thumbnail pipeline — download once, shrink, self-host. Never hotlink.
//
//   npm run posters            (idempotent: skips series that already have local art)
//   npm run posters -- --force (re-download everything)
//
// Sources, in priority order, matched to series by normalized title/alias:
//  1. `_posterSource` fields in data/scraped/*.json (the scraper captures them)
//  2. data/posters.json — optional manual list: [{ "title": "...", "url": "..." }]
//  3. Series whose posterUrl is currently an EXTERNAL http(s) URL (e.g. pasted
//     in the admin) — these get localized so nothing stays hotlinked.
//
// Output: public/posters/<seriesId>.webp (~360×540, quality 80, ≈25 KB) and
// posterUrl updated to the local path. Thumbnails stay small on purpose —
// identification-sized art for reviews, linking back to the platform.

import { PrismaClient } from "@prisma/client";
import sharp from "sharp";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "fs";
import path from "path";
import { normalizeTitle } from "../src/lib/importSchema";
import { USER_AGENT } from "./scrape/etiquette";

const prisma = new PrismaClient();
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "public", "posters");
const WIDTH = 360;
const HEIGHT = 540;
const DELAY_MS = 1500;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function collectFileSources(): { title: string; url: string }[] {
  const out: { title: string; url: string }[] = [];
  const scrapedDir = path.join(ROOT, "data", "scraped");
  if (existsSync(scrapedDir)) {
    for (const f of readdirSync(scrapedDir).filter((f) => f.endsWith(".json") && !f.includes("summary"))) {
      try {
        const rows = JSON.parse(readFileSync(path.join(scrapedDir, f), "utf8"));
        if (!Array.isArray(rows)) continue;
        for (const r of rows) {
          if (typeof r?.canonicalTitle === "string" && typeof r?._posterSource === "string") {
            out.push({ title: r.canonicalTitle, url: r._posterSource });
          }
        }
      } catch {
        console.log(`  (skipping unreadable ${f})`);
      }
    }
  }
  const manual = path.join(ROOT, "data", "posters.json");
  if (existsSync(manual)) {
    try {
      const rows = JSON.parse(readFileSync(manual, "utf8"));
      if (Array.isArray(rows)) {
        for (const r of rows) {
          if (typeof r?.title === "string" && typeof r?.url === "string") {
            out.push({ title: r.title, url: r.url });
          }
        }
      }
    } catch {
      console.log("  (data/posters.json unreadable — skipping)");
    }
  }
  return out;
}

async function main() {
  const force = process.argv.includes("--force");
  mkdirSync(OUT_DIR, { recursive: true });

  const series = await prisma.series.findMany({
    select: {
      id: true,
      canonicalTitle: true,
      posterUrl: true,
      aliases: { select: { aliasTitle: true } },
    },
  });

  // Title index: normalized canonical + aliases -> seriesId.
  const byTitle = new Map<string, string>();
  for (const s of series) {
    byTitle.set(normalizeTitle(s.canonicalTitle), s.id);
    for (const a of s.aliases) {
      const norm = normalizeTitle(a.aliasTitle);
      if (!byTitle.has(norm)) byTitle.set(norm, s.id);
    }
  }

  // seriesId -> source URL (first source wins).
  const sources = new Map<string, string>();
  let unmatched = 0;
  for (const { title, url } of collectFileSources()) {
    const id = byTitle.get(normalizeTitle(title));
    if (!id) {
      unmatched++;
      continue;
    }
    if (!sources.has(id)) sources.set(id, url);
  }
  // Localize admin-pasted external URLs.
  for (const s of series) {
    if (s.posterUrl && /^https?:\/\//.test(s.posterUrl) && !sources.has(s.id)) {
      sources.set(s.id, s.posterUrl);
    }
  }

  console.log(
    `${sources.size} poster source(s) matched to series` +
      (unmatched ? ` (${unmatched} scraped titles not in the catalog yet)` : "")
  );

  let done = 0;
  let skipped = 0;
  let failed = 0;
  for (const [seriesId, url] of sources) {
    const s = series.find((x) => x.id === seriesId)!;
    const outFile = path.join(OUT_DIR, `${seriesId}.webp`);
    const localPath = `/posters/${seriesId}.webp`;
    if (!force && s.posterUrl === localPath && existsSync(outFile)) {
      skipped++;
      continue;
    }
    await sleep(DELAY_MS);
    try {
      const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const type = res.headers.get("content-type") ?? "";
      if (!type.startsWith("image/")) throw new Error(`not an image (${type})`);
      const buf = Buffer.from(await res.arrayBuffer());
      const webp = await sharp(buf)
        .resize(WIDTH, HEIGHT, { fit: "cover", position: "attention" })
        .webp({ quality: 80 })
        .toBuffer();
      writeFileSync(outFile, webp);
      await prisma.series.update({
        where: { id: seriesId },
        data: { posterUrl: localPath },
      });
      done++;
      console.log(`  ✓ ${s.canonicalTitle} (${Math.round(webp.length / 1024)} KB)`);
    } catch (e) {
      failed++;
      console.log(`  ✗ ${s.canonicalTitle}: ${e instanceof Error ? e.message : e}`);
    }
  }

  console.log(
    `\nDone: ${done} downloaded, ${skipped} already local, ${failed} failed.` +
      `\nThumbnails are identification-sized and self-hosted — nothing hotlinked.` +
      (done > 0
        ? `\nCached series pages refresh within ~5 minutes (or instantly after any admin import).`
        : "")
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
