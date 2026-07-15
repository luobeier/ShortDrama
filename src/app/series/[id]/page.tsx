import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getSeriesDetail } from "@/lib/seriesDetail";
import { getSimilarSeries } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";
import { getUserSeriesState } from "@/lib/userSeries";
import { Poster } from "@/components/Poster";
import { CoinBadge } from "@/components/CoinBadge";
import { PlatformDot } from "@/components/PlatformDot";
import { ScoreBreakdown } from "@/components/ScoreBreakdown";
import { LockedSection } from "@/components/LockedSection";
import { LogReviewFlow } from "@/components/LogReviewFlow";
import { ReviewCard } from "@/components/ReviewCard";
import { ReviewList } from "@/components/ReviewList";
import { BailHistogram } from "@/components/BailHistogram";
import { RatingBars } from "@/components/RatingBars";
import { AddToListButton } from "@/components/AddToListButton";
import { SeriesCard } from "@/components/SeriesCard";
import { prisma } from "@/lib/prisma";
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
  const [userState, similar, myLists, myVotes] = await Promise.all([
    user ? getUserSeriesState(user.id, series.id) : { log: null, review: null },
    getSimilarSeries(series.id, series.tropes.map((t) => t.slug)),
    user
      ? prisma.list.findMany({
          where: { userId: user.id },
          orderBy: { updatedAt: "desc" },
          include: { items: { where: { seriesId: series.id }, select: { id: true } } },
        })
      : Promise.resolve([]),
    user
      ? prisma.reviewVote.findMany({
          where: { voterId: user.id, review: { seriesId: series.id } },
          select: { reviewId: true },
        })
      : Promise.resolve([]),
  ]);
  const listOptions = myLists.map((l) => ({
    id: l.id,
    title: l.title,
    has: l.items.length > 0,
  }));
  const votedIds = myVotes.map((v) => v.reviewId);

  const locked = !user?.hasUnlocked;
  const band = series.score.score !== null ? scoreBand(series.score.score) : null;

  // Finishers vs bailers — the critics-vs-audience split.
  const avgOf = (rs: { stars: number }[]) =>
    rs.length ? rs.reduce((s, r) => s + r.stars, 0) / rs.length : null;
  const finisherAvg = avgOf(series.reviews.filter((r) => r.watchStatus === "finished"));
  const bailerAvg = avgOf(series.reviews.filter((r) => r.watchStatus === "abandoned"));

  // One outbound watch link per platform (first alias with a URL wins).
  const watchLinks = new Map<string, string>();
  for (const a of series.aliases) {
    if (a.url && !watchLinks.has(a.platform)) watchLinks.set(a.platform, a.url);
  }

  // Ending-verdict distribution (part of the locked payload).
  const verdictCounts = ENDING_VERDICTS.map((v) => ({
    v,
    n: series.reviews.filter((r) => r.endingVerdict === v).length,
  })).filter((x) => x.n > 0);
  const withOneLiners = series.reviews.filter((r) => r.oneLiner);

  return (
    <main className="pb-24 lg:pb-8">
      {/* Hero */}
      <div className="relative">
        <Poster
          title={series.canonicalTitle}
          posterUrl={series.posterUrl}
          showTitle={false}
          className="h-44 w-full lg:h-56"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-bg/30 to-bg" />
        <Link
          href="/"
          className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-lg backdrop-blur"
        >
          ‹
        </Link>
      </div>

      <div className="-mt-10 px-4 lg:grid lg:grid-cols-[1fr_380px] lg:gap-8">
      {/* Left column: series info */}
      <div>
        <div className="flex items-end gap-3">
          <Poster
            title={series.canonicalTitle}
            posterUrl={series.posterUrl}
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
        {watchLinks.size > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {[...watchLinks.entries()].map(([platform, url]) => (
              <a
                key={platform}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost px-3.5 py-2 text-sm"
              >
                ▶ Watch on {platform} <span className="text-ink-faint">↗</span>
              </a>
            ))}
          </div>
        )}
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

        {/* Cast */}
        {series.cast.length > 0 && (
          <div className="mt-3">
            <p className="mb-1.5 text-xs font-semibold text-ink-faint">Starring</p>
            <div className="flex flex-wrap gap-2">
              {series.cast.map((a) => (
                <Link key={a.slug} href={`/actor/${a.slug}`} className="chip text-xs">
                  🎬 {a.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Save to list */}
        <div className="mt-4">
          <AddToListButton
            seriesId={series.id}
            lists={listOptions}
            isLoggedIn={!!user}
          />
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
      </div>{/* end left column */}

      {/* Right column: score + reviews */}
      <div>
      {/* Coin Score section */}
      <section className="mt-7 lg:mt-0">
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
              <div className="mt-4 border-t border-line pt-3">
                <p className="mb-2 text-xs font-semibold text-ink-soft">Rating spread</p>
                <RatingBars stars={series.reviews.map((r) => r.stars)} />
              </div>
              {(finisherAvg !== null || bailerAvg !== null) && (
                <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  {finisherAvg !== null && (
                    <span className="text-good">
                      ✅ Finishers avg {finisherAvg.toFixed(1)}★
                    </span>
                  )}
                  {bailerAvg !== null && (
                    <span className="text-warn">
                      🏳️ Bailers avg {bailerAvg.toFixed(1)}★
                    </span>
                  )}
                </p>
              )}
              {series.realCost && (
                <p className="mt-3 rounded-xl bg-coin/10 px-3 py-2 text-xs text-coin">
                  💸 Real cost: <b>${series.realCost.avg.toFixed(2)}</b> average, reported
                  by {series.realCost.count} viewer{series.realCost.count === 1 ? "" : "s"}
                </p>
              )}
            </div>
          </LockedSection>
        )}
      </section>

      {/* Where it wobbles (locked) */}
      {series.score.hasEnoughReviews &&
        (series.score.commonAbandonEp !== null ||
          series.score.fallsApartMedianEp !== null) && (
          <section className="mt-5">
            <LockedSection locked={locked} isLoggedIn={!!user}>
              <div className="card flex flex-col gap-3 p-4">
                <h3 className="text-sm font-black">📉 Where people bail</h3>
                {series.abandonEps.length >= MIN_ABANDONS_FOR_STAT && (
                  <BailHistogram
                    abandonEps={series.abandonEps}
                    episodeCount={series.episodeCount}
                  />
                )}
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
        <section className="mt-6">
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
      <section className="mt-6">
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
            {/* Cap server-side so locked visitors never receive the full
                review payload in the page source (give-to-get integrity). */}
            <ReviewList
              reviews={locked ? series.reviews.slice(0, 4) : series.reviews}
              locked={locked}
              votedIds={votedIds}
            />
          </LockedSection>
        )}
      </section>

      {locked && withOneLiners.length > 0 && (
        <p className="mt-4 text-center text-xs text-ink-faint">
          {withOneLiners.length} one-liners and full breakdowns are waiting behind
          your first review.
        </p>
      )}
      </div>{/* end right column */}
      </div>{/* end two-col grid */}

      {/* Sticky log/review CTA (mobile) — #log opens the existing flow sheet */}
      <div className="pointer-events-none fixed inset-x-0 bottom-14 z-30 bg-gradient-to-t from-bg via-bg/80 to-transparent px-4 pb-2 pt-6 lg:hidden">
        <a
          href="#log"
          className={`${userState.review ? "btn-ghost" : "btn-coin"} pointer-events-auto w-full shadow-lg`}
        >
          {userState.review
            ? "✏️ Edit your review"
            : userState.log
              ? "★ Review it — unlock everything"
              : "🪙 Log this drama"}
        </a>
      </div>

      {/* More like this */}
      {similar.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 px-4 text-xl font-black tracking-tight">
            🍿 More like this
          </h2>
          <div className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-pl-4 px-4 pb-1 lg:grid lg:grid-cols-6 lg:gap-4 lg:overflow-visible">
            {similar.map((s) => (
              <SeriesCard
                key={s.id}
                series={s}
                className="w-[42vw] max-w-[170px] shrink-0 snap-start sm:w-[160px] lg:w-auto lg:max-w-none"
              />
            ))}
          </div>
        </section>
      )}

      <p className="px-4 pt-8 text-center text-[10px] text-ink-faint/70">
        Poster art © its respective platforms, shown small for identification only.
      </p>
    </main>
  );
}
