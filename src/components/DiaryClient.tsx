"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { DiaryEntry, DiaryStats } from "@/lib/diary";
import { estimatedSpendFor } from "@/lib/spend";
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
  planned: "📌 Planned",
  watching: "👀 Watching",
  finished: "✅ Finished",
  abandoned: "🏳️ Abandoned",
};

export function DiaryClient({
  entries,
}: {
  entries: DiaryEntry[];
  /** Superseded: stats are computed client-side so the year filter works. */
  stats?: DiaryStats;
}) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<string | "all">("all");
  const [tropeFilter, setTropeFilter] = useState<string | "all">("all");
  const [yearFilter, setYearFilter] = useState<number | "all">("all");
  const [bumping, setBumping] = useState<string | null>(null);

  const years = useMemo(() => {
    const ys = new Set(entries.map((e) => new Date(e.loggedAt).getFullYear()));
    return [...ys].sort((a, b) => b - a);
  }, [entries]);

  const tropeOptions = useMemo(() => {
    const map = new Map<string, string>();
    entries.forEach((e) => e.tropes.forEach((t) => map.set(t.slug, t.name)));
    return [...map.entries()].map(([slug, name]) => ({ slug, name }));
  }, [entries]);

  const inYear = useMemo(
    () =>
      yearFilter === "all"
        ? entries
        : entries.filter((e) => new Date(e.loggedAt).getFullYear() === yearFilter),
    [entries, yearFilter]
  );

  // Stats follow the year filter — "2026" turns the tiles into a mini Wrapped.
  const stats = useMemo(() => {
    const finished = inYear.filter((e) => e.status === "finished").length;
    const episodesWatched = inYear.reduce((s, e) => s + e.episodesWatched, 0);
    const estimatedSpend = inYear.reduce(
      (s, e) => s + estimatedSpendFor(e.episodesWatched),
      0
    );
    const tally = new Map<string, { name: string; count: number }>();
    for (const e of inYear) {
      for (const t of e.tropes) {
        const cur = tally.get(t.slug) ?? { name: t.name, count: 0 };
        cur.count += 1;
        tally.set(t.slug, cur);
      }
    }
    const topTrope = [...tally.values()].sort((a, b) => b.count - a.count)[0] ?? null;
    return { finished, episodesWatched, estimatedSpend, topTrope, total: inYear.length };
  }, [inYear]);

  const filtered = inYear.filter((e) => {
    if (statusFilter !== "all" && e.status !== statusFilter) return false;
    if (tropeFilter !== "all" && !e.tropes.some((t) => t.slug === tropeFilter))
      return false;
    return true;
  });

  async function bumpStatus(e: DiaryEntry, status: "watching" | "finished") {
    setBumping(e.seriesId);
    await fetch("/api/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        seriesId: e.seriesId,
        status,
        platformWatchedOn: e.platform,
      }),
    }).catch(() => null);
    setBumping(null);
    router.refresh();
  }

  return (
    <div className="mt-4">
      {/* Year scope */}
      {years.length > 1 && (
        <div className="no-scrollbar mb-3 flex gap-2 overflow-x-auto px-4">
          <button
            onClick={() => setYearFilter("all")}
            className={`chip ${yearFilter === "all" ? "chip-active" : ""}`}
          >
            All time
          </button>
          {years.map((y) => (
            <button
              key={y}
              onClick={() => setYearFilter(y)}
              className={`chip ${yearFilter === y ? "chip-active" : ""}`}
            >
              {y}
            </button>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2.5 px-4">
        <StatTile
          label="Series finished"
          value={String(stats.finished)}
          sub={`${stats.total} logged${yearFilter === "all" ? " total" : ` in ${yearFilter}`}`}
        />
        <StatTile
          label="Episodes watched"
          value={stats.episodesWatched.toLocaleString()}
          sub="in-progress not counted"
        />
        <StatTile
          label="Estimated spend"
          value={`$${stats.estimatedSpend.toFixed(2)}`}
          sub="estimated · eps past 10 × $0.15"
        />
        <StatTile
          label="Top trope"
          value={stats.topTrope?.name ?? "—"}
          sub={stats.topTrope ? `${stats.topTrope.count} series` : undefined}
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
            <div key={e.seriesId} className="card flex items-center gap-3 p-2.5">
              <Link
                href={`/series/${e.seriesId}`}
                className="flex min-w-0 flex-1 items-center gap-3"
              >
                <Poster
                  title={e.title}
                  showTitle={false}
                  className="h-16 w-11 shrink-0 rounded-lg"
                />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-bold">{e.title}</h3>
                  <p className="text-xs text-ink-faint">
                    {STATUS_LABEL[e.status] ?? e.status}
                    {e.status === "abandoned" && e.abandonedAtEp
                      ? ` at ep ${e.abandonedAtEp}`
                      : ""}
                    {e.status === "watching" && e.currentEp
                      ? ` · on ep ${e.currentEp}/${e.episodeCount}`
                      : ""}{" "}
                    · {e.platform}
                  </p>
                  {e.myStars != null && (
                    <div className="mt-1">
                      <Stars value={e.myStars} size={13} />
                    </div>
                  )}
                </div>
              </Link>
              {e.status === "watching" && (
                <button
                  onClick={() => bumpStatus(e, "finished")}
                  disabled={bumping === e.seriesId}
                  className="btn-ghost shrink-0 px-2.5 py-1.5 text-xs"
                  title="Mark as finished"
                >
                  {bumping === e.seriesId ? "…" : "✓ Finished"}
                </button>
              )}
              {e.status === "planned" && (
                <button
                  onClick={() => bumpStatus(e, "watching")}
                  disabled={bumping === e.seriesId}
                  className="btn-ghost shrink-0 px-2.5 py-1.5 text-xs"
                  title="Start watching"
                >
                  {bumping === e.seriesId ? "…" : "▶ Start"}
                </button>
              )}
              <Link href={`/series/${e.seriesId}`} className="shrink-0 text-ink-faint">
                ›
              </Link>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
