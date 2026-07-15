import { prisma } from "./prisma";
import { computeCoinScore, CoinScoreResult } from "./score";

/** Shape used by cards across the app. */
export interface SeriesCardData {
  id: string;
  canonicalTitle: string;
  episodeCount: number;
  status: string;
  synopsis: string;
  tropes: { name: string; slug: string }[];
  platforms: string[];
  score: CoinScoreResult;
  recentLogCount?: number;
}

const scoreSelect = {
  logs: {
    select: {
      status: true,
      abandonedAtEp: true,
      user: { select: { createdAt: true, bannedAt: true } },
    },
  },
  reviews: {
    select: {
      stars: true,
      worthCoins: true,
      fallsApartAtEp: true,
      user: { select: { createdAt: true, bannedAt: true } },
    },
  },
} as const;

type WithScoreData = {
  logs: {
    status: string;
    abandonedAtEp: number | null;
    user: { createdAt: Date; bannedAt: Date | null };
  }[];
  reviews: {
    stars: number;
    worthCoins: boolean;
    fallsApartAtEp: number | null;
    user: { createdAt: Date; bannedAt: Date | null };
  }[];
};

export function scoreFor(data: WithScoreData): CoinScoreResult {
  return computeCoinScore(
    data.logs.map((l) => ({
      status: l.status,
      abandonedAtEp: l.abandonedAtEp,
      userCreatedAt: l.user.createdAt,
      userBannedAt: l.user.bannedAt,
    })),
    data.reviews.map((r) => ({
      stars: r.stars,
      worthCoins: r.worthCoins,
      fallsApartAtEp: r.fallsApartAtEp,
      userCreatedAt: r.user.createdAt,
      userBannedAt: r.user.bannedAt,
    }))
  );
}

function toCard(s: {
  id: string;
  canonicalTitle: string;
  episodeCount: number;
  status: string;
  synopsis: string;
  tropeTags: { trope: { name: string; slug: string } }[];
  aliases: { platform: string }[];
} & WithScoreData): SeriesCardData {
  const platforms = Array.from(new Set(s.aliases.map((a) => a.platform)));
  return {
    id: s.id,
    canonicalTitle: s.canonicalTitle,
    episodeCount: s.episodeCount,
    status: s.status,
    synopsis: s.synopsis,
    tropes: s.tropeTags.map((t) => t.trope),
    platforms,
    score: scoreFor(s),
  };
}

const cardInclude = {
  tropeTags: { include: { trope: true } },
  aliases: { select: { platform: true } },
  ...scoreSelect,
} as const;

/** Trending: most logs created in the last 14 days. */
export async function getTrending(limit = 12): Promise<SeriesCardData[]> {
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const grouped = await prisma.log.groupBy({
    by: ["seriesId"],
    where: { createdAt: { gte: since } },
    _count: { _all: true },
    orderBy: { _count: { seriesId: "desc" } },
    take: limit,
  });
  const ids = grouped.map((g) => g.seriesId);
  if (ids.length === 0) return [];
  const series = await prisma.series.findMany({
    where: { id: { in: ids } },
    include: cardInclude,
  });
  const countById = new Map(grouped.map((g) => [g.seriesId, g._count._all]));
  return series
    .map((s) => ({ ...toCard(s), recentLogCount: countById.get(s.id) ?? 0 }))
    .sort((a, b) => (b.recentLogCount ?? 0) - (a.recentLogCount ?? 0));
}

/** Top Certified Binge list (score ≥80 & ≥10 reviews), highest first. */
export async function getCertifiedBinge(limit = 10): Promise<SeriesCardData[]> {
  const series = await prisma.series.findMany({ include: cardInclude });
  return series
    .map(toCard)
    .filter((s) => s.score.certifiedBinge)
    .sort((a, b) => (b.score.score ?? 0) - (a.score.score ?? 0))
    .slice(0, limit);
}

/** Fold accents + case so "fiance" matches "Fiancé" (SQLite LIKE can't). */
function foldText(s: string): string {
  // Strip combining diacritics (U+0300–U+036F) after NFD decomposition.
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/**
 * Search canonical titles AND aliases, accent- and case-insensitively.
 * The catalog is small (hundreds of titles), so we match folded strings in
 * memory rather than maintaining a normalized shadow column.
 */
export async function searchSeries(q: string): Promise<SeriesCardData[]> {
  const query = foldText(q.trim());
  if (!query) return [];

  const titles = await prisma.series.findMany({
    select: {
      id: true,
      canonicalTitle: true,
      aliases: { select: { aliasTitle: true } },
    },
  });

  // Rank: exact > prefix > substring, canonical matches before alias-only.
  const ranked = titles
    .map((s) => {
      const names = [s.canonicalTitle, ...s.aliases.map((a) => a.aliasTitle)];
      let best = Infinity;
      names.forEach((name, i) => {
        const folded = foldText(name);
        const isAlias = i > 0 ? 1 : 0;
        if (folded === query) best = Math.min(best, 0 + isAlias);
        else if (folded.startsWith(query)) best = Math.min(best, 2 + isAlias);
        else if (folded.includes(query)) best = Math.min(best, 4 + isAlias);
      });
      return { id: s.id, rank: best };
    })
    .filter((s) => s.rank !== Infinity)
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 40);
  if (ranked.length === 0) return [];

  const series = await prisma.series.findMany({
    where: { id: { in: ranked.map((r) => r.id) } },
    include: cardInclude,
  });
  const order = new Map(ranked.map((r, i) => [r.id, i]));
  return series
    .map(toCard)
    .sort((a, b) => (order.get(a.id) ?? 99) - (order.get(b.id) ?? 99));
}

export async function getSeriesByTrope(slug: string): Promise<{
  trope: { name: string; slug: string } | null;
  series: SeriesCardData[];
}> {
  const trope = await prisma.trope.findUnique({ where: { slug } });
  if (!trope) return { trope: null, series: [] };
  const series = await prisma.series.findMany({
    where: { tropeTags: { some: { tropeId: trope.id } } },
    include: cardInclude,
  });
  return {
    trope: { name: trope.name, slug: trope.slug },
    series: series
      .map(toCard)
      .sort((a, b) => (b.score.score ?? -1) - (a.score.score ?? -1)),
  };
}

export async function getAllTropesWithCounts(): Promise<
  { name: string; slug: string; count: number }[]
> {
  const tropes = await prisma.trope.findMany({
    include: { _count: { select: { series: true } } },
    orderBy: { name: "asc" },
  });
  return tropes.map((t) => ({
    name: t.name,
    slug: t.slug,
    count: t._count.series,
  }));
}

/** All series ids for static generation. */
export async function getAllSeriesIds(): Promise<string[]> {
  const rows = await prisma.series.findMany({ select: { id: true } });
  return rows.map((r) => r.id);
}

/**
 * "More like this": series sharing tropes, ranked by overlap then score.
 * Candidates are capped before scoring to keep the page cheap.
 */
export async function getSimilarSeries(
  seriesId: string,
  tropeSlugs: string[],
  limit = 6
): Promise<SeriesCardData[]> {
  if (tropeSlugs.length === 0) return [];
  const candidates = await prisma.series.findMany({
    where: {
      id: { not: seriesId },
      tropeTags: { some: { trope: { slug: { in: tropeSlugs } } } },
    },
    include: cardInclude,
    take: 24,
  });
  const wanted = new Set(tropeSlugs);
  return candidates
    .map((s) => {
      const card = toCard(s);
      const overlap = card.tropes.filter((t) => wanted.has(t.slug)).length;
      return { card, overlap };
    })
    .sort(
      (a, b) =>
        b.overlap - a.overlap ||
        (b.card.score.score ?? -1) - (a.card.score.score ?? -1)
    )
    .slice(0, limit)
    .map((x) => x.card);
}

/** The signed-in user's planned + watching series, for the home rail. */
export async function getWatchRail(
  userId: string,
  limit = 12
): Promise<(SeriesCardData & { myStatus: string })[]> {
  const logs = await prisma.log.findMany({
    where: { userId, status: { in: ["planned", "watching"] } },
    orderBy: { updatedAt: "desc" },
    take: limit,
    include: { series: { include: cardInclude } },
  });
  return logs.map((l) => ({ ...toCard(l.series), myStatus: l.status }));
}

/** Platform leaderboard: everything watchable on one app, best first. */
export async function getSeriesByPlatform(platform: string): Promise<SeriesCardData[]> {
  const series = await prisma.series.findMany({
    where: { aliases: { some: { platform } } },
    include: cardInclude,
  });
  return series
    .map(toCard)
    .sort((a, b) => (b.score.score ?? -1) - (a.score.score ?? -1));
}

/** An actor + every series they appear in, best first. */
export async function getActorWithSeries(slug: string): Promise<{
  actor: { name: string; slug: string } | null;
  series: SeriesCardData[];
}> {
  const actor = await prisma.actor.findUnique({ where: { slug } });
  if (!actor) return { actor: null, series: [] };
  const series = await prisma.series.findMany({
    where: { cast: { some: { actorId: actor.id } } },
    include: cardInclude,
  });
  return {
    actor: { name: actor.name, slug: actor.slug },
    series: series
      .map(toCard)
      .sort((a, b) => (b.score.score ?? -1) - (a.score.score ?? -1)),
  };
}

/** Lightweight counts for the home hero's social-proof strip. */
export async function getSiteStats(): Promise<{
  series: number;
  reviews: number;
  logs: number;
}> {
  const [series, reviews, logs] = await Promise.all([
    prisma.series.count(),
    prisma.review.count(),
    prisma.log.count(),
  ]);
  return { series, reviews, logs };
}
