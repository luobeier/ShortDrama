import type { CoinScoreResult } from "@/lib/score";

function Bar({
  label,
  weight,
  value,
  hint,
}: {
  label: string;
  weight: string;
  value: number | null;
  hint: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-semibold text-ink">
          {label} <span className="text-xs text-ink-faint">{weight}</span>
        </span>
        <span className="tabular-nums font-bold text-ink">
          {value === null ? "—" : `${value}`}
        </span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-bg-elevated">
        <div
          className="h-full rounded-full bg-gradient-to-r from-coin-deep to-coin"
          style={{ width: `${value ?? 0}%` }}
        />
      </div>
      <p className="mt-1 text-[11px] text-ink-faint">{hint}</p>
    </div>
  );
}

export function ScoreBreakdown({ score }: { score: CoinScoreResult }) {
  return (
    <div className="flex flex-col gap-4">
      <Bar
        label="Completion"
        weight="40%"
        value={score.breakdown.completion}
        hint={
          score.breakdown.completion === null
            ? "No finished/abandoned logs yet"
            : `${score.finishedCount} finished vs ${score.abandonedCount} abandoned`
        }
      />
      <Bar
        label="Star rating"
        weight="35%"
        value={score.breakdown.stars}
        hint={
          score.avgStars === null
            ? "No ratings yet"
            : `${score.avgStars.toFixed(1)} average from ${score.eligibleReviewCount} reviews`
        }
      />
      <Bar
        label="Worth the coins"
        weight="25%"
        value={score.breakdown.worth}
        hint={
          score.worthPct === null
            ? "No verdicts yet"
            : `${score.worthPct}% said it was worth paying for`
        }
      />
    </div>
  );
}
