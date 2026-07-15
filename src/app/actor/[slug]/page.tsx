import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SeriesCard } from "@/components/SeriesCard";
import { getActorWithSeries } from "@/lib/queries";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { actor } = await getActorWithSeries(slug);
  if (!actor) return { title: "Not found — DramaScore" };
  return {
    title: `${actor.name} — every short drama, ranked — DramaScore`,
    description: `All of ${actor.name}'s vertical dramas ranked by Coin Score.`,
  };
}

export default async function ActorPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { actor, series } = await getActorWithSeries(slug);
  if (!actor) notFound();

  return (
    <main className="pb-8 pt-4">
      <div className="mb-1 flex items-center gap-2 px-4">
        <Link href="/" className="text-2xl text-ink-faint">
          ‹
        </Link>
        <h1 className="text-xl font-black">🎬 {actor.name}</h1>
      </div>
      <p className="px-4 text-sm text-ink-soft">
        {series.length} series on DramaScore, best first.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3 px-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {series.map((s) => (
          <SeriesCard key={s.id} series={s} />
        ))}
      </div>
    </main>
  );
}
