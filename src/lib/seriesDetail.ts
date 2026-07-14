import { unstable_cache } from "next/cache";
import { prisma } from "./prisma";
import { computeCoinScore, CoinScoreResult, QUARANTINE_MS } from "./score";

export interface ReviewView {
  id: string;
  stars: number;
  worthCoins: boolean;
  endingVerdict: string;
  fallsApartAtEp: number | null;
  oneLiner: string | null;
  createdAt: string;
  handle: string | null;
  isFoundingMember: boolean;
  quarantined: boolean; // account < 24h old; shown but excluded from score
}

export interface SeriesDetail {
  id: string;
  canonicalTitle: string;
  synopsis: string;
  episodeCount: number;
  status: string;
  aliases: { aliasTitle: string; platform: string; url: string | null }[];
  tropes: { name: string; slug: string }[];
  platforms: string[];
  score: CoinScoreResult;
  reviews: ReviewView[];
  totalReviewCount: number;
  logCount: number;
}

export function seriesCacheTag(id: string): string {
  return `series:${id}`;
}

async function loadSeriesDetail(id: string): Promise<SeriesDetail | null> {
  const s = await prisma.series.findUnique({
    where: { id },
    include: {
      aliases: true,
      tropeTags: { include: { trope: true } },
      logs: {
        select: {
          status: true,
          abandonedAtEp: true,
          user: { select: { createdAt: true } },
        },
      },
      reviews: {
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: { handle: true, isFoundingMember: true, createdAt: true },
          },
        },
      },
    },
  });
  if (!s) return null;

  const score = computeCoinScore(
    s.logs.map((l) => ({
      status: l.status,
      abandonedAtEp: l.abandonedAtEp,
      userCreatedAt: l.user.createdAt,
    })),
    s.reviews.map((r) => ({
      stars: r.stars,
      worthCoins: r.worthCoins,
      fallsApartAtEp: r.fallsApartAtEp,
      userCreatedAt: r.user.createdAt,
    }))
  );

  const now = Date.now();
  const reviews: ReviewView[] = s.reviews.map((r) => ({
    id: r.id,
    stars: r.stars,
    worthCoins: r.worthCoins,
    endingVerdict: r.endingVerdict,
    fallsApartAtEp: r.fallsApartAtEp,
    oneLiner: r.oneLiner,
    createdAt: r.createdAt.toISOString(),
    handle: r.user.handle,
    isFoundingMember: r.user.isFoundingMember,
    quarantined: now - r.user.createdAt.getTime() < QUARANTINE_MS,
  }));

  return {
    id: s.id,
    canonicalTitle: s.canonicalTitle,
    synopsis: s.synopsis,
    episodeCount: s.episodeCount,
    status: s.status,
    aliases: s.aliases.map((a) => ({
      aliasTitle: a.aliasTitle,
      platform: a.platform,
      url: a.url,
    })),
    tropes: s.tropeTags.map((t) => ({ name: t.trope.name, slug: t.trope.slug })),
    platforms: Array.from(new Set(s.aliases.map((a) => a.platform))),
    score,
    reviews,
    totalReviewCount: s.reviews.length,
    logCount: s.logs.length,
  };
}

/**
 * Cached public series detail. Revalidated by tag whenever a log or review on
 * this series changes (see api/log and api/review). Keeps series pages fast
 * without recomputing the Coin Score on every request.
 */
export function getSeriesDetail(id: string): Promise<SeriesDetail | null> {
  return unstable_cache(() => loadSeriesDetail(id), ["series-detail", id], {
    tags: [seriesCacheTag(id)],
    revalidate: 300,
  })();
}
