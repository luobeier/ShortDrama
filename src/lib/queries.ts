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
      user: { select: { createdAt: true } },
    },
  },
  reviews: {
    select: {
      stars: true,
      worthCoins: true,
      fallsApartAtEp: true,
      user: { select: { createdAt: true } },
    },
  },
} as const;

type WithScoreData = {
  logs: { status: string; abandonedAtEp: number | null; user: { createdAt: Date } }[];
  reviews: {
    stars: number;
    worthCoins: boolean;
    fallsApartAtEp: number | null;
    user: { createdAt: Date };
  }[];
};

export function scoreFor(data: WithScoreData): CoinScoreResult {
  return computeCoinScore(
    data.logs.map((l) => ({
      status: l.status,
      abandonedAtEp: l.abandonedAtEp,
      userCreatedAt: l.user.createdAt,
    })),
    data.reviews.map((r) => ({
      stars: r.stars,
      worthCoins: r.worthCoins,
      fallsApartAtEp: r.fallsApartAtEp,
      userCreatedAt: r.user.createdAt,
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

/** Search canonical titles AND aliases. */
export async function searchSeries(q: string): Promise<SeriesCardData[]> {
  const query = q.trim();
  if (!query) return [];
  const series = await prisma.series.findMany({
    where: {
      OR: [
        { canonicalTitle: { contains: query } },
        { aliases: { some: { aliasTitle: { contains: query } } } },
      ],
    },
    include: cardInclude,
    take: 40,
  });
  return series.map(toCard);
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
