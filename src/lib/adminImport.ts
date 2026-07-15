// Bulk-import engine for the admin Import tab. One pipeline plans every row
// (read-only) and — unless dryRun — applies the plan, so preview and commit
// can never disagree. Matching is by normalized canonical title AND aliases
// (the schema has no unique constraint on titles; dedup is our job here).

import { prisma } from "./prisma";
import { slugify, titleize } from "./slugify";
import {
  IMPORT_MAX_ROWS,
  normalizeTitle,
  parseImportRow,
  type ImportSeriesRow,
} from "./importSchema";
import { SEED_SERIES_TITLES, SEED_USER_EMAIL_DOMAIN } from "../../prisma/seedData";

/** Payload-level problem (not a per-row one); the route turns it into a 400. */
export class ImportPayloadError extends Error {}

export type RowAction = "create" | "update" | "error";

export interface ImportRowResult {
  index: number;
  title: string;
  action: RowAction;
  matchedBy?: "canonicalTitle" | "alias";
  seriesId?: string;
  newAliases: number;
  newTropes: string[];
  warnings: string[];
  error?: string;
  /** Commit mode only: whether the row's writes went through. */
  applied?: boolean;
}

export interface ImportSummary {
  total: number;
  creates: number;
  updates: number;
  errors: number;
  aliasesAdded: number;
  newTropes: string[];
  applied?: number;
  failed?: number;
}

interface PlannedCreate {
  kind: "create";
  title: string;
  synopsis: string;
  episodeCount: number;
  status: string;
  posterUrl: string | null;
  aliases: { aliasTitle: string; platform: string; url: string | null }[];
  tropeSlugs: string[];
  actorSlugs: string[];
}

interface PlannedUpdate {
  kind: "update";
  seriesId: string;
  scalars: Record<string, unknown>;
  newAliases: { aliasTitle: string; platform: string; url: string | null }[];
  urlBackfills: { aliasId: string; url: string }[];
  newTropeLinkSlugs: string[];
  newActorLinkSlugs: string[];
}

type PlannedOp = PlannedCreate | PlannedUpdate;

const aliasKey = (title: string, platform: string) => `${normalizeTitle(title)}|${platform}`;

export async function runImport(
  rowsRaw: unknown,
  opts: { dryRun: boolean }
): Promise<{ summary: ImportSummary; results: ImportRowResult[]; touchedSeriesIds: string[] }> {
  if (!Array.isArray(rowsRaw)) throw new ImportPayloadError("Payload must be a JSON array of series rows.");
  if (rowsRaw.length === 0) throw new ImportPayloadError("The array is empty — nothing to import.");
  if (rowsRaw.length > IMPORT_MAX_ROWS)
    throw new ImportPayloadError(`Too many rows (${rowsRaw.length}); max ${IMPORT_MAX_ROWS} per import.`);

  // ---- In-memory indexes of the current catalog (it's small) ----------------
  const allSeries = await prisma.series.findMany({
    select: { id: true, canonicalTitle: true },
  });
  const seriesByCanonical = new Map(allSeries.map((s) => [normalizeTitle(s.canonicalTitle), s.id]));

  const allAliases = await prisma.titleAlias.findMany({
    select: { id: true, seriesId: true, aliasTitle: true, platform: true, url: true },
  });
  const seriesByAlias = new Map<string, string>();
  const aliasKeysBySeries = new Map<string, Set<string>>();
  const aliasRecordByKey = new Map<string, { id: string; url: string | null }>();
  for (const a of allAliases) {
    const norm = normalizeTitle(a.aliasTitle);
    if (!seriesByAlias.has(norm)) seriesByAlias.set(norm, a.seriesId);
    const key = aliasKey(a.aliasTitle, a.platform);
    if (!aliasKeysBySeries.has(a.seriesId)) aliasKeysBySeries.set(a.seriesId, new Set());
    aliasKeysBySeries.get(a.seriesId)!.add(key);
    const recKey = `${a.seriesId}|${key}`;
    if (!aliasRecordByKey.has(recKey)) aliasRecordByKey.set(recKey, { id: a.id, url: a.url });
  }

  const allTropes = await prisma.trope.findMany({ select: { id: true, slug: true } });
  const tropeIdBySlug = new Map(allTropes.map((t) => [t.slug, t.id]));

  const allLinks = await prisma.seriesTrope.findMany({ select: { seriesId: true, tropeId: true } });
  const tropeIdsBySeries = new Map<string, Set<string>>();
  for (const l of allLinks) {
    if (!tropeIdsBySeries.has(l.seriesId)) tropeIdsBySeries.set(l.seriesId, new Set());
    tropeIdsBySeries.get(l.seriesId)!.add(l.tropeId);
  }

  const allActors = await prisma.actor.findMany({ select: { id: true, slug: true } });
  const actorIdBySlug = new Map(allActors.map((a) => [a.slug, a.id]));
  const castLinks = await prisma.seriesActor.findMany({ select: { seriesId: true, actorId: true } });
  const actorIdsBySeries = new Map<string, Set<string>>();
  for (const l of castLinks) {
    if (!actorIdsBySeries.has(l.seriesId)) actorIdsBySeries.set(l.seriesId, new Set());
    actorIdsBySeries.get(l.seriesId)!.add(l.actorId);
  }

  // ---- Plan every row (read-only) -------------------------------------------
  const results: ImportRowResult[] = [];
  const ops = new Map<number, PlannedOp>();
  const claimedTitles = new Map<string, number>(); // normalized title -> first row index
  const claimedSeries = new Map<string, number>(); // existing seriesId -> first row index
  const newTropeNameBySlug = new Map<string, string>(); // to create in commit (first-seen name wins)
  const newActorNameBySlug = new Map<string, string>();

  rowsRaw.forEach((raw, index) => {
    const { row, errors } = parseImportRow(raw);
    if (!row || errors.length) {
      results.push({
        index,
        title:
          (typeof (raw as Record<string, unknown>)?.canonicalTitle === "string" &&
            ((raw as Record<string, unknown>).canonicalTitle as string).trim()) ||
          `(row ${index})`,
        action: "error",
        newAliases: 0,
        newTropes: [],
        warnings: [],
        error: errors.join("; "),
      });
      return;
    }

    const warnings: string[] = [];
    const canonicalNorm = normalizeTitle(row.canonicalTitle);

    // Every title this row lays claim to (canonical + its aliases), deduped.
    const claimSet = new Set<string>([canonicalNorm]);
    for (const a of row.aliases ?? []) claimSet.add(normalizeTitle(a.aliasTitle));

    // Duplicate within the payload → explicit error, never a silent merge.
    for (const norm of claimSet) {
      const prior = claimedTitles.get(norm);
      if (prior !== undefined) {
        results.push({
          index,
          title: row.canonicalTitle,
          action: "error",
          newAliases: 0,
          newTropes: [],
          warnings,
          error: `duplicate of row ${prior} ("${rowTitle(rowsRaw[prior])}") — merge the rows in your payload`,
        });
        return;
      }
    }

    // Match against the DB: canonical title first, then aliases.
    let matchedBy: "canonicalTitle" | "alias" | undefined;
    let seriesId = seriesByCanonical.get(canonicalNorm);
    if (seriesId) matchedBy = "canonicalTitle";
    else {
      seriesId = seriesByAlias.get(canonicalNorm);
      if (seriesId) {
        matchedBy = "alias";
        warnings.push("matched an existing alias — the existing canonical title is kept");
      }
    }

    if (seriesId) {
      const prior = claimedSeries.get(seriesId);
      if (prior !== undefined) {
        results.push({
          index,
          title: row.canonicalTitle,
          action: "error",
          newAliases: 0,
          newTropes: [],
          warnings,
          error: `duplicate of row ${prior} — both rows resolve to the same existing series`,
        });
        return;
      }
    }

    // Tropes: resolve to existing ids or queue creations by slug.
    const rowNewTropes: string[] = [];
    const tropeSlugs: string[] = [];
    const seenSlugs = new Set<string>();
    for (const t of row.tropes ?? []) {
      const slug = slugify(t);
      if (!slug) {
        warnings.push(`trope "${t}" ignored (empty slug)`);
        continue;
      }
      if (seenSlugs.has(slug)) continue;
      seenSlugs.add(slug);
      tropeSlugs.push(slug);
      if (!tropeIdBySlug.has(slug) && !newTropeNameBySlug.has(slug)) {
        // Display name: keep the human-entered form if it looks like one.
        const name = /[A-Z\s]/.test(t) ? t : titleize(slug);
        newTropeNameBySlug.set(slug, name);
      }
      if (!tropeIdBySlug.has(slug)) rowNewTropes.push(slug);
    }

    // Actors: resolve to existing ids or queue creations by slug.
    const actorSlugs: string[] = [];
    const seenActorSlugs = new Set<string>();
    for (const name of row.actors ?? []) {
      const slug = slugify(name);
      if (!slug || seenActorSlugs.has(slug)) continue;
      seenActorSlugs.add(slug);
      actorSlugs.push(slug);
      if (!actorIdBySlug.has(slug) && !newActorNameBySlug.has(slug)) {
        newActorNameBySlug.set(slug, name);
      }
    }

    // Aliases: dedupe within the row by (title, platform).
    const rowAliasByKey = new Map<string, { aliasTitle: string; platform: string; url: string | null }>();
    for (const a of row.aliases ?? []) {
      const key = aliasKey(a.aliasTitle, a.platform);
      if (!rowAliasByKey.has(key))
        rowAliasByKey.set(key, { aliasTitle: a.aliasTitle, platform: a.platform, url: a.url ?? null });
    }

    if (!seriesId) {
      // -------- CREATE --------
      const missing: string[] = [];
      if (!row.synopsis) missing.push("synopsis");
      if (row.episodeCount === undefined) missing.push("episodeCount");
      if (missing.length) {
        results.push({
          index,
          title: row.canonicalTitle,
          action: "error",
          newAliases: 0,
          newTropes: [],
          warnings,
          error: `new series is missing required field(s): ${missing.join(", ")}`,
        });
        return;
      }
      const aliases = [...rowAliasByKey.values()];
      ops.set(index, {
        kind: "create",
        title: row.canonicalTitle,
        synopsis: row.synopsis!,
        episodeCount: row.episodeCount!,
        status: row.status ?? "ongoing",
        posterUrl: row.posterUrl ?? null,
        aliases,
        tropeSlugs,
        actorSlugs,
      });
      results.push({
        index,
        title: row.canonicalTitle,
        action: "create",
        newAliases: aliases.length,
        newTropes: rowNewTropes,
        warnings,
      });
    } else {
      // -------- UPDATE --------
      const scalars: Record<string, unknown> = {};
      if (row.synopsis) scalars.synopsis = row.synopsis;
      if (row.episodeCount !== undefined) scalars.episodeCount = row.episodeCount;
      if (row.status !== undefined) scalars.status = row.status;
      if (row.posterUrl !== undefined) scalars.posterUrl = row.posterUrl;

      const existingKeys = aliasKeysBySeries.get(seriesId) ?? new Set<string>();
      const newAliases: { aliasTitle: string; platform: string; url: string | null }[] = [];
      const urlBackfills: { aliasId: string; url: string }[] = [];
      for (const [key, a] of rowAliasByKey) {
        if (!existingKeys.has(key)) {
          newAliases.push(a);
        } else if (a.url) {
          const rec = aliasRecordByKey.get(`${seriesId}|${key}`);
          if (rec && !rec.url) urlBackfills.push({ aliasId: rec.id, url: a.url });
        }
      }

      const linked = tropeIdsBySeries.get(seriesId) ?? new Set<string>();
      const newTropeLinkSlugs = tropeSlugs.filter((slug) => {
        const id = tropeIdBySlug.get(slug);
        return !id || !linked.has(id);
      });
      const linkedActors = actorIdsBySeries.get(seriesId) ?? new Set<string>();
      const newActorLinkSlugs = actorSlugs.filter((slug) => {
        const id = actorIdBySlug.get(slug);
        return !id || !linkedActors.has(id);
      });

      ops.set(index, {
        kind: "update",
        seriesId,
        scalars,
        newAliases,
        urlBackfills,
        newTropeLinkSlugs,
        newActorLinkSlugs,
      });
      results.push({
        index,
        title: row.canonicalTitle,
        action: "update",
        matchedBy,
        seriesId,
        newAliases: newAliases.length,
        newTropes: rowNewTropes,
        warnings,
      });
    }

    for (const norm of claimSet) claimedTitles.set(norm, index);
    if (seriesId) claimedSeries.set(seriesId, index);
  });

  const summary: ImportSummary = {
    total: results.length,
    creates: results.filter((r) => r.action === "create").length,
    updates: results.filter((r) => r.action === "update").length,
    errors: results.filter((r) => r.action === "error").length,
    aliasesAdded: results.reduce((n, r) => (r.action === "error" ? n : n + r.newAliases), 0),
    newTropes: [...newTropeNameBySlug.keys()],
  };

  if (opts.dryRun) return { summary, results, touchedSeriesIds: [] };

  // ---- Apply (sequential — SQLite is single-writer) --------------------------
  // Missing tropes first: they're shared across rows, so row order never matters.
  for (const [slug, name] of newTropeNameBySlug) {
    try {
      const t = await prisma.trope.create({ data: { slug, name } });
      tropeIdBySlug.set(slug, t.id);
    } catch {
      const t = await prisma.trope.findUnique({ where: { slug } });
      if (t) tropeIdBySlug.set(slug, t.id);
    }
  }
  for (const [slug, name] of newActorNameBySlug) {
    try {
      const a = await prisma.actor.create({ data: { slug, name } });
      actorIdBySlug.set(slug, a.id);
    } catch {
      const a = await prisma.actor.findUnique({ where: { slug } });
      if (a) actorIdBySlug.set(slug, a.id);
    }
  }

  const touchedSeriesIds: string[] = [];
  let applied = 0;
  let failed = 0;

  for (const result of results) {
    const op = ops.get(result.index);
    if (!op) continue;
    try {
      if (op.kind === "create") {
        const created = await prisma.series.create({
          data: {
            canonicalTitle: op.title,
            synopsis: op.synopsis,
            episodeCount: op.episodeCount,
            status: op.status,
            posterUrl: op.posterUrl,
            aliases: { create: op.aliases },
            tropeTags: {
              create: op.tropeSlugs
                .filter((slug) => tropeIdBySlug.has(slug))
                .map((slug) => ({ tropeId: tropeIdBySlug.get(slug)! })),
            },
            cast: {
              create: op.actorSlugs
                .filter((slug) => actorIdBySlug.has(slug))
                .map((slug) => ({ actorId: actorIdBySlug.get(slug)! })),
            },
          },
        });
        result.seriesId = created.id;
      } else {
        await prisma.$transaction(async (tx) => {
          await tx.series.update({
            where: { id: op.seriesId },
            data: {
              ...op.scalars,
              aliases: { create: op.newAliases },
              tropeTags: {
                create: op.newTropeLinkSlugs
                  .filter((slug) => tropeIdBySlug.has(slug))
                  .map((slug) => ({ tropeId: tropeIdBySlug.get(slug)! })),
              },
              cast: {
                create: op.newActorLinkSlugs
                  .filter((slug) => actorIdBySlug.has(slug))
                  .map((slug) => ({ actorId: actorIdBySlug.get(slug)! })),
              },
            },
          });
          for (const b of op.urlBackfills) {
            await tx.titleAlias.update({ where: { id: b.aliasId }, data: { url: b.url } });
          }
        });
        touchedSeriesIds.push(op.seriesId);
      }
      result.applied = true;
      applied++;
    } catch (e) {
      result.applied = false;
      result.error = e instanceof Error ? e.message : "write failed";
      failed++;
    }
  }

  summary.applied = applied;
  summary.failed = failed;
  return { summary, results, touchedSeriesIds };
}

function rowTitle(raw: unknown): string {
  const t = (raw as Record<string, unknown>)?.canonicalTitle;
  return typeof t === "string" ? t.trim() : "?";
}

// ---- Purge placeholder data (danger zone) -----------------------------------

export const PURGE_CONFIRM_PHRASE = "PURGE SEED DATA";

export async function purgeSeedData(targets: {
  syntheticUsers: boolean;
  seedSeries: boolean;
}): Promise<{ usersDeleted: number; seriesDeleted: number; deletedSeriesIds: string[] }> {
  return prisma.$transaction(async (tx) => {
    let deletedSeriesIds: string[] = [];
    let seriesDeleted = 0;
    let usersDeleted = 0;

    if (targets.seedSeries) {
      const seedSeries = await tx.series.findMany({
        where: { canonicalTitle: { in: SEED_SERIES_TITLES } },
        select: { id: true },
      });
      deletedSeriesIds = seedSeries.map((s) => s.id);
      if (deletedSeriesIds.length) {
        // onDelete: Cascade removes aliases, logs, reviews and trope links.
        const res = await tx.series.deleteMany({ where: { id: { in: deletedSeriesIds } } });
        seriesDeleted = res.count;
      }
    }

    if (targets.syntheticUsers) {
      const res = await tx.user.deleteMany({
        where: { email: { endsWith: SEED_USER_EMAIL_DOMAIN } },
      });
      usersDeleted = res.count;
    }

    return { usersDeleted, seriesDeleted, deletedSeriesIds };
  });
}
