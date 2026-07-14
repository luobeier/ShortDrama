import Link from "next/link";
import { Logo } from "@/components/Header";
import { SearchBar } from "@/components/SearchBar";
import { SeriesCard } from "@/components/SeriesCard";
import { TropeRail } from "@/components/TropeRail";
import { CoinBadge } from "@/components/CoinBadge";
import { Poster } from "@/components/Poster";
import {
  getTrending,
  getCertifiedBinge,
  getAllTropesWithCounts,
} from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";

// Home reflects live logs/reviews; keep it fresh but cache briefly.
export const revalidate = 60;

export default async function HomePage() {
  const [trending, certified, tropes, user] = await Promise.all([
    getTrending(12),
    getCertifiedBinge(8),
    getAllTropesWithCounts(),
    getCurrentUser(),
  ]);

  return (
    <main className="pb-6">
      <header className="flex items-center justify-between px-4 pt-4">
        <Logo />
        {user ? (
          <Link href={user.handle ? `/u/${user.handle}` : "/onboarding"} className="text-sm text-ink-soft">
            @{user.handle ?? "set handle"}
          </Link>
        ) : (
          <Link href="/signin" className="btn-ghost px-3 py-1.5 text-sm">
            Sign in
          </Link>
        )}
      </header>

      <div className="px-4 pb-1 pt-4">
        <h1 className="text-[26px] font-black leading-tight tracking-tight">
          Is it worth your coins?
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Real logs from people who binged it first. Find the bangers, dodge the coin traps.
        </p>
      </div>

      <div className="pt-3">
        <SearchBar />
      </div>

      {!user?.hasUnlocked && (
        <Link href="/signin" className="mx-4 mt-4 block">
          <div className="card flex items-center gap-3 border-brand/40 bg-brand/10 p-3.5">
            <span className="text-2xl">🔓</span>
            <div className="flex-1">
              <p className="text-sm font-bold text-ink">Review any drama to unlock everything</p>
              <p className="text-xs text-ink-soft">
                Ending verdicts, where shows fall apart, full breakdowns — one review opens it all.
              </p>
            </div>
            <span className="text-ink-faint">›</span>
          </div>
        </Link>
      )}

      {/* Trending */}
      <section className="mt-6">
        <div className="flex items-center justify-between px-4">
          <h2 className="text-lg font-black">🔥 Trending this week</h2>
          <Link href="/search" className="text-xs text-ink-faint">
            browse all
          </Link>
        </div>
        <p className="px-4 text-xs text-ink-faint">Most logged in the last 14 days</p>
        {trending.length === 0 ? (
          <p className="px-4 py-6 text-sm text-ink-soft">Nothing logged yet — be the first.</p>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-3 px-4">
            {trending.map((s) => (
              <SeriesCard key={s.id} series={s} />
            ))}
          </div>
        )}
      </section>

      {/* Browse by trope */}
      <section className="mt-8">
        <h2 className="px-4 pb-2 text-lg font-black">🏷️ Browse by trope</h2>
        <TropeRail tropes={tropes} />
      </section>

      {/* Certified Binge */}
      <section className="mt-8">
        <h2 className="px-4 pb-1 text-lg font-black">🏆 Certified Binge</h2>
        <p className="px-4 pb-3 text-xs text-ink-faint">
          Score ≥ 80 with 10+ reviews. The ones people actually finish.
        </p>
        {certified.length === 0 ? (
          <p className="px-4 text-sm text-ink-soft">
            No certified bingers yet. Log and review to crown the first.
          </p>
        ) : (
          <ol className="flex flex-col gap-2 px-4">
            {certified.map((s, i) => (
              <li key={s.id}>
                <Link href={`/series/${s.id}`} className="card flex items-center gap-3 p-2.5">
                  <span className="w-5 text-center text-lg font-black text-ink-faint">
                    {i + 1}
                  </span>
                  <Poster title={s.canonicalTitle} showTitle={false} className="h-14 w-10 shrink-0 rounded-lg" />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-bold">{s.canonicalTitle}</h3>
                    <p className="truncate text-xs text-ink-faint">
                      {s.tropes.map((t) => t.name).slice(0, 2).join(" · ")}
                    </p>
                  </div>
                  <CoinBadge score={s.score.score} size="sm" certified />
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>

      <p className="px-4 pt-8 text-center text-xs text-ink-faint">
        DramaScore · logged by night owls, for night owls 🌙
      </p>
    </main>
  );
}
