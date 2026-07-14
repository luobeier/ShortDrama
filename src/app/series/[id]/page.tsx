import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getSeriesDetail } from "@/lib/seriesDetail";
import { getCurrentUser } from "@/lib/session";
import { getUserSeriesState } from "@/lib/userSeries";
import { Poster } from "@/components/Poster";
import { CoinBadge } from "@/components/CoinBadge";
import { PlatformDot } from "@/components/PlatformDot";
import { ScoreBreakdown } from "@/components/ScoreBreakdown";
import { LockedSection } from "@/components/LockedSection";
import { LogReviewFlow } from "@/components/LogReviewFlow";
import { ReviewCard } from "@/components/ReviewCard";
import { scoreBand, MIN_ABANDONS_FOR_STAT } from "@/lib/score";
import {
  ENDING_VERDICTS,
  ENDING_VERDICT_EMOJI,
  ENDING_VERDICT_LABELS,
} from "@/lib/enums";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const series = await getSeriesDetail(id);
  if (!series) return { title: "Not found — DramaScore" };
  return {
    title: `${series.canonicalTitle} — DramaScore`,
    description: series.synopsis,
  };
}

export default async function SeriesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const series = await getSeriesDetail(id);
  if (!series) notFound();

  const user = await getCurrentUser();
  const userState = user
    ? await getUserSeriesState(user.id, series.id)
    : { log: null, review: null };

  const locked = !user?.hasUnlocked;
  const band = series.score.score !== null ? scoreBand(series.score.score) : null;

  // Ending-verdict distribution (part of the locked payload).
  const verdictCounts = ENDING_VERDICTS.map((v) => ({
    v,
    n: series.reviews.filter((r) => r.endingVerdict === v).length,
  })).filter((x) => x.n > 0);
  const withOneLiners = series.reviews.filter((r) => r.oneLiner);

  return (
    <main className="pb-8">
      {/* Hero */}
      <div className="relative">
        <Poster
          title={series.canonicalTitle}
          showTitle={false}
          className="h-44 w-full"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-bg/30 to-bg" />
        <Link
          href="/"
          className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-lg backdrop-blur"
        >
          ‹
        </Link>
      </div>

      <div className="-mt-10 px-4">
        <div className="flex items-end gap-3">
          <Poster
            title={series.canonicalTitle}
            showTitle={false}
            className="h-28 w-20 shrink-0 rounded-xl border border-line shadow-lg"
          />
          <div className="pb-1">
            <CoinBadge
              score={series.score.score}
              size="lg"
              certified={series.score.certifiedBinge}
            />
          </div>
        </div>

        <h1 className="mt-3 text-2xl font-black leading-tight">
          {series.canonicalTitle}
        </h1>

        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-ink-soft">
          <span>{series.episodeCount} episodes</span>
          <span className="opacity-40">•</span>
          <span className={series.status === "ongoing" ? "text-good" : "text-ink-soft"}>
            {series.status === "ongoing" ? "Ongoing" : "Complete"}
          </span>
          {band && (
            <>
              <span className="opacity-40">•</span>
              <span className="font-semibold text-ink">{band.label}</span>
            </>
          )}
        </div>

        {/* Platforms + aliases */}
        <div className="mt-3 flex flex-wrap gap-2">
          {series.platforms.map((p) => (
            <PlatformDot key={p} platform={p} withLabel />
          ))}
        </div>
        {series.aliases.length > 0 && (
          <p className="mt-2 text-xs leading-relaxed text-ink-faint">
            {series.aliases.map((a, i) => (
              <span key={i}>
                also known as{" "}
                <span className="text-ink-soft">“{a.aliasTitle}”</span> on {a.platform}
                {i < series.aliases.length - 1 ? " · " : ""}
              </span>
            ))}
          </p>
        )}

        {/* Synopsis */}
        <p className="mt-4 text-sm leading-relaxed text-ink-soft">
          {series.synopsis}
        </p>

        {/* Tropes */}
        <div className="mt-3 flex flex-wrap gap-2">
          {series.tropes.map((t) => (
            <Link key={t.slug} href={`/trope/${t.slug}`} className="chip">
              {t.name}
            </Link>
          ))}
        </div>

        {/* Log / review CTA */}
        <div className="mt-5">
          <LogReviewFlow
            seriesId={series.id}
            title={series.canonicalTitle}
            episodeCount={series.episodeCount}
            platforms={series.platforms}
            isLoggedIn={!!user}
            existingLog={userState.log}
            existingReview={userState.review}
          />
          {user && !user.hasUnlocked && (
            <p className="mt-2 text-center text-xs text-coin">
              Your first review unlocks all the spoilery good stuff. 🔓
            </p>
          )}
        </div>
      </div>

      {/* Coin Score section */}
      <section className="mt-7 px-4">
        <h2 className="mb-2 text-lg font-black">🪙 Coin Score</h2>
        {!series.score.hasEnoughReviews ? (
          <div className="card p-5 text-center">
            <p className="text-sm font-semibold text-ink">
              Not enough reviews yet — be the first
            </p>
            <p className="mt-1 text-xs text-ink-soft">
              {series.score.eligibleReviewCount} of 3 reviews needed to compute a score.
            </p>
          </div>
        ) : (
          <LockedSection locked={locked} isLoggedIn={!!user}>
            <div className="card p-4">
              <div className="mb-4 flex items-center gap-3">
                <CoinBadge score={series.score.score} size="md" certified={series.score.certifiedBinge} />
                <div>
                  <p className="text-sm font-bold text-ink">{band?.label}</p>
                  <p className="text-xs text-ink-faint">
                    From {series.score.eligibleReviewCount} counted reviews
                    {series.score.certifiedBinge ? " · 🏆 Certified Binge" : ""}
                  </p>
                </div>
              </div>
              <ScoreBreakdown score={series.score} />
            </div>
          </LockedSection>
        )}
      </section>

      {/* Where it wobbles (locked) */}
      {series.score.hasEnoughReviews &&
        (series.score.commonAbandonEp !== null ||
          series.score.fallsApartMedianEp !== null) && (
          <section className="mt-5 px-4">
            <LockedSection locked={locked} isLoggedIn={!!user}>
              <div className="card flex flex-col gap-3 p-4">
                <h3 className="text-sm font-black">📉 Where people bail</h3>
                {series.score.commonAbandonEp !== null && (
                  <p className="text-sm text-ink-soft">
                    Most common abandonment point:{" "}
                    <span className="font-bold text-warn">
                      ep {series.score.commonAbandonEp}
                    </span>{" "}
                    <span className="text-ink-faint">
                      (from {series.score.abandonedCount} people who tapped out)
                    </span>
                  </p>
                )}
                {series.score.fallsApartMedianEp !== null && (
                  <p className="text-sm text-ink-soft">
                    Reviewers say it falls apart around{" "}
                    <span className="font-bold text-warn">
                      ep {series.score.fallsApartMedianEp}
                    </span>
                    .
                  </p>
                )}
                {verdictCounts.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-xs font-semibold text-ink">Ending verdicts</p>
                    <div className="flex flex-wrap gap-2">
                      {verdictCounts.map(({ v, n }) => (
                        <span key={v} className="rounded-full bg-bg-elevated px-2.5 py-1 text-xs text-ink-soft">
                          {ENDING_VERDICT_EMOJI[v]} {ENDING_VERDICT_LABELS[v]} · {n}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </LockedSection>
          </section>
        )}

      {/* Your review (always visible if you wrote one) */}
      {userState.review && user && (
        <section className="mt-6 px-4">
          <h2 className="mb-2 text-lg font-black">Your review</h2>
          <ReviewCard
            review={{
              id: "me",
              stars: userState.review.stars,
              worthCoins: userState.review.worthCoins,
              endingVerdict: userState.review.endingVerdict,
              fallsApartAtEp: userState.review.fallsApartAtEp,
              oneLiner: userState.review.oneLiner,
              createdAt: new Date().toISOString(),
              handle: user.handle,
              isFoundingMember: user.isFoundingMember,
              quarantined: false,
            }}
            isMine
          />
        </section>
      )}

      {/* Community reviews (locked list) */}
      <section className="mt-6 px-4">
        <h2 className="mb-2 text-lg font-black">
          Reviews{" "}
          <span className="text-sm font-normal text-ink-faint">
            ({series.totalReviewCount})
          </span>
        </h2>
        {series.reviews.length === 0 ? (
          <div className="card p-5 text-center text-sm text-ink-soft">
            No reviews yet. Be the first to call it.
          </div>
        ) : (
          <LockedSection locked={locked} isLoggedIn={!!user}>
            <div className="flex flex-col gap-2.5">
              {(locked ? series.reviews.slice(0, 4) : series.reviews).map((r) => (
                <ReviewCard key={r.id} review={r} isMine={false} />
              ))}
            </div>
          </LockedSection>
        )}
      </section>

      {locked && withOneLiners.length > 0 && (
        <p className="mt-4 px-4 text-center text-xs text-ink-faint">
          {withOneLiners.length} one-liners and full breakdowns are waiting behind
          your first review.
        </p>
      )}
    </main>
  );
}
