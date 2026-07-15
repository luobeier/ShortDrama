import Link from "next/link";
import { Logo } from "@/components/Header";
import { SearchBar } from "@/components/SearchBar";
import { SeriesCard } from "@/components/SeriesCard";
import { CoinBadge } from "@/components/CoinBadge";
import { Poster } from "@/components/Poster";
import {
  getTrending,
  getCertifiedBinge,
  getAllTropesWithCounts,
  getSiteStats,
} from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";

// Home reflects live logs/reviews; keep it fresh but cache briefly.
export const revalidate = 60;

function SectionHeader({
  emoji,
  title,
  subtitle,
  href,
  linkLabel,
}: {
  emoji: string;
  title: string;
  subtitle?: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3 px-4">
      <div>
        <h2 className="text-xl font-black tracking-tight">
          {emoji} {title}
        </h2>
        {subtitle && <p className="mt-0.5 text-xs text-ink-faint">{subtitle}</p>}
      </div>
      {href && (
        <Link href={href} className="shrink-0 pb-0.5 text-xs font-semibold text-brand">
          {linkLabel} ›
        </Link>
      )}
    </div>
  );
}

const HOW_IT_WORKS = [
  {
    title: "Log what you watched",
    body: "Finished it, bailed at ep 34, or still going — 2 taps.",
  },
  {
    title: "Drop one review",
    body: "Stars, worth-your-coins, where it falls apart. 30 seconds.",
  },
  {
    title: "Everything unlocks",
    body: "Ending verdicts, bail points, full breakdowns — forever.",
  },
];

export default async function HomePage() {
  const [trending, certified, tropes, stats, user] = await Promise.all([
    getTrending(12),
    getCertifiedBinge(8),
    getAllTropesWithCounts(),
    getSiteStats(),
    getCurrentUser(),
  ]);
  const topTropes = [...tropes].sort((a, b) => b.count - a.count);

  return (
    <main className="pb-10">
      {/* Sticky glassy header */}
      <header className="sticky top-0 z-30 border-b border-line/60 bg-bg/85 backdrop-blur-md">
        <div className="flex items-center justify-between px-4 py-3">
          <Logo />
          {user ? (
            <Link
              href={user.handle ? `/u/${user.handle}` : "/onboarding"}
              className="chip text-xs"
            >
              @{user.handle ?? "set handle"}
            </Link>
          ) : (
            <Link href="/signin" className="btn-primary px-4 py-1.5 text-sm">
              Sign in
            </Link>
          )}
        </div>
      </header>

      {/* Hero */}
      <div className="px-4 pt-6 lg:pt-10">
        <h1 className="max-w-2xl text-3xl font-black leading-[1.1] tracking-tight lg:text-5xl">
          Is it worth your{" "}
          <span className="bg-gradient-to-br from-coin via-coin-deep to-coin-shadow bg-clip-text text-transparent">
            coins
          </span>
          ?
        </h1>
        <p className="mt-2 max-w-xl text-sm text-ink-soft lg:text-base">
          Real logs from people who binged it first. Find the bangers, dodge the
          coin traps.
        </p>
      </div>

      <div className="mt-4 max-w-2xl">
        <SearchBar />
      </div>

      <p className="mt-3 flex gap-4 px-4 text-xs text-ink-faint">
        <span>
          <b className="font-bold text-ink-soft">{stats.series.toLocaleString()}</b> series
        </span>
        <span>
          <b className="font-bold text-ink-soft">{stats.reviews.toLocaleString()}</b> reviews
        </span>
        <span>
          <b className="font-bold text-ink-soft">{stats.logs.toLocaleString()}</b> binges logged
        </span>
      </p>

      {/* Onboarding: logged-out gets how-it-works; locked accounts get the nudge */}
      {!user ? (
        <ol className="mt-6 grid gap-2 px-4 sm:grid-cols-3 lg:gap-3">
          {HOW_IT_WORKS.map((step, i) => (
            <li key={step.title} className="card flex items-start gap-3 p-3.5">
              <span
                className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black text-black"
                style={{
                  background:
                    "radial-gradient(circle at 35% 30%, #ffe08a, #f5a623 65%, #d98c0f)",
                  boxShadow: "0 2px 0 0 #8a5a00",
                }}
              >
                {i + 1}
              </span>
              <div>
                <p className="text-sm font-bold">{step.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        !user.hasUnlocked && (
          <Link href="/search" className="mx-4 mt-6 block">
            <div className="card flex items-center gap-3 border-brand/40 bg-brand/10 p-3.5">
              <span className="text-2xl">🔓</span>
              <div className="flex-1">
                <p className="text-sm font-bold text-ink">
                  Review any drama to unlock everything
                </p>
                <p className="text-xs text-ink-soft">
                  Ending verdicts, bail points, full breakdowns — one review opens it all.
                </p>
              </div>
              <span className="text-ink-faint">›</span>
            </div>
          </Link>
        )
      )}

      {/* Trending: snap rail on mobile, grid on desktop */}
      <section className="mt-9">
        <SectionHeader
          emoji="🔥"
          title="Trending this week"
          subtitle="Most logged in the last 14 days"
          href="/search"
          linkLabel="Browse all"
        />
        {trending.length === 0 ? (
          <p className="px-4 py-6 text-sm text-ink-soft">Nothing logged yet — be the first.</p>
        ) : (
          <div className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-pl-4 px-4 pb-1 lg:grid lg:grid-cols-6 lg:gap-4 lg:overflow-visible">
            {trending.map((s) => (
              <SeriesCard
                key={s.id}
                series={s}
                className="w-[42vw] max-w-[170px] shrink-0 snap-start sm:w-[160px] lg:w-auto lg:max-w-none"
              />
            ))}
          </div>
        )}
      </section>

      {/* Certified Binge — the money list, promoted above tropes */}
      <section className="mt-9">
        <SectionHeader
          emoji="🏆"
          title="Certified Binge"
          subtitle="Score ≥ 80 with 10+ reviews — the ones people actually finish"
        />
        {certified.length === 0 ? (
          <p className="px-4 text-sm text-ink-soft">
            No certified bingers yet. Log and review to crown the first.
          </p>
        ) : (
          <ol className="grid gap-2 px-4 lg:grid-cols-2 lg:gap-3">
            {certified.map((s, i) => (
              <li key={s.id}>
                <Link
                  href={`/series/${s.id}`}
                  className="card flex items-center gap-3 p-2.5 transition-colors hover:border-coin/50"
                >
                  <span
                    className={`w-7 shrink-0 text-center text-xl font-black tabular-nums ${
                      i < 3 ? "text-coin" : "text-ink-faint"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <Poster
                    title={s.canonicalTitle}
                    showTitle={false}
                    className="h-14 w-10 shrink-0 rounded-lg"
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-bold">{s.canonicalTitle}</h3>
                    <p className="truncate text-xs text-ink-faint">
                      {s.episodeCount} eps ·{" "}
                      {s.tropes.map((t) => t.name).slice(0, 2).join(" · ")}
                    </p>
                  </div>
                  <CoinBadge score={s.score.score} size="sm" />
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* Browse by trope: 2-row rail on mobile, wrapped cloud on desktop */}
      <section className="mt-9">
        <SectionHeader emoji="🏷️" title="Browse by trope" />
        <div className="no-scrollbar grid grid-flow-col grid-rows-2 gap-2 overflow-x-auto px-4 pb-1 lg:flex lg:flex-wrap lg:overflow-visible">
          {topTropes.map((t) => (
            <Link key={t.slug} href={`/trope/${t.slug}`} className="chip justify-self-start">
              {t.name}
              {t.count > 0 && <span className="text-ink-faint">{t.count}</span>}
            </Link>
          ))}
        </div>
      </section>

      <p className="px-4 pt-10 text-center text-xs text-ink-faint">
        DramaScore · logged by night owls, for night owls 🌙
      </p>
    </main>
  );
}
