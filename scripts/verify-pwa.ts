/* eslint-disable no-console */
// PWA verification against the prod server on localhost:3000.
import { chromium } from "playwright";

const BASE = "http://localhost:3000";

async function main() {
  // 1) manifest served and complete
  const mres = await fetch(`${BASE}/manifest.webmanifest`);
  const manifest = await mres.json();
  console.log(
    `manifest: ${mres.status} | display=${manifest.display} | icons=${manifest.icons?.length} | theme=${manifest.theme_color}`
  );

  // 2) head tags present
  const html = await (await fetch(BASE)).text();
  console.log("link rel=manifest:", html.includes('rel="manifest"'));
  console.log("apple-touch-icon:", html.includes("apple-icon"));
  console.log(
    "apple-mobile-web-app-capable:",
    html.includes("apple-mobile-web-app-capable") || html.includes("mobile-web-app-capable")
  );

  // 3) SW registers, controls the page, populates the cache
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: "load" });
  const swState = await page.evaluate(async () => {
    if (!("serviceWorker" in navigator)) return "unsupported";
    const reg = await navigator.serviceWorker.ready;
    return reg.active?.state ?? "none";
  });
  console.log("service worker:", swState);
  // Reload so the SW controls the page and static assets flow through it.
  await page.reload({ waitUntil: "load" });
  const cacheInfo = await page.evaluate(async () => {
    const keys = await caches.keys();
    const cache = await caches.open(keys[0] ?? "none");
    const entries = (await cache.keys()).map((r) => new URL(r.url).pathname);
    return { keys, precached: entries.filter((p) => !p.startsWith("/_next")).sort(), total: entries.length };
  });
  console.log("caches:", cacheInfo.keys, "| precached:", cacheInfo.precached.join(", "), `| total entries: ${cacheInfo.total}`);

  // 4) offline navigation falls back to /offline
  await context.setOffline(true);
  await page.goto(`${BASE}/diary`, { waitUntil: "commit" }).catch(() => {});
  await page.waitForTimeout(500);
  const offlineText = await page.textContent("body").catch(() => "");
  console.log("offline fallback shows:", /offline/i.test(offlineText ?? "") ? "✓ offline page" : `✗ (${(offlineText ?? "").slice(0, 80)})`);
  await context.setOffline(false);

  // 5) back online works
  await page.goto(`${BASE}/`, { waitUntil: "load" });
  console.log("back online title:", await page.title());

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
