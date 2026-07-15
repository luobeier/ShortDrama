// Star-rating distribution — a 3.0 that's all 3s and a 3.0 that's half 5s /
// half 1s ("so bad it's good") are different shows. Same single-hue bar rules
// as the bail histogram: gold data color, ink-token text, recessive baseline.

export function RatingBars({ stars }: { stars: number[] }) {
  if (stars.length === 0) return null;
  const buckets = [5, 4, 3, 2, 1].map((s) => ({
    s,
    count: stars.filter((v) => v === s).length,
  }));
  const max = Math.max(...buckets.map((b) => b.count), 1);

  return (
    <div className="flex flex-col gap-1" aria-label="Rating distribution">
      {buckets.map((b) => (
        <div key={b.s} className="flex items-center gap-2 text-[11px]">
          <span className="w-6 shrink-0 text-right font-semibold tabular-nums text-ink-soft">
            {b.s}★
          </span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-bg-elevated">
            <div
              className="h-full rounded-full"
              style={{
                width: `${(b.count / max) * 100}%`,
                background: "linear-gradient(90deg, #f5a623, #ffcc4d)",
                opacity: b.count === 0 ? 0 : 1,
              }}
            />
          </div>
          <span className="w-5 shrink-0 tabular-nums text-ink-faint">{b.count}</span>
        </div>
      ))}
    </div>
  );
}
