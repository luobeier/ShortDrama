# Catalog notes — data/catalog.json

Compiled 2026-07-15 by web research (five parallel researchers, one per platform).
Every title and episode count was taken from a live web source (platform site,
app-store listing, press, or fan community) — never from model memory. Synopses
are paraphrased, not copied. posterUrl is always null (project decision).

## Numbers
- 100 researched rows → **92 unique series** after cross-platform merge.
- Per-platform aliases: ReelShort 30 · DramaBox 30 · ShortMax 15 · ShortTV 10 · GoodShort 15

## Cross-platform merges (same series, two apps — both aliases kept)
- Divorced, I Married the Godfather  ←  Divorced, I married the godfather. (ShortTV)
- Back With Baby, Ex Regrets Deeply  ←  Back With Baby, Ex Regrets Deeply (ShortTV)
- Rejected at the Altar, Claimed by the Cursed Alpha  ←  Rejected at the Altar, Claimed by the Cursed Alpha (ShortTV)
- The Cleaning Lady Is CEO  ←  The Cleaning Lady Is CEO (ShortTV)
- I Helped My Husband's Brother Take the Mafia Throne  ←  I Helped My Husband's Brother Take The Mafia Throne (ShortTV)
- Falling for My Bodyguard  ←  Falling for My Bodyguard (ShortTV)
- Reborn to Marry His Uncle  ←  Reborn to Marry His Uncle (ShortTV)
- My Fiancé Humiliated Me, I Wed the War General  ←  My Fiancé Humiliated Me, I Wed the War General (ShortTV)

## Episode counts
- All episode counts were stated by a source. One fix: "Her Billionaire Father
  Spoils Her Rotten" — the researcher could not find a stated count (guessed 60),
  but the scraper read chapter_count = 75 from reelshort.com's own embedded JSON,
  so 75 is used. Its URL was also normalized to the /full-episodes/ pattern.
- "Mafia Princess Returns": series page shows 69 eps; the site's embedded JSON says
  chapter_count = 68. The visible page value (69) is used.

## ShortMax ↔ ShortTV
shortmax.com and the ShortTV app share one catalog (both serve from shorttv.live —
ShortTV is being rebranded ShortMax). Overlapping titles were merged into one series
with an alias on each platform.

## How to load
1. Spot-check ~10 rows below against the platforms (you know the catalog).
2. /admin → Import → paste the contents of data/catalog.json → **Validate**.
3. Review the preview (expect ~92 creates, 0 errors) → **Import**.
4. Danger zone → purge synthetic users + the 30 placeholder series.
