// "Where people bail" distribution — the data nobody else has. Single-series
// magnitude → bars in one hue (the app's warn amber, matching the bail copy),
// peak bucket direct-labeled, per-bar native tooltips, recessive axis labels.

const BAR_COLOR = "#ffb020"; // tailwind `warn`
const MAX_BUCKETS = 8;

export function BailHistogram({
  abandonEps,
  episodeCount,
}: {
  abandonEps: number[];
  episodeCount: number;
}) {
  if (abandonEps.length === 0) return null;

  const bucketSize = Math.max(1, Math.ceil(episodeCount / MAX_BUCKETS));
  const bucketCount = Math.ceil(episodeCount / bucketSize);
  const buckets = Array.from({ length: bucketCount }, (_, i) => {
    const from = i * bucketSize + 1;
    const to = Math.min((i + 1) * bucketSize, episodeCount);
    return { from, to, count: 0 };
  });
  for (const ep of abandonEps) {
    const idx = Math.min(bucketCount - 1, Math.floor((ep - 1) / bucketSize));
    if (idx >= 0) buckets[idx].count++;
  }
  const max = Math.max(...buckets.map((b) => b.count));
  const peakIdx = buckets.findIndex((b) => b.count === max);

  return (
    <div>
      <div className="flex h-20 items-end gap-0.5" aria-hidden>
        {buckets.map((b, i) => {
          const h = b.count === 0 ? 0 : Math.max(8, (b.count / max) * 100);
          return (
            <div
              key={b.from}
              className="group relative flex h-full flex-1 flex-col items-center justify-end"
              title={`eps ${b.from}–${b.to} · ${b.count} bailed`}
            >
              {i === peakIdx && b.count > 0 && (
                <span className="mb-0.5 text-[10px] font-bold tabular-nums text-ink-soft">
                  {b.count}
                </span>
              )}
              {b.count > 0 ? (
                <div
                  className="w-full rounded-t"
                  style={{ height: `${h}%`, background: BAR_COLOR, opacity: i === peakIdx ? 1 : 0.55 }}
                />
              ) : (
                <div className="h-px w-full bg-bg-elevated" />
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex justify-between border-t border-line pt-1 text-[10px] text-ink-faint">
        <span>ep 1</span>
        <span>ep {episodeCount}</span>
      </div>
      <p className="sr-only">
        Bail distribution across episodes:{" "}
        {buckets
          .filter((b) => b.count > 0)
          .map((b) => `episodes ${b.from} to ${b.to}: ${b.count} bailed`)
          .join("; ")}
        .
      </p>
    </div>
  );
}
