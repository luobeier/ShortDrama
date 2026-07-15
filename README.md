# DramaScore 🪙

A community review + tracking platform for short vertical dramas (ReelShort,
DramaBox, ShortMax, GoodShort, ShortTV). _Glassdoor meets Letterboxd for
micro-dramas._ Mobile-first, dark-by-default, built for people who binge at 2am.

**Is it worth your coins?** Log what you watch, warn people where it falls
apart, and see the Coin Score before you spend.

## Stack

- **Next.js 15** (App Router) + **TypeScript** + **Tailwind CSS**
- **SQLite via Prisma** (easy to start; schema is Postgres-portable)
- **NextAuth** (JWT sessions) — Google OAuth + a passwordless email dev login
- **`next/og`** for the 1080×1920 share card (Satori under the hood)

## Getting started

```bash
npm install
cp .env.example .env          # sensible dev defaults are already filled in
npm run db:push               # create the SQLite schema
npm run db:seed               # 30 series + tropes + synthetic reviews/logs
npm run dev                   # http://localhost:3000
```

To wipe and reseed: `npm run db:reset`.

### Growing the catalog (scrape → import → posters)

```bash
npm run scrape -- reelshort --limit 50   # also: dramabox, shortmax, goodshort
npm run import -- data/scraped/reelshort.json                      # dry-run preview
npm run import -- data/scraped/reelshort.json --preserve synopsis --commit
npm run posters                          # localize covers as 360×540 WebP thumbnails
```

The scraper (manual runs only — honest bot UA, fail-closed robots.txt check,
≥2s between pages, metadata only) writes importer-ready rows to
`data/scraped/<platform>.json`. `npm run import` is the CLI twin of the admin
Import tab: dry-run by default, `--preserve synopsis` keeps curated text on
series that already exist, `--fields x,y` restores specific columns from a
file. `npm run posters` is idempotent and never hotlinks.

### Signing in (no external services required)

Out of the box, `ENABLE_DEV_LOGIN=true` turns on a **passwordless email login**:
type any email and you're in — no SMTP, no inbox check. This stands in for the
production magic-link flow so the whole app is usable immediately.

- **Google OAuth** switches on automatically when `GOOGLE_CLIENT_ID` and
  `GOOGLE_CLIENT_SECRET` are set.
- Turn the dev login off in production with `ENABLE_DEV_LOGIN=false`.
- **Admin**: set `ADMIN_EMAILS` (comma-separated) to unlock `/admin`. It's
  pre-set to your email in the committed `.env` for convenience.

After first sign-in you pick a **handle** — the only name shown anywhere. No
real names, ever.

## What's built (all 7 screens)

1. **Home** — search (canonical **and** alias titles), trending grid (most logs
   in the last 14 days), browse-by-trope chips, top Certified Binge list.
2. **Series page** — platforms + aliases ("also known as … on DramaBox"),
   synopsis, tropes, episode count, the Coin Score badge with full breakdown,
   "where people bail" stats, and the gated review list.
3. **Log + review flow** — a 2-tap bottom-sheet: status → platform →
   abandoned-at-ep (if abandoned), then the optional review (stars, worth-it
   toggle, ending verdict, falls-apart-at, one-liner). Under 30 seconds.
4. **My diary** — everything logged, filterable by status/trope, with personal
   stats: series finished, episodes watched, estimated spend, top trope.
5. **Wrapped share card** — generates a 1080×1920 PNG from your diary with
   download + native share.
6. **Public profile** (`/u/[handle]`) — review count, founding-member badge,
   recent reviews.
7. **Admin** (`/admin`, env-flagged) — add/edit series, add aliases, manage
   tropes, and **merge two series** (reassigns aliases + logs + reviews +
   tropes, de-duplicates, keeps the old title as an alias).

## The Coin Score

Displayed 0–100, computed per series (`src/lib/score.ts`):

- **Completion (40%)** — finished / (finished + abandoned)
- **Stars (35%)** — average stars normalized to 0–100
- **Worth-it (25%)** — % of reviews marking "worth your coins"

Shown only with **≥3 counted reviews** (otherwise: _"Not enough reviews yet —
be the first"_). **🏆 Certified Binge** at score ≥80 with ≥10 reviews. When ≥3
people abandon, we show the **median abandonment episode**.

## Integrity (v1)

- A **review requires a log** on that series — enforced server-side.
- **Silent quarantine**: reviews/logs from accounts <24h old are accepted and
  displayed but **excluded from the Coin Score** until the account ages.
- **Rate limit**: max 10 _new_ reviews/day/user (edits don't count).
- **One review per user per series**, editable.

## Notable decisions (you asked me to make them and note them)

1. **Auth.** The spec said "magic link _or_ Google OAuth." To keep the app
   fully working with zero external config, the default is a passwordless
   **dev email login** (JWT sessions, no adapter). Google OAuth is wired and
   turns on with env vars. A real SMTP magic-link provider can be added later
   (it needs the Prisma adapter + `VerificationToken` table); I left it off so
   nothing depends on an email server to run.
2. **Static generation vs. per-user gating.** Series pages are personalized
   (the give-to-get gate depends on _your_ review count), which forces dynamic
   rendering. To still be fast + "revalidated on new reviews," the expensive
   public payload (Coin Score, review list) is wrapped in `unstable_cache` with
   a per-series **cache tag**, and `revalidateTag` fires whenever a log/review
   on that series changes. Best of both.
3. **Posters.** Never hotlinked. `npm run posters` downloads each platform
   cover **once**, shrinks it to a 360×540 WebP thumbnail in
   `public/posters/`, and points `posterUrl` at the local file (identification-
   sized art; Watch buttons link back to the platform). Series without a
   poster source render a **deterministic gradient card** (hash of the title
   → consistent colors + initials).
4. **Episodes watched / estimated spend.** Finished = full episode count;
   abandoned = the bail episode; **in-progress ("watching") contributes 0** to
   the watched total (we don't track per-episode progress) — noted in the UI.
   Estimated spend = Σ `max(0, episodesWatched − 10) × $0.15`, labeled
   "estimated" everywhere it appears.
5. **Score component fallback.** If a series has no finished/abandoned logs yet,
   the completion component is dropped and the remaining weights are
   **renormalized** rather than tanking the score to zero.
6. **Founding member.** The first 500 accounts get the 🌟 badge automatically.
7. **Seed realism.** Beyond the 30 required series, the seed creates 60
   synthetic (aged) reviewers and ~350 reviews / ~440 logs across quality tiers
   so Coin Scores span the full range, some series hit Certified Binge, a few
   are deliberately left with <3 reviews to show the empty state, and trending
   has real signal. All synthetic accounts use `@seed.dramascore.app` emails so
   `db:seed` can re-run without touching real users.

## Project layout

```
prisma/
  schema.prisma        # data model (SQLite)
  seed.ts              # tropes, 30 series, synthetic activity
src/
  app/                 # routes (home, series, diary, share, u, admin, api/*)
  components/          # UI (CoinBadge, LogReviewFlow, LockedSection, …)
  lib/
    score.ts           # the Coin Score + quarantine
    seriesDetail.ts    # cached, tag-revalidated series payload
    queries.ts         # trending / certified / search / trope
    diary.ts           # personal stats
    auth.ts session.ts # NextAuth + server-side user/gate helpers
```
