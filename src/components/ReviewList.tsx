"use client";

import { useState } from "react";
import { ReviewCard } from "./ReviewCard";
import type { ReviewView } from "@/lib/seriesDetail";

type Tab = "all" | "finished" | "abandoned";

/**
 * The community review list with outcome tabs: a bailer's 2 stars and a
 * finisher's 2 stars mean different things. Locked (give-to-get) visitors
 * still only see the first few reviews — the parent wraps us in
 * LockedSection; we just cap the list.
 */
export function ReviewList({
  reviews,
  locked,
}: {
  reviews: ReviewView[];
  locked: boolean;
}) {
  const [tab, setTab] = useState<Tab>("all");

  const finished = reviews.filter((r) => r.watchStatus === "finished");
  const abandoned = reviews.filter((r) => r.watchStatus === "abandoned");
  const shown =
    tab === "finished" ? finished : tab === "abandoned" ? abandoned : reviews;
  const capped = locked ? shown.slice(0, 4) : shown;

  const tabs: { key: Tab; label: string; n: number }[] = [
    { key: "all", label: "All", n: reviews.length },
    { key: "finished", label: "✅ Finished", n: finished.length },
    { key: "abandoned", label: "🏳️ Bailed", n: abandoned.length },
  ];

  return (
    <div>
      {(finished.length > 0 || abandoned.length > 0) && (
        <div className="no-scrollbar mb-2.5 flex gap-2 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`chip text-xs ${tab === t.key ? "chip-active" : ""}`}
              disabled={t.n === 0}
            >
              {t.label} <span className="text-ink-faint">{t.n}</span>
            </button>
          ))}
        </div>
      )}
      {capped.length === 0 ? (
        <div className="card p-5 text-center text-sm text-ink-soft">
          No reviews in this group yet.
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {capped.map((r) => (
            <ReviewCard key={r.id} review={r} isMine={false} />
          ))}
        </div>
      )}
    </div>
  );
}
