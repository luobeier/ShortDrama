// The Coin Score — the heart of DramaScore.
//
// Displayed 0–100, computed per series from reviews + logs:
//   Completion (40%): finished / (finished + abandoned)
//   Stars      (35%): average stars normalized to 0–100
//   Worth-it   (25%): % of reviews with worth_coins = true
//
// Integrity: reviews/logs from accounts younger than 24h are silently
// quarantined — accepted and shown, but excluded from the score — so fresh
// throwaway accounts can't move the number.

import { LogStatus } from "./enums";

export const QUARANTINE_MS = 24 * 60 * 60 * 1000;
export const MIN_REVIEWS_FOR_SCORE = 3;
export const CERTIFIED_BINGE_MIN_SCORE = 80;
export const CERTIFIED_BINGE_MIN_REVIEWS = 10;
export const MIN_ABANDONS_FOR_STAT = 3;

const WEIGHTS = { completion: 0.4, stars: 0.35, worth: 0.25 };

// Bayesian shrinkage: with few reviews, the displayed score is pulled toward a
// neutral prior so three enthusiastic friends can't print a 95 that outranks a
// 50-review 85. Equivalent to adding SHRINKAGE_WEIGHT phantom reviews at
// SHRINKAGE_PRIOR. At 3 reviews the raw score carries 3/8 of the weight; by
// ~20 reviews shrinkage is negligible. Breakdown bars stay raw — they explain
// the inputs; only the headline coin is confidence-adjusted.
export const SHRINKAGE_WEIGHT = 5;
export const SHRINKAGE_PRIOR = 0.6;

export interface ScoreLogInput {
  status: LogStatus | string;
  abandonedAtEp: number | null;
  userCreatedAt: Date;
  userBannedAt?: Date | null;
}

export interface ScoreReviewInput {
  stars: number;
  worthCoins: boolean;
  fallsApartAtEp: number | null;
  userCreatedAt: Date;
  userBannedAt?: Date | null;
}

export interface CoinScoreResult {
  /** Final 0–100 integer, or null when there isn't enough eligible data. */
  score: number | null;
  hasEnoughReviews: boolean;
  eligibleReviewCount: number;
  totalReviewCount: number;
  certifiedBinge: boolean;
  breakdown: {
    completion: number | null; // 0..100
    stars: number | null; // 0..100
    worth: number | null; // 0..100
  };
  avgStars: number | null;
  worthPct: number | null; // 0..100
  finishedCount: number;
  abandonedCount: number;
  /** Median abandonment episode, when ≥3 eligible abandons exist. */
  commonAbandonEp: number | null;
  /** Median "falls apart at" episode across reviews that supplied one. */
  fallsApartMedianEp: number | null;
}

function median(nums: number[]): number | null {
  if (nums.length === 0) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function isEligible(
  userCreatedAt: Date,
  now: number,
  bannedAt?: Date | null
): boolean {
  if (bannedAt) return false;
  return now - userCreatedAt.getTime() >= QUARANTINE_MS;
}

export function computeCoinScore(
  logs: ScoreLogInput[],
  reviews: ScoreReviewInput[],
  now: number = Date.now()
): CoinScoreResult {
  const eligibleLogs = logs.filter((l) =>
    isEligible(l.userCreatedAt, now, l.userBannedAt)
  );
  const eligibleReviews = reviews.filter((r) =>
    isEligible(r.userCreatedAt, now, r.userBannedAt)
  );

  const finishedCount = eligibleLogs.filter((l) => l.status === "finished").length;
  const abandonedCount = eligibleLogs.filter(
    (l) => l.status === "abandoned"
  ).length;

  // Completion component (may be absent if nobody has finished/abandoned yet).
  const completionDenom = finishedCount + abandonedCount;
  const completion =
    completionDenom > 0 ? finishedCount / completionDenom : null;

  // Stars + worth-it components (from eligible reviews).
  const avgStars =
    eligibleReviews.length > 0
      ? eligibleReviews.reduce((s, r) => s + r.stars, 0) /
        eligibleReviews.length
      : null;
  const starsNorm = avgStars !== null ? (avgStars - 1) / 4 : null; // 1..5 -> 0..1

  const worthTrue = eligibleReviews.filter((r) => r.worthCoins).length;
  const worth =
    eligibleReviews.length > 0 ? worthTrue / eligibleReviews.length : null;

  // Weighted blend, renormalized over whichever components have data.
  const parts: Array<[number, number]> = []; // [value 0..1, weight]
  if (completion !== null) parts.push([completion, WEIGHTS.completion]);
  if (starsNorm !== null) parts.push([starsNorm, WEIGHTS.stars]);
  if (worth !== null) parts.push([worth, WEIGHTS.worth]);

  const totalWeight = parts.reduce((s, [, w]) => s + w, 0);
  const rawScore =
    totalWeight > 0
      ? parts.reduce((s, [v, w]) => s + v * w, 0) / totalWeight
      : null;

  const hasEnoughReviews = eligibleReviews.length >= MIN_REVIEWS_FOR_SCORE;
  const n = eligibleReviews.length;
  const shrunkScore =
    rawScore !== null
      ? (n * rawScore + SHRINKAGE_WEIGHT * SHRINKAGE_PRIOR) / (n + SHRINKAGE_WEIGHT)
      : null;
  const score =
    hasEnoughReviews && shrunkScore !== null ? Math.round(shrunkScore * 100) : null;

  const certifiedBinge =
    score !== null &&
    score >= CERTIFIED_BINGE_MIN_SCORE &&
    eligibleReviews.length >= CERTIFIED_BINGE_MIN_REVIEWS;

  const abandonEps = eligibleLogs
    .filter((l) => l.status === "abandoned" && l.abandonedAtEp != null)
    .map((l) => l.abandonedAtEp as number);
  const commonAbandonEp =
    abandonEps.length >= MIN_ABANDONS_FOR_STAT ? median(abandonEps) : null;

  const fallsApartEps = eligibleReviews
    .filter((r) => r.fallsApartAtEp != null)
    .map((r) => r.fallsApartAtEp as number);
  const fallsApartMedianEp = median(fallsApartEps);

  return {
    score,
    hasEnoughReviews,
    eligibleReviewCount: eligibleReviews.length,
    totalReviewCount: reviews.length,
    certifiedBinge,
    breakdown: {
      completion: completion !== null ? Math.round(completion * 100) : null,
      stars: starsNorm !== null ? Math.round(starsNorm * 100) : null,
      worth: worth !== null ? Math.round(worth * 100) : null,
    },
    avgStars,
    worthPct: worth !== null ? Math.round(worth * 100) : null,
    finishedCount,
    abandonedCount,
    commonAbandonEp,
    fallsApartMedianEp,
  };
}

/** Copy for the coin badge based on the score band. */
export function scoreBand(score: number): {
  label: string;
  tone: "great" | "good" | "mid" | "rough";
} {
  if (score >= 80) return { label: "Certified Binge", tone: "great" };
  if (score >= 60) return { label: "Worth the coins", tone: "good" };
  if (score >= 40) return { label: "Proceed with caution", tone: "mid" };
  return { label: "Coin trap", tone: "rough" };
}
