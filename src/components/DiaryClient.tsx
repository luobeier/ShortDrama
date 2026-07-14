"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { DiaryEntry, DiaryStats } from "@/lib/diary";
import { Poster } from "./Poster";
import { Stars } from "./Stars";
import { LOG_STATUSES } from "@/lib/enums";

function StatTile({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="card p-3">
      <p className="text-2xl font-black tabular-nums text-ink">{value}</p>
      <p className="text-xs font-semibold text-ink-soft">{label}</p>
      {sub && <p className="text-[10px] text-ink-faint">{sub}</p>}
    </div>
  );
}

const STATUS_LABEL: Record<string, string> = {
  watching: "👀 Watching",
  finished: "✅ Finished",
  abandoned: "🏳️ Abandoned",
};

export function DiaryClient({
  entries,
  stats,
}: {
  entries: DiaryEntry[];
  stats: DiaryStats;
}) {
  const [statusFilter, setStatusFilter] = useState<string | "all">("all");
  const [tropeFilter, setTropeFilter] = useState<string | "all">("all");

  const tropeOptions = useMemo(() => {
    const map = new Map<string, string>();
    entries.forEach((e) => e.tropes.forEach((t) => map.set(t.slug, t.name)));
    return [...map.entries()].map(([slug, name]) => ({ slug, name }));
  }, [entries]);

  const filtered = entries.filter((e) => {
    if (statusFilter !== "all" && e.status !== statusFilter) return false;
    if (tropeFilter !== "all" && !e.tropes.some((t) => t.slug === tropeFilter))
      return false;
    return true;
  });

  return (
    <div className="mt-4">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-2.5 px-4">
        <StatTile label="Series finished" value={String(stats.finished)} sub={`${stats.totalLogged} logged total`} />
        <StatTile label="Episodes watched" value={stats.episodesWatched.toLocaleString()} sub="in-progress not counted" />
        <StatTile
          label="Estimated spend"
          value={`$${stats.estimatedSpend.toFixed(2)}`}
          sub="estimated · eps past 10 × $0.15"
        />
        <StatTile
          label="Top trope"
          value={stats.topTropes[0]?.name ?? "—"}
          sub={stats.topTropes[0] ? `${stats.topTropes[0].count} series` : undefined}
        />
      </div>

      {/* Filters */}
      <div className="mt-5 flex flex-col gap-2">
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-4">
          <button
            onClick={() => setStatusFilter("all")}
            className={`chip ${statusFilter === "all" ? "chip-active" : ""}`}
          >
            All
          </button>
          {LOG_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`chip ${statusFilter === s ? "chip-active" : ""}`}
            >
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
        {tropeOptions.length > 0 && (
          <div className="no-scrollbar flex gap-2 overflow-x-auto px-4">
            <button
              onClick={() => setTropeFilter("all")}
              className={`chip ${tropeFilter === "all" ? "chip-active" : ""}`}
            >
              All tropes
            </button>
            {tropeOptions.map((t) => (
              <button
                key={t.slug}
                onClick={() => setTropeFilter(t.slug)}
                className={`chip ${tropeFilter === t.slug ? "chip-active" : ""}`}
              >
                {t.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* List */}
      <div className="mt-4 flex flex-col gap-2.5 px-4">
        {filtered.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-soft">
            Nothing matches that filter.
          </p>
        ) : (
          filtered.map((e) => (
            <Link key={e.seriesId} href={`/series/${e.seriesId}`} className="card flex items-center gap-3 p-2.5">
              <Poster title={e.title} showTitle={false} className="h-16 w-11 shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-bold">{e.title}</h3>
                <p className="text-xs text-ink-faint">
                  {STATUS_LABEL[e.status]}
                  {e.status === "abandoned" && e.abandonedAtEp
                    ? ` at ep ${e.abandonedAtEp}`
                    : ""}{" "}
                  · {e.platform}
                </p>
                {e.myStars != null && (
                  <div className="mt-1">
                    <Stars value={e.myStars} size={13} />
                  </div>
                )}
              </div>
              <span className="text-ink-faint">›</span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
