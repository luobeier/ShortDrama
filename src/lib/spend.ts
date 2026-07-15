// Coin-spend math, shared by the server diary loader and client-side diary
// filters. Keep this module dependency-free (no Prisma) — it's imported by
// "use client" components.

export const COIN_PER_EP = 0.15; // rough $ per episode past the free runway
export const FREE_EP_RUNWAY = 10; // first ~10 eps usually free-ish

/**
 * Episodes a user has watched of a given series.
 * finished  -> whole thing; abandoned -> where they bailed; watching -> unknown
 * progress, so it's excluded from the watched total (noted in the UI).
 */
export function episodesWatchedFor(entry: {
  status: string;
  episodeCount: number;
  abandonedAtEp: number | null;
}): number {
  if (entry.status === "finished") return entry.episodeCount;
  if (entry.status === "abandoned") return entry.abandonedAtEp ?? 0;
  return 0;
}

/** Estimated $ spend for a number of episodes watched of one series. */
export function estimatedSpendFor(episodesWatched: number): number {
  return Math.max(0, episodesWatched - FREE_EP_RUNWAY) * COIN_PER_EP;
}
