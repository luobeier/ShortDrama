import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { badRequest } from "@/lib/validate";
import { revalidatePath, revalidateTag } from "next/cache";
import { seriesCacheTag } from "@/lib/seriesDetail";

/** Toggle a "helpful" vote on a review. Returns the new state + count. */
export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return badRequest("You need to sign in first.", 401);

  const body = await req.json().catch(() => null);
  const reviewId = typeof body?.reviewId === "string" ? body.reviewId : "";
  if (!reviewId) return badRequest("Missing review.");

  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: { id: true, seriesId: true, userId: true },
  });
  if (!review) return badRequest("Review not found.", 404);
  if (review.userId === userId)
    return badRequest("You can't vote on your own review.", 400);

  const existing = await prisma.reviewVote.findUnique({
    where: { reviewId_voterId: { reviewId, voterId: userId } },
  });
  let voted: boolean;
  if (existing) {
    await prisma.reviewVote.delete({ where: { id: existing.id } });
    voted = false;
  } else {
    await prisma.reviewVote.create({ data: { reviewId, voterId: userId } });
    voted = true;
  }
  const count = await prisma.reviewVote.count({ where: { reviewId } });

  revalidateTag(seriesCacheTag(review.seriesId));
  revalidatePath(`/series/${review.seriesId}`);

  return Response.json({ ok: true, voted, count });
}
