import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SeriesCard } from "@/components/SeriesCard";
import { PlatformDot } from "@/components/PlatformDot";
import { getSeriesByPlatform } from "@/lib/queries";
import { PLATFORMS } from "@/lib/enums";

export const revalidate = 300;

function resolvePlatform(name: string): string | null {
  return PLATFORMS.find((p) => p.toLowerCase() === name.toLowerCase()) ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ name: string }>;
}): Promise<Metadata> {
  const { name } = await params;
  const platform = resolvePlatform(name);
  if (!platform) return { title: "Not found — DramaScore" };
  return {
    title: `Best ${platform} dramas, ranked by real viewers — DramaScore`,
    description: `Every ${platform} short drama on DramaScore ranked by Coin Score — completion rates, star ratings, and worth-your-coins verdicts from people who actually watched.`,
  };
}

export default async function PlatformPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const platform = resolvePlatform(name);
  if (!platform) notFound();

  const series = await getSeriesByPlatform(platform);

  return (
    <main className="pb-8 pt-4">
      <div className="mb-1 flex items-center gap-2 px-4">
        <Link href="/" className="text-2xl text-ink-faint">
          ‹
        </Link>
        <h1 className="flex items-center gap-2 text-xl font-black">
          Best on <PlatformDot platform={platform} withLabel />
        </h1>
      </div>
      <p className="px-4 text-sm text-ink-soft">
        {series.length} series, ranked by Coin Score — from viewers, not marketing.
      </p>

      {series.length === 0 ? (
        <p className="px-4 pt-8 text-sm text-ink-soft">
          Nothing catalogued for {platform} yet.
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
