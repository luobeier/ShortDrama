import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { isEndingVerdict } from "@/lib/enums";
import { asInt, badRequest, clampEp } from "@/lib/validate";
import { revalidatePath, revalidateTag } from "next/cache";
import { seriesCacheTag } from "@/lib/seriesDetail";

const MAX_REVIEWS_PER_DAY = 10;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Create or update the current user's review for a series.
 * Integrity rules enforced here:
 *  - a Log on the series must already exist (give-to-get + review-requires-log)
 *  - one review per user per series (editable via upsert)
 *  - max 10 NEW reviews per day per user
 */
export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return badRequest("You need to sign in first.", 401);

  const body = await req.json().catch(() => null);
  if (!body) return badRequest("Invalid request body.");

  const { seriesId, worthCoins, endingVerdict } = body;
  if (typeof seriesId !== "string") return badRequest("Missing series.");

  const stars = asInt(body.stars);
  if (stars == null || stars < 1 || stars > 5)
    return badRequest("Stars must be 1–5.");
  if (typeof worthCoins !== "boolean")
    return badRequest("Missing worth-it answer.");
  if (!isEndingVerdict(endingVerdict))
    return badRequest("Invalid ending verdict.");

  const oneLinerRaw = typeof body.oneLiner === "string" ? body.oneLiner.trim() : "";
  if (oneLinerRaw.length > 280)
    return badRequest("One-liner must be 280 characters or fewer.");
  const oneLiner = oneLinerRaw === "" ? null : oneLinerRaw;

  const series = await prisma.series.findUnique({
    where: { id: seriesId },
    select: { id: true, episodeCount: true },
  });
  if (!series) return badRequest("Series not found.", 404);

  // Review requires an existing log (enforced server-side).
  const log = await prisma.log.findUnique({
    where: { userId_seriesId: { userId, seriesId } },
    select: { id: true },
  });
  if (!log)
    return badRequest("Log this drama before reviewing it.", 409);

  const fallsApartAtEp = clampEp(asInt(body.fallsApartAtEp), series.episodeCount);

  const existing = await prisma.review.findUnique({
    where: { userId_seriesId: { userId, seriesId } },
    select: { id: true },
  });

  // Rate limit only applies to brand-new reviews, not edits.
  if (!existing) {
    const since = new Date(Date.now() - DAY_MS);
    const todayCount = await prisma.review.count({
      where: { userId, createdAt: { gte: since } },
    });
    if (todayCount >= MAX_REVIEWS_PER_DAY)
      return badRequest(
        "You've hit the 10-reviews-a-day limit. Come back tomorrow.",
        429
      );
  }

  const review = await prisma.review.upsert({
    where: { userId_seriesId: { userId, seriesId } },
    create: {
      userId,
      seriesId,
      stars,
      worthCoins,
      endingVerdict,
      fallsApartAtEp,
      oneLiner,
    },
    update: { stars, worthCoins, endingVerdict, fallsApartAtEp, oneLiner },
  });

  // Keep denormalized review_count in sync (only grows on first review).
  if (!existing) {
    await prisma.user.update({
      where: { id: userId },
      data: { reviewCount: { increment: 1 } },
    });
  }

  revalidateTag(seriesCacheTag(seriesId));
  revalidatePath(`/series/${seriesId}`);
  revalidatePath("/diary");
  revalidatePath("/");

  return Response.json({
    ok: true,
    review,
    firstReview: !existing,
  });
}
