import { readFileSync } from "fs";
import path from "path";

// next/og's internal default-font loader builds a broken file URL on Windows
// (".\file:\C:\…noto-sans….ttf" → ERR_INVALID_URL), crashing every
// ImageResponse in local dev. Passing the same bundled TTF explicitly
// sidesteps the loader everywhere; if the file can't be read (e.g. a deploy
// bundle without node_modules), we return undefined and let the built-in
// loader handle it — which works fine on Linux.

let cached: ArrayBuffer | null | undefined;

export function ogFonts():
  | { name: string; data: ArrayBuffer; style: "normal"; weight: 400 }[]
  | undefined {
  if (cached === undefined) {
    try {
      const p = path.join(
        process.cwd(),
        "node_modules",
        "next",
        "dist",
        "compiled",
        "@vercel",
        "og",
        "noto-sans-v27-latin-regular.ttf"
      );
      const buf = readFileSync(p);
      cached = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
    } catch {
      cached = null;
    }
  }
  return cached
    ? [{ name: "sans-serif", data: cached, style: "normal", weight: 400 }]
    : undefined;
}
