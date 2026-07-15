/* eslint-disable no-console */
import { PrismaClient } from "@prisma/client";
import { PLATFORMS, LOG_STATUSES, ENDING_VERDICTS } from "../src/lib/enums";
import { titleize } from "../src/lib/slugify";
import { TROPES, SERIES, SEED_USER_EMAIL_DOMAIN } from "./seedData";

const prisma = new PrismaClient();

// --- Deterministic PRNG so seeds are reproducible ---------------------------
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260714);
const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
const pickN = <T>(arr: T[], n: number): T[] => {
  const copy = [...arr];
  const out: T[] = [];
  while (out.length < n && copy.length) {
    out.push(copy.splice(Math.floor(rand() * copy.length), 1)[0]);
  }
  return out;
};
const int = (min: number, max: number) =>
  Math.floor(rand() * (max - min + 1)) + min;
const daysAgo = (d: number) => new Date(Date.now() - d * 24 * 60 * 60 * 1000);

const ONE_LINERS = [
  "Started as a joke, finished at 3am. No regrets.",
  "The face-slapping arc alone is worth the coins.",
  "Fell apart hard in the back third but I was invested.",
  "Peak comfort trash. I mean that lovingly.",
  "Male lead had two expressions and I forgave both.",
  "Cried, screamed, immediately watched it again.",
  "The pacing is unhinged and I respect it.",
  "Abandoned it, came back, abandoned it again, finished it.",
  "Better than it has any right to be.",
  "The plot twist landed. The dialogue did not.",
  "Coins well spent. Sleep poorly lost.",
  "If you know, you know. This one's a whole meal.",
  "Second-hand embarrassment: elite. Story: solid.",
  "Watched on 2x and it was still somehow slow.",
  "The ending owed me money and never paid up.",
  "Genuinely one of the good ones. Don't @ me.",
];

async function main() {
  console.log("Resetting relational data…");
  await prisma.review.deleteMany();
  await prisma.log.deleteMany();
  await prisma.seriesTrope.deleteMany();
  await prisma.titleAlias.deleteMany();
  await prisma.series.deleteMany();
  await prisma.trope.deleteMany();
  // Only remove seeded synthetic reviewers, keep real accounts.
  await prisma.user.deleteMany({ where: { email: { endsWith: SEED_USER_EMAIL_DOMAIN } } });

  console.log("Seeding tropes…");
  const tropeRecords = await Promise.all(
    TROPES.map((slug) =>
      prisma.trope.create({ data: { slug, name: titleize(slug) } })
    )
  );
  const tropeBySlug = new Map(tropeRecords.map((t) => [t.slug, t]));

  console.log("Seeding synthetic reviewers…");
  const reviewers = [];
  for (let i = 0; i < 60; i++) {
    const handle = `${pick([
      "night",
      "coin",
      "binge",
      "trope",
      "reel",
      "drama",
      "ep",
      "cliff",
      "swoon",
      "chaos",
    ])}${pick([
      "goblin",
      "gremlin",
      "queen",
      "hoarder",
      "wraith",
      "witch",
      "baron",
      "fiend",
      "sage",
      "cat",
    ])}${int(2, 99)}`;
    const user = await prisma.user.create({
      data: {
        email: `seed_${i}${SEED_USER_EMAIL_DOMAIN}`,
        handle,
        isFoundingMember: i < 12,
        createdAt: daysAgo(int(3, 120)), // all aged past the 24h quarantine
      },
    });
    reviewers.push(user);
  }

  console.log("Seeding 30 series…");
  for (let s = 0; s < SERIES.length; s++) {
    const def = SERIES[s];
    const series = await prisma.series.create({
      data: {
        canonicalTitle: def.title,
        synopsis: def.synopsis,
        episodeCount: def.eps,
        status: def.status,
        aliases: {
          create: def.aliases.map((a) => ({
            aliasTitle: a.title,
            platform: a.platform,
            url: null,
          })),
        },
        tropeTags: {
          create: def.tropes
            .filter((slug) => tropeBySlug.has(slug))
            .map((slug) => ({ tropeId: tropeBySlug.get(slug)!.id })),
        },
      },
    });

    // Decide a "quality tier" so scores span the full range.
    // Every 4th series is a hit (Certified Binge candidate); some are duds;
    // a couple get <3 reviews to exercise the "not enough reviews" state.
    const tier =
      s % 7 === 0 ? "hit" : s % 5 === 0 ? "dud" : s % 9 === 3 ? "sparse" : "mid";

    const reviewerPool = pickN(reviewers, tier === "sparse" ? int(1, 2) : int(8, 22));

    for (let r = 0; r < reviewerPool.length; r++) {
      const user = reviewerPool[r];
      const platform = pick([...PLATFORMS]);
      // Bias status by tier.
      let status: string;
      const roll = rand();
      if (tier === "hit") status = roll < 0.72 ? "finished" : roll < 0.9 ? "watching" : "abandoned";
      else if (tier === "dud") status = roll < 0.3 ? "finished" : roll < 0.5 ? "watching" : "abandoned";
      else status = roll < 0.5 ? "finished" : roll < 0.75 ? "watching" : "abandoned";
      if (!LOG_STATUSES.includes(status as never)) status = "watching";

      const abandonedAtEp =
        status === "abandoned"
          ? Math.min(def.eps, int(6, Math.max(8, Math.floor(def.eps * 0.6))))
          : null;

      const logCreated = daysAgo(int(0, 26)); // many within the 14-day trend window
      await prisma.log.create({
        data: {
          userId: user.id,
          seriesId: series.id,
          status,
          abandonedAtEp,
          platformWatchedOn: platform,
          createdAt: logCreated,
          updatedAt: logCreated,
        },
      });

      // Most loggers (not all) leave a review.
      const leavesReview = status !== "watching" ? rand() < 0.85 : rand() < 0.4;
      if (leavesReview) {
        let stars: number;
        if (tier === "hit") stars = pick([4, 4, 5, 5, 5, 3]);
        else if (tier === "dud") stars = pick([1, 2, 2, 3, 1, 4]);
        else stars = pick([2, 3, 3, 4, 4, 5]);

        const worthCoins =
          tier === "hit" ? rand() < 0.85 : tier === "dud" ? rand() < 0.2 : rand() < 0.55;
        const endingVerdict =
          status === "abandoned"
            ? "na"
            : tier === "hit"
              ? pick(["satisfying", "satisfying", "rushed"])
              : tier === "dud"
                ? pick(["rage", "rushed", "rage"])
                : pick([...ENDING_VERDICTS]);
        const fallsApartAtEp =
          rand() < 0.5
            ? Math.min(def.eps, int(Math.floor(def.eps * 0.4), def.eps))
            : null;
        const oneLiner = rand() < 0.7 ? pick(ONE_LINERS) : null;

        await prisma.review.create({
          data: {
            userId: user.id,
            seriesId: series.id,
            stars,
            worthCoins,
            endingVerdict,
            fallsApartAtEp,
            oneLiner,
            createdAt: logCreated,
            updatedAt: logCreated,
          },
        });
      }
    }

    // Keep denormalized review_count on users roughly correct.
  }

  console.log("Recomputing user review counts…");
  const counts = await prisma.review.groupBy({
    by: ["userId"],
    _count: { _all: true },
  });
  for (const c of counts) {
    await prisma.user.update({
      where: { id: c.userId },
      data: { reviewCount: c._count._all },
    });
  }

  const seriesTotal = await prisma.series.count();
  const reviewTotal = await prisma.review.count();
  const logTotal = await prisma.log.count();
  console.log(
    `Done. ${seriesTotal} series, ${logTotal} logs, ${reviewTotal} reviews, ${reviewers.length} synthetic reviewers.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
