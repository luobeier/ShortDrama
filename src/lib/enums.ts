// Enum-like constants. SQLite has no native enums, so these are the source of
// truth for validation and UI. Keep values in sync with the Prisma schema.

export const PLATFORMS = [
  "ReelShort",
  "DramaBox",
  "ShortMax",
  "GoodShort",
  "ShortTV",
  "Other",
] as const;
export type Platform = (typeof PLATFORMS)[number];

export const LOG_STATUSES = ["planned", "watching", "finished", "abandoned"] as const;
export type LogStatus = (typeof LOG_STATUSES)[number];

export const SERIES_STATUSES = ["ongoing", "complete"] as const;
export type SeriesStatus = (typeof SERIES_STATUSES)[number];

export const ENDING_VERDICTS = ["satisfying", "rushed", "rage", "na"] as const;
export type EndingVerdict = (typeof ENDING_VERDICTS)[number];

export const ENDING_VERDICT_LABELS: Record<EndingVerdict, string> = {
  satisfying: "Satisfying",
  rushed: "Rushed",
  rage: "Rage-quit ending",
  na: "N/A",
};

export const ENDING_VERDICT_EMOJI: Record<EndingVerdict, string> = {
  satisfying: "😌",
  rushed: "⏩",
  rage: "🤬",
  na: "🤷",
};

export const PLATFORM_ACCENT: Record<Platform, string> = {
  ReelShort: "#ff4d7d",
  DramaBox: "#6c5ce7",
  ShortMax: "#00b894",
  GoodShort: "#0984e3",
  ShortTV: "#e17055",
  Other: "#7a7a90",
};

export function isPlatform(v: unknown): v is Platform {
  return typeof v === "string" && (PLATFORMS as readonly string[]).includes(v);
}
export function isLogStatus(v: unknown): v is LogStatus {
  return typeof v === "string" && (LOG_STATUSES as readonly string[]).includes(v);
}
export function isEndingVerdict(v: unknown): v is EndingVerdict {
  return (
    typeof v === "string" && (ENDING_VERDICTS as readonly string[]).includes(v)
  );
}
export function isSeriesStatus(v: unknown): v is SeriesStatus {
  return (
    typeof v === "string" && (SERIES_STATUSES as readonly string[]).includes(v)
  );
}
