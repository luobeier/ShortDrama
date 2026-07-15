/* eslint-disable no-console */
// One-shot PWA icon generation: rasterizes src/app/icon.svg at the sizes the
// manifest and iOS need. Uses Playwright's Chromium (already a devDependency)
// rather than sharp — Chromium renders the SVG's <text> glyph reliably on
// Windows. Outputs are committed; re-run only when the icon changes.
//
//   npm run icons          (prereq once: npx playwright install chromium)

import { chromium } from "playwright";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const SVG = readFileSync(path.join(ROOT, "src", "app", "icon.svg"), "utf8");

interface Target {
  out: string;
  size: number;
  /** Padding per side, as a fraction of the canvas (safe zone for maskable). */
  pad: number;
  /** null = transparent background. */
  background: string | null;
}

const TARGETS: Target[] = [
  { out: "public/icons/icon-192.png", size: 192, pad: 0, background: null },
  { out: "public/icons/icon-512.png", size: 512, pad: 0, background: null },
  // 12% padding puts the (circular) coin at 76% width — inside the 80%
  // safe circle that maskable icons must survive.
  { out: "public/icons/icon-maskable-512.png", size: 512, pad: 0.12, background: "#0a0a0f" },
  // App Router convention file: Next auto-emits the apple-touch-icon link.
  { out: "src/app/apple-icon.png", size: 180, pad: 0.1, background: "#0a0a0f" },
];

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 1 });

  for (const t of TARGETS) {
    const padPx = Math.round(t.size * t.pad);
    await page.setViewportSize({ width: t.size, height: t.size });
    await page.setContent(
      `<body style="margin:0;width:${t.size}px;height:${t.size}px;background:${
        t.background ?? "transparent"
      }">
        <div style="position:fixed;inset:${padPx}px">
          ${SVG.replace("<svg ", '<svg style="width:100%;height:100%;display:block" ')}
        </div>
      </body>`
    );
    const buf = await page.screenshot({
      type: "png",
      omitBackground: t.background === null,
    });
    const outPath = path.join(ROOT, t.out);
    mkdirSync(path.dirname(outPath), { recursive: true });
    writeFileSync(outPath, buf);
    console.log(`✓ ${t.out} (${t.size}×${t.size}, pad ${padPx}px, ${t.background ?? "transparent"})`);
  }

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
