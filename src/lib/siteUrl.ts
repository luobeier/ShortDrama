// Canonical public origin for absolute URLs (sitemap, robots, OG links).
// NEXT_PUBLIC_SITE_URL wins in production; NEXTAUTH_URL is already set
// everywhere the app runs, so it's the natural fallback in dev.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.NEXTAUTH_URL ??
  "http://localhost:3000"
).replace(/\/$/, "");
