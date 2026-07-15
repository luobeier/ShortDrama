import Link from "next/link";
import { SearchBar } from "@/components/SearchBar";
import { SeriesCard } from "@/components/SeriesCard";
import { TropeRail } from "@/components/TropeRail";
import { RequestTitleForm } from "@/components/RequestTitleForm";
import { searchSeries, getAllTropesWithCounts } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const [results, tropes, user] = await Promise.all([
    query ? searchSeries(query) : Promise.resolve([]),
    getAllTropesWithCounts(),
    getCurrentUser(),
  ]);

  return (
    <main className="pb-6 pt-4">
      <div className="mb-4 flex items-center gap-2 px-4">
        <Link href="/" className="text-2xl text-ink-faint">
          ‹
        </Link>
        <h1 className="text-xl font-black">Search</h1>
      </div>

      <SearchBar autoFocus={!query} defaultValue={query} />

      {query ? (
        <section className="mt-5">
          <p className="px-4 text-sm text-ink-soft">
            {results.length} result{results.length === 1 ? "" : "s"} for “{query}”
          </p>
          {results.length === 0 ? (
            <div className="flex flex-col gap-4 px-4 pt-5 text-sm text-ink-soft">
              <p>Nothing yet. Try an alias, or a different platform&apos;s title.</p>
              <RequestTitleForm prefillTitle={query} isLoggedIn={!!user} />
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-3 px-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {results.map((s) => (
                <SeriesCard key={s.id} series={s} />
              ))}
            </div>
          )}
        </section>
      ) : (
        <section className="mt-6">
          <h2 className="px-4 pb-2 text-sm font-black uppercase tracking-wide text-ink-faint">
            Or browse by trope
          </h2>
          <TropeRail tropes={tropes} />
        </section>
      )}
    </main>
  );
}
