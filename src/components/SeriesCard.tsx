import Link from "next/link";
import { Poster } from "./Poster";
import { CoinBadge } from "./CoinBadge";
import type { SeriesCardData } from "@/lib/queries";

/**
 * One poster tile: title sits ON the art over a scrim (never duplicated
 * inside the gradient), coin badge top-right, status pill top-left.
 * `className` lets rails set a fixed width (shrink-0 snap-start …).
 */
export function SeriesCard({
  series,
  className = "",
}: {
  series: SeriesCardData;
  className?: string;
}) {
  return (
    <Link href={`/series/${series.id}`} className={`group block ${className}`}>
      <div className="relative overflow-hidden rounded-2xl border border-line shadow-card transition-transform duration-200 group-hover:-translate-y-0.5 group-active:scale-[0.98]">
        <Poster
          title={series.canonicalTitle}
          posterUrl={series.posterUrl}
          showTitle={false}
          className="aspect-[2/3] w-full transition-transform duration-300 group-hover:scale-[1.04]"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-black/95 via-black/45 to-transparent" />

        <div className="absolute right-1.5 top-1.5">
          <CoinBadge
            score={series.score.score}
            size="sm"
            certified={series.score.certifiedBinge}
          />
        </div>
        {series.status === "ongoing" && (
          <span className="absolute left-1.5 top-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-good backdrop-blur">
            ongoing
          </span>
        )}

        <div className="absolute inset-x-0 bottom-0 p-2.5">
          <h3 className="line-clamp-2 text-sm font-bold leading-snug text-white drop-shadow">
            {series.canonicalTitle}
          </h3>
          <p className="mt-0.5 text-[11px] font-medium text-white/65">
            {series.episodeCount} eps
            {typeof series.recentLogCount === "number" && series.recentLogCount > 0 && (
              <> · 🔥 {series.recentLogCount}</>
            )}
          </p>
        </div>
      </div>
    </Link>
  );
}
