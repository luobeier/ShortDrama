import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { badRequest } from "@/lib/validate";

/** Flag a review for the admin mod queue. One report per user per review. */
export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return badRequest("You need to sign in first.", 401);

  const body = await req.json().catch(() => null);
  const reviewId = typeof body?.reviewId === "string" ? body.reviewId : "";
  if (!reviewId) return badRequest("Missing review.");

  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: { id: true },
  });
  if (!review) return badRequest("Review not found.", 404);

  const reason =
    typeof body.reason === "string" && body.reason.trim()
      ? body.reason.trim().slice(0, 280)
      : null;

  try {
    await prisma.report.create({ data: { reviewId, reporterId: userId, reason } });
  } catch {
    // Unique constraint: this user already reported this review.
    return badRequest("You already reported this review.", 409);
  }
  return Response.json({ ok: true });
}
