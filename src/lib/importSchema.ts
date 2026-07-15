// The bulk-import contract: one JSON array of ImportSeriesRow. This module is
// the single source of truth shared by the admin importer (src/lib/adminImport)
// and the scraper (scripts/scrape), which imports it relatively — so keep it
// free of path-alias imports, Prisma, and anything server-only.

import { isPlatform, isSeriesStatus, type Platform, type SeriesStatus } from "./enums";
import { asInt } from "./validate";

export interface ImportAlias {
  aliasTitle: string;
  platform: Platform;
  /** Platform series-page URL only — never media. */
  url?: string | null;
}

export interface ImportSeriesRow {
  canonicalTitle: string;
  /** Required when the row creates a series; absent = untouched on update. */
  synopsis?: string;
  /** Int ≥ 1. Required when creating; absent = untouched on update. */
  episodeCount?: number;
  /** Defaults to "ongoing" on create; absent = untouched on update. */
  status?: SeriesStatus;
  /** Absent = untouched; "" or null clears back to the gradient card. */
  posterUrl?: string | null;
  /** Append-only on update (existing aliases are never removed). */
  aliases?: ImportAlias[];
  /** Slugs or display names; matched via slugify(). Unknown → created. */
  tropes?: string[];
  /** Cast names; matched via slugify(). Unknown → created. Append-only. */
  actors?: string[];
}
// Unknown keys on a row (e.g. the scraper's `_unmappedGenres`) are ignored.

export const IMPORT_MAX_ROWS = 500;
export const IMPORT_MAX_ALIASES_PER_ROW = 20;
export const IMPORT_MAX_TROPES_PER_ROW = 15;
export const IMPORT_MAX_ACTORS_PER_ROW = 12;

/** Canonical form used for all title matching: trim, collapse spaces, lowercase. */
export function normalizeTitle(s: string): string {
  return s.trim().replace(/\s+/g, " ").toLowerCase();
}

function cleanTitle(s: string): string {
  return s.trim().replace(/\s+/g, " ");
}

/**
 * Lenient structural parse of one row: unknown keys stripped, numbers coerced.
 * Returns field errors only — create-vs-update requirements are checked later,
 * once the DB match is known.
 */
export function parseImportRow(raw: unknown): { row?: ImportSeriesRow; errors: string[] } {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return { errors: ["row must be a JSON object"] };
  }
  const r = raw as Record<string, unknown>;
  const errors: string[] = [];
  const row: ImportSeriesRow = { canonicalTitle: "" };

  const title = typeof r.canonicalTitle === "string" ? cleanTitle(r.canonicalTitle) : "";
  if (!title) errors.push("canonicalTitle is required");
  row.canonicalTitle = title;

  if (r.synopsis !== undefined) {
    if (typeof r.synopsis !== "string") errors.push("synopsis must be a string");
    else row.synopsis = r.synopsis.trim();
  }

  if (r.episodeCount !== undefined) {
    const ep = asInt(r.episodeCount);
    if (ep === null || ep < 1) errors.push("episodeCount must be an integer ≥ 1");
    else row.episodeCount = ep;
  }

  if (r.status !== undefined) {
    if (!isSeriesStatus(r.status)) errors.push(`status must be one of: ongoing, complete`);
    else row.status = r.status;
  }

  if (r.posterUrl !== undefined) {
    if (r.posterUrl !== null && typeof r.posterUrl !== "string")
      errors.push("posterUrl must be a string or null");
    else row.posterUrl = typeof r.posterUrl === "string" ? r.posterUrl.trim() || null : null;
  }

  if (r.aliases !== undefined) {
    if (!Array.isArray(r.aliases)) errors.push("aliases must be an array");
    else if (r.aliases.length > IMPORT_MAX_ALIASES_PER_ROW)
      errors.push(`too many aliases (max ${IMPORT_MAX_ALIASES_PER_ROW})`);
    else {
      const aliases: ImportAlias[] = [];
      r.aliases.forEach((a, i) => {
        if (a === null || typeof a !== "object" || Array.isArray(a)) {
          errors.push(`aliases[${i}] must be an object`);
          return;
        }
        const al = a as Record<string, unknown>;
        const aliasTitle = typeof al.aliasTitle === "string" ? cleanTitle(al.aliasTitle) : "";
        if (!aliasTitle) errors.push(`aliases[${i}].aliasTitle is required`);
        if (!isPlatform(al.platform))
          errors.push(`aliases[${i}].platform must be a known platform`);
        if (al.url !== undefined && al.url !== null && typeof al.url !== "string")
          errors.push(`aliases[${i}].url must be a string or null`);
        if (aliasTitle && isPlatform(al.platform)) {
          aliases.push({
            aliasTitle,
            platform: al.platform,
            url: typeof al.url === "string" && al.url.trim() ? al.url.trim() : null,
          });
        }
      });
      row.aliases = aliases;
    }
  }

  if (r.tropes !== undefined) {
    if (!Array.isArray(r.tropes)) errors.push("tropes must be an array of strings");
    else if (r.tropes.length > IMPORT_MAX_TROPES_PER_ROW)
      errors.push(`too many tropes (max ${IMPORT_MAX_TROPES_PER_ROW})`);
    else {
      const tropes: string[] = [];
      r.tropes.forEach((t, i) => {
        if (typeof t !== "string" || !t.trim()) errors.push(`tropes[${i}] must be a non-empty string`);
        else tropes.push(t.trim());
      });
      row.tropes = tropes;
    }
  }

  if (r.actors !== undefined) {
    if (!Array.isArray(r.actors)) errors.push("actors must be an array of strings");
    else if (r.actors.length > IMPORT_MAX_ACTORS_PER_ROW)
      errors.push(`too many actors (max ${IMPORT_MAX_ACTORS_PER_ROW})`);
    else {
      const actors: string[] = [];
      r.actors.forEach((a, i) => {
        if (typeof a !== "string" || !a.trim()) errors.push(`actors[${i}] must be a non-empty string`);
        else actors.push(cleanTitle(a));
      });
      row.actors = actors;
    }
  }

  return errors.length ? { errors } : { row, errors: [] };
}
