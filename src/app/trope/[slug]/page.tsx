import Link from "next/link";
import { notFound } from "next/navigation";
import { getSeriesByTrope, getAllTropesWithCounts } from "@/lib/queries";
import { SeriesCard } from "@/components/SeriesCard";
import { TropeRail } from "@/components/TropeRail";

export const revalidate = 120;

export default async function TropePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [{ trope, series }, allTropes] = await Promise.all([
    getSeriesByTrope(slug),
    getAllTropesWithCounts(),
  ]);
  if (!trope) notFound();

  return (
    <main className="pb-6 pt-4">
      <div className="mb-3 flex items-center gap-2 px-4">
        <Link href="/" className="text-2xl text-ink-faint">
          ‹
        </Link>
        <div>
          <h1 className="text-xl font-black">{trope.name}</h1>
          <p className="text-xs text-ink-faint">
            {series.length} series tagged
          </p>
        </div>
      </div>

      <TropeRail tropes={allTropes} activeSlug={slug} />

      {series.length === 0 ? (
        <p className="px-4 pt-6 text-sm text-ink-soft">
          No series tagged yet.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 px-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {series.map((s) => (
            <SeriesCard key={s.id} series={s} />
          ))}
        </div>
      )}
    </main>
  );
}
