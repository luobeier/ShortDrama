"use client";

import { useState } from "react";
import { ReviewCard } from "./ReviewCard";
import type { ReviewView } from "@/lib/seriesDetail";

type Tab = "all" | "finished" | "abandoned";
type Sort = "helpful" | "newest" | "highest" | "lowest";

/**
 * The community review list with outcome tabs (a bailer's 2 stars and a
 * finisher's 2 stars mean different things) and a sort control. Locked
 * visitors receive a pre-capped array from the server — we just render it.
 */
export function ReviewList({
  reviews,
  locked,
  votedIds = [],
}: {
  reviews: ReviewView[];
  locked: boolean;
  /** Review ids the current user has already marked helpful. */
  votedIds?: string[];
}) {
  const [tab, setTab] = useState<Tab>("all");
  const [sort, setSort] = useState<Sort>("helpful");
  const votedSet = new Set(votedIds);

  const finished = reviews.filter((r) => r.watchStatus === "finished");
  const abandoned = reviews.filter((r) => r.watchStatus === "abandoned");
  const inTab =
    tab === "finished" ? finished : tab === "abandoned" ? abandoned : reviews;

  const sorted = [...inTab].sort((a, b) => {
    switch (sort) {
      case "helpful":
        return (
          (b.helpfulCount ?? 0) - (a.helpfulCount ?? 0) ||
          +new Date(b.createdAt) - +new Date(a.createdAt)
        );
      case "highest":
        return b.stars - a.stars;
      case "lowest":
        return a.stars - b.stars;
      default:
        return +new Date(b.createdAt) - +new Date(a.createdAt);
    }
  });
  const capped = locked ? sorted.slice(0, 4) : sorted;

  const tabs: { key: Tab; label: string; n: number }[] = [
    { key: "all", label: "All", n: reviews.length },
    { key: "finished", label: "✅ Finished", n: finished.length },
    { key: "abandoned", label: "🏳️ Bailed", n: abandoned.length },
  ];

  return (
    <div>
      <div className="mb-2.5 flex items-center justify-between gap-2">
        {finished.length > 0 || abandoned.length > 0 ? (
          <div className="no-scrollbar flex gap-2 overflow-x-auto">
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
        ) : (
          <span />
        )}
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          className="shrink-0 rounded-full border border-line bg-bg-card px-2.5 py-1.5 text-xs text-ink-soft"
          aria-label="Sort reviews"
        >
          <option value="helpful">Most helpful</option>
          <option value="newest">Newest</option>
          <option value="highest">Highest rated</option>
          <option value="lowest">Lowest rated</option>
        </select>
      </div>
      {capped.length === 0 ? (
        <div className="card p-5 text-center text-sm text-ink-soft">
          No reviews in this group yet.
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {capped.map((r) => (
            <ReviewCard key={r.id} review={r} isMine={false} voted={votedSet.has(r.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
