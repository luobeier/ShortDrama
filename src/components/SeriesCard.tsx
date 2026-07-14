import Link from "next/link";
import { Poster } from "./Poster";
import { CoinBadge } from "./CoinBadge";
import type { SeriesCardData } from "@/lib/queries";
import { PlatformDot } from "./PlatformDot";

export function SeriesCard({ series }: { series: SeriesCardData }) {
  return (
    <Link href={`/series/${series.id}`} className="group block">
      <div className="card overflow-hidden">
        <div className="relative">
          <Poster title={series.canonicalTitle} className="aspect-[2/3] w-full" />
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
        </div>
        <div className="p-2.5">
          <h3 className="line-clamp-2 text-sm font-bold leading-tight text-ink">
            {series.canonicalTitle}
          </h3>
          <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-ink-faint">
            <span>{series.episodeCount} eps</span>
            <span className="opacity-40">•</span>
            <div className="flex items-center gap-1">
              {series.platforms.slice(0, 3).map((p) => (
                <PlatformDot key={p} platform={p} />
              ))}
            </div>
          </div>
          {series.tropes[0] && (
            <span className="mt-2 inline-block rounded-full bg-bg-elevated px-2 py-0.5 text-[10px] text-ink-soft">
              {series.tropes[0].name}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
