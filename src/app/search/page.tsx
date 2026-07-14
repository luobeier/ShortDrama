import Link from "next/link";
import { SearchBar } from "@/components/SearchBar";
import { SeriesCard } from "@/components/SeriesCard";
import { TropeRail } from "@/components/TropeRail";
import { searchSeries, getAllTropesWithCounts } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const [results, tropes] = await Promise.all([
    query ? searchSeries(query) : Promise.resolve([]),
    getAllTropesWithCounts(),
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
            <div className="px-4 pt-6 text-sm text-ink-soft">
              <p>Nothing yet. Try an alias, or a different platform&apos;s title.</p>
              <p className="mt-2 text-ink-faint">
                Can&apos;t find a drama? Admins can add it — for now, browse by trope below.
              </p>
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-3 px-4">
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
