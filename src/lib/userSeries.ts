import { prisma } from "./prisma";
import type { LogStatus, EndingVerdict } from "./enums";

/** The current user's own log + review for a series (for prefill + edit). */
export async function getUserSeriesState(userId: string, seriesId: string) {
  const [log, review] = await Promise.all([
    prisma.log.findUnique({
      where: { userId_seriesId: { userId, seriesId } },
      select: {
        status: true,
        platformWatchedOn: true,
        abandonedAtEp: true,
        currentEp: true,
      },
    }),
    prisma.review.findUnique({
      where: { userId_seriesId: { userId, seriesId } },
      select: {
        stars: true,
        worthCoins: true,
        endingVerdict: true,
        fallsApartAtEp: true,
        oneLiner: true,
        coinsSpent: true,
      },
    }),
  ]);
  return {
    log: log
      ? {
          status: log.status as LogStatus,
          platformWatchedOn: log.platformWatchedOn,
          abandonedAtEp: log.abandonedAtEp,
          currentEp: log.currentEp,
        }
      : null,
    review: review
      ? {
          stars: review.stars,
          worthCoins: review.worthCoins,
          endingVerdict: review.endingVerdict as EndingVerdict,
          fallsApartAtEp: review.fallsApartAtEp,
          oneLiner: review.oneLiner,
          coinsSpent: review.coinsSpent,
        }
      : null,
  };
}
