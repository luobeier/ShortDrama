import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/session";
import { badRequest, asInt } from "@/lib/validate";
import { isPlatform, isSeriesStatus } from "@/lib/enums";
import { revalidatePath, revalidateTag } from "next/cache";
import { seriesCacheTag } from "@/lib/seriesDetail";
import { slugify } from "@/lib/slugify";
import {
  ImportPayloadError,
  PURGE_CONFIRM_PHRASE,
  purgeSeedData,
  runImport,
} from "@/lib/adminImport";

/**
 * Env-flagged admin actions. All mutations require an email listed in
 * ADMIN_EMAILS. One endpoint, dispatched by `action`, keeps the surface small.
 */
export async function POST(req: Request) {
  if (!(await isAdmin())) return badRequest("Admins only.", 403);

  const body = await req.json().catch(() => null);
  if (!body?.action) return badRequest("Missing action.");

  switch (body.action) {
    case "createSeries": {
      const title = String(body.canonicalTitle ?? "").trim();
      const synopsis = String(body.synopsis ?? "").trim();
      const episodeCount = asInt(body.episodeCount);
      const status = body.status;
      if (!title) return badRequest("Title is required.");
      if (!episodeCount || episodeCount < 1)
        return badRequest("Episode count must be a positive number.");
      if (!isSeriesStatus(status)) return badRequest("Invalid status.");
      const tropeIds: string[] = Array.isArray(body.tropeIds) ? body.tropeIds : [];
      const posterUrl =
        typeof body.posterUrl === "string" && body.posterUrl.trim()
          ? body.posterUrl.trim()
          : null;

      const series = await prisma.series.create({
        data: {
          canonicalTitle: title,
          synopsis,
          episodeCount,
          status,
          posterUrl,
          tropeTags: { create: tropeIds.map((tropeId) => ({ tropeId })) },
        },
      });
      revalidatePath("/");
      return Response.json({ ok: true, id: series.id });
    }

    case "updateSeries": {
      const id = String(body.id ?? "");
      const series = await prisma.series.findUnique({ where: { id } });
      if (!series) return badRequest("Series not found.", 404);
      const data: Record<string, unknown> = {};
      if (typeof body.canonicalTitle === "string" && body.canonicalTitle.trim())
        data.canonicalTitle = body.canonicalTitle.trim();
      if (typeof body.synopsis === "string") data.synopsis = body.synopsis.trim();
      const ep = asInt(body.episodeCount);
      if (ep && ep > 0) data.episodeCount = ep;
      if (isSeriesStatus(body.status)) data.status = body.status;
      // Empty string clears the poster back to the auto-generated gradient card.
      if (typeof body.posterUrl === "string")
        data.posterUrl = body.posterUrl.trim() || null;

      await prisma.series.update({ where: { id }, data });

      if (Array.isArray(body.tropeIds)) {
        await prisma.seriesTrope.deleteMany({ where: { seriesId: id } });
        await prisma.seriesTrope.createMany({
          data: body.tropeIds.map((tropeId: string) => ({ seriesId: id, tropeId })),
        });
      }
      revalidateTag(seriesCacheTag(id));
      revalidatePath(`/series/${id}`);
      revalidatePath("/");
      return Response.json({ ok: true });
    }

    case "addAlias": {
      const seriesId = String(body.seriesId ?? "");
      const aliasTitle = String(body.aliasTitle ?? "").trim();
      if (!aliasTitle) return badRequest("Alias title required.");
      if (!isPlatform(body.platform)) return badRequest("Invalid platform.");
      const series = await prisma.series.findUnique({ where: { id: seriesId } });
      if (!series) return badRequest("Series not found.", 404);
      await prisma.titleAlias.create({
        data: {
          seriesId,
          aliasTitle,
          platform: body.platform,
          url: typeof body.url === "string" && body.url.trim() ? body.url.trim() : null,
        },
      });
      revalidateTag(seriesCacheTag(seriesId));
      revalidatePath(`/series/${seriesId}`);
      return Response.json({ ok: true });
    }

    case "createTrope": {
      const name = String(body.name ?? "").trim();
      if (!name) return badRequest("Trope name required.");
      const slug = slugify(name);
      const existing = await prisma.trope.findUnique({ where: { slug } });
      if (existing) return badRequest("A trope with that slug already exists.", 409);
      const trope = await prisma.trope.create({ data: { name, slug } });
      revalidatePath("/");
      return Response.json({ ok: true, id: trope.id, slug });
    }

    case "mergeSeries": {
      // Merge `sourceId` into `targetId`: move aliases, logs, reviews, tropes,
      // then delete the source. Conflicting per-user logs/reviews are dropped.
      const sourceId = String(body.sourceId ?? "");
      const targetId = String(body.targetId ?? "");
      if (!sourceId || !targetId || sourceId === targetId)
        return badRequest("Pick two different series to merge.");
      const [source, target] = await Promise.all([
        prisma.series.findUnique({ where: { id: sourceId } }),
        prisma.series.findUnique({ where: { id: targetId } }),
      ]);
      if (!source || !target) return badRequest("Series not found.", 404);

      await prisma.$transaction(async (tx) => {
        // Aliases: reassign, plus keep the source's canonical title searchable.
        await tx.titleAlias.updateMany({
          where: { seriesId: sourceId },
          data: { seriesId: targetId },
        });
        await tx.titleAlias.create({
          data: {
            seriesId: targetId,
            aliasTitle: source.canonicalTitle,
            platform: "Other",
            url: null,
          },
        });

        // Logs: move those whose user has no log on target; drop the rest.
        const targetLogUsers = new Set(
          (await tx.log.findMany({ where: { seriesId: targetId }, select: { userId: true } })).map(
            (l) => l.userId
          )
        );
        const sourceLogs = await tx.log.findMany({ where: { seriesId: sourceId } });
        for (const l of sourceLogs) {
          if (targetLogUsers.has(l.userId)) {
            await tx.log.delete({ where: { id: l.id } });
          } else {
            await tx.log.update({ where: { id: l.id }, data: { seriesId: targetId } });
          }
        }

        // Reviews: same conflict handling.
        const targetReviewUsers = new Set(
          (await tx.review.findMany({ where: { seriesId: targetId }, select: { userId: true } })).map(
            (r) => r.userId
          )
        );
        const sourceReviews = await tx.review.findMany({ where: { seriesId: sourceId } });
        for (const r of sourceReviews) {
          if (targetReviewUsers.has(r.userId)) {
            await tx.review.delete({ where: { id: r.id } });
          } else {
            await tx.review.update({ where: { id: r.id }, data: { seriesId: targetId } });
          }
        }

        // Tropes: union without duplicating the composite key.
        const targetTropes = new Set(
          (await tx.seriesTrope.findMany({ where: { seriesId: targetId }, select: { tropeId: true } })).map(
            (t) => t.tropeId
          )
        );
        const sourceTropes = await tx.seriesTrope.findMany({ where: { seriesId: sourceId } });
        await tx.seriesTrope.deleteMany({ where: { seriesId: sourceId } });
        for (const t of sourceTropes) {
          if (!targetTropes.has(t.tropeId)) {
            await tx.seriesTrope.create({ data: { seriesId: targetId, tropeId: t.tropeId } });
          }
        }

        await tx.series.delete({ where: { id: sourceId } });
      });

      revalidateTag(seriesCacheTag(sourceId));
      revalidateTag(seriesCacheTag(targetId));
      revalidatePath("/");
      return Response.json({ ok: true, targetId });
    }

    case "previewImport":
    case "commitImport": {
      const dryRun = body.action === "previewImport";
      try {
        const { summary, results, touchedSeriesIds } = await runImport(body.rows, { dryRun });
        if (!dryRun) {
          revalidatePath("/");
          for (const id of touchedSeriesIds) {
            revalidateTag(seriesCacheTag(id));
            revalidatePath(`/series/${id}`);
          }
        }
        return Response.json({ ok: true, mode: dryRun ? "preview" : "commit", summary, results });
      } catch (e) {
        if (e instanceof ImportPayloadError) return badRequest(e.message);
        throw e;
      }
    }

    case "dismissReport": {
      const reportId = String(body.reportId ?? "");
      await prisma.report.delete({ where: { id: reportId } }).catch(() => null);
      return Response.json({ ok: true });
    }

    case "dismissTitleRequest": {
      const requestId = String(body.requestId ?? "");
      await prisma.titleRequest.delete({ where: { id: requestId } }).catch(() => null);
      return Response.json({ ok: true });
    }

    case "deleteReview": {
      const reviewId = String(body.reviewId ?? "");
      const review = await prisma.review.findUnique({
        where: { id: reviewId },
        select: { seriesId: true, userId: true, user: { select: { reviewCount: true } } },
      });
      if (!review) return badRequest("Review not found.", 404);
      await prisma.$transaction([
        prisma.review.delete({ where: { id: reviewId } }), // cascades its reports
        prisma.user.update({
          where: { id: review.userId },
          data: { reviewCount: Math.max(0, review.user.reviewCount - 1) },
        }),
      ]);
      revalidateTag(seriesCacheTag(review.seriesId));
      revalidatePath(`/series/${review.seriesId}`);
      revalidatePath("/");
      return Response.json({ ok: true });
    }

    case "setUserBan": {
      const targetId = String(body.userId ?? "");
      const banned = Boolean(body.banned);
      const target = await prisma.user.findUnique({
        where: { id: targetId },
        select: { id: true },
      });
      if (!target) return badRequest("User not found.", 404);
      await prisma.user.update({
        where: { id: targetId },
        data: { bannedAt: banned ? new Date() : null },
      });
      // Their activity feeds many series' scores — refresh everything they touched.
      const touched = await prisma.review.findMany({
        where: { userId: targetId },
        select: { seriesId: true },
      });
      for (const sid of new Set(touched.map((t) => t.seriesId))) {
        revalidateTag(seriesCacheTag(sid));
        revalidatePath(`/series/${sid}`);
      }
      revalidatePath("/");
      return Response.json({ ok: true, banned });
    }

    case "purgeSeedData": {
      if (body.confirm !== PURGE_CONFIRM_PHRASE)
        return badRequest(`Type "${PURGE_CONFIRM_PHRASE}" to confirm.`);
      const targets = {
        syntheticUsers: Boolean(body.syntheticUsers),
        seedSeries: Boolean(body.seedSeries),
      };
      if (!targets.syntheticUsers && !targets.seedSeries)
        return badRequest("Pick at least one thing to purge.");
      const { usersDeleted, seriesDeleted, deletedSeriesIds } = await purgeSeedData(targets);
      revalidatePath("/");
      for (const id of deletedSeriesIds) {
        revalidateTag(seriesCacheTag(id));
        revalidatePath(`/series/${id}`);
      }
      return Response.json({ ok: true, usersDeleted, seriesDeleted });
    }

    default:
      return badRequest("Unknown action.");
  }
}
