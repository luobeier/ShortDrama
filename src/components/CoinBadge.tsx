import { scoreBand } from "@/lib/score";

interface Props {
  score: number | null;
  size?: "sm" | "md" | "lg";
  certified?: boolean;
}

const SIZES = {
  sm: { box: 44, font: "text-base", sub: "hidden" },
  md: { box: 64, font: "text-xl", sub: "text-[9px]" },
  lg: { box: 104, font: "text-4xl", sub: "text-[10px]" },
} as const;

/**
 * The Coin Score, as a bold coin-shaped badge. When score is null we render a
 * muted "??" coin — the series doesn't have enough reviews yet.
 */
export function CoinBadge({ score, size = "md", certified }: Props) {
  const s = SIZES[size];
  const band = score !== null ? scoreBand(score) : null;
  const ring =
    score === null
      ? "#3a3a4a"
      : band!.tone === "great"
        ? "#3ddc84"
        : band!.tone === "good"
          ? "#ffcc4d"
          : band!.tone === "mid"
            ? "#ffb020"
            : "#ff5c5c";

  return (
    <div
      className="relative shrink-0 animate-coin-in"
      style={{ width: s.box, height: s.box }}
      aria-label={score === null ? "Not enough reviews yet" : `Coin Score ${score} out of 100`}
    >
      <div
        className="flex h-full w-full flex-col items-center justify-center rounded-full font-black text-black"
        style={{
          background:
            score === null
              ? "radial-gradient(circle at 35% 30%, #2a2a38, #16161f)"
              : "radial-gradient(circle at 35% 30%, #ffe08a, #f5a623 65%, #d98c0f)",
          boxShadow: `0 3px 0 0 ${score === null ? "#0c0c12" : "#8a5a00"}, inset 0 0 0 3px ${ring}`,
          color: score === null ? "#7a7a90" : "#3a2600",
        }}
      >
        <span className={`${s.font} leading-none`}>{score === null ? "??" : score}</span>
        {s.sub !== "hidden" && (
          <span className={`${s.sub} font-bold uppercase tracking-wide opacity-70`}>
            {score === null ? "no data" : "coin score"}
          </span>
        )}
      </div>
      {certified && (
        <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-good text-xs shadow-md">
          🏆
        </span>
      )}
    </div>
  );
}
