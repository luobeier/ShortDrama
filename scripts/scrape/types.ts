import type { Page } from "playwright";
import type { ImportSeriesRow } from "../../src/lib/importSchema";
import type { Platform } from "../../src/lib/enums";

/**
 * A scraped row is exactly what the admin bulk importer accepts, plus
 * `_unmappedGenres` — platform genre labels we couldn't map to a trope slug.
 * The importer ignores unknown keys; humans read them while spot-checking.
 */
export type ScrapedRow = ImportSeriesRow & { _unmappedGenres?: string[] };

export interface RawSeries {
  title: string;
  url: string;
  synopsis: string;
  episodeCount: number | null;
  /** From "End"/"Completed"/"Ongoing" style labels; null if not shown. */
  statusHint: "complete" | "ongoing" | null;
  genreLabels: string[];
}

export interface PlatformAdapter {
  platform: Platform;
  /** Origin used for the robots.txt check. */
  origin: string;
  /** Paths the run will touch, for the fail-closed robots check. */
  robotsProbePaths: string[];
  /** Collect series detail-page URLs from public catalog/browse pages. */
  discover(page: Page, limit: number): Promise<string[]>;
  /** Parse one series detail page; null = not a usable series page. */
  parseSeries(page: Page, url: string): Promise<RawSeries | null>;
}

export interface RunSummary {
  platform: string;
  fetchedAt: string;
  pagesVisited: number;
  ok: number;
  failed: { url: string; error: string }[];
  unmappedGenreCounts: Record<string, number>;
}
