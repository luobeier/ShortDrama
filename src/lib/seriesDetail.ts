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
  /** The reviewer's log outcome on this series (finished/abandoned/watching). */
  watchStatus?: string | null;
  bailedAtEp?: number | null;
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
  /** Eligible abandons' bail episodes — feeds the bail histogram. */
  abandonEps: number[];
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
          userId: true,
          status: true,
          abandonedAtEp: true,
          user: { select: { createdAt: true, bannedAt: true } },
        },
      },
      reviews: {
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              handle: true,
              isFoundingMember: true,
              createdAt: true,
              bannedAt: true,
            },
          },
        },
      },
    },
  });
  if (!s) return null;

  // Banned users' activity is hidden entirely (and ineligible for the score).
  const logs = s.logs.filter((l) => !l.user.bannedAt);
  const visibleReviews = s.reviews.filter((r) => !r.user.bannedAt);

  const score = computeCoinScore(
    logs.map((l) => ({
      status: l.status,
      abandonedAtEp: l.abandonedAtEp,
      userCreatedAt: l.user.createdAt,
      userBannedAt: l.user.bannedAt,
    })),
    visibleReviews.map((r) => ({
      stars: r.stars,
      worthCoins: r.worthCoins,
      fallsApartAtEp: r.fallsApartAtEp,
      userCreatedAt: r.user.createdAt,
      userBannedAt: r.user.bannedAt,
    }))
  );

  const now = Date.now();
  const logByUser = new Map(logs.map((l) => [l.userId, l]));
  const reviews: ReviewView[] = visibleReviews.map((r) => {
    const log = logByUser.get(r.userId);
    return {
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
      watchStatus: log?.status ?? null,
      bailedAtEp: log?.status === "abandoned" ? (log.abandonedAtEp ?? null) : null,
    };
  });

  // Bail distribution from eligible (aged, unbanned) abandons only, matching
  // the median stat's eligibility rules.
  const abandonEps = logs
    .filter(
      (l) =>
        l.status === "abandoned" &&
        l.abandonedAtEp != null &&
        now - l.user.createdAt.getTime() >= QUARANTINE_MS
    )
    .map((l) => l.abandonedAtEp as number);

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
    totalReviewCount: visibleReviews.length,
    logCount: logs.length,
    abandonEps,
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
