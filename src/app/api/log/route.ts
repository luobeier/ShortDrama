import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { isLogStatus, isPlatform } from "@/lib/enums";
import { asInt, badRequest, clampEp } from "@/lib/validate";
import { revalidatePath, revalidateTag } from "next/cache";
import { seriesCacheTag } from "@/lib/seriesDetail";

/** Create or update the current user's log for a series (one per user/series). */
export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return badRequest("You need to sign in first.", 401);
  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { bannedAt: true },
  });
  if (me?.bannedAt) return badRequest("This account is suspended.", 403);

  const body = await req.json().catch(() => null);
  if (!body) return badRequest("Invalid request body.");

  const { seriesId, status, platformWatchedOn } = body;
  if (typeof seriesId !== "string") return badRequest("Missing series.");
  if (!isLogStatus(status)) return badRequest("Invalid status.");
  if (!isPlatform(platformWatchedOn)) return badRequest("Invalid platform.");

  const series = await prisma.series.findUnique({
    where: { id: seriesId },
    select: { id: true, episodeCount: true },
  });
  if (!series) return badRequest("Series not found.", 404);

  const abandonedAtEp =
    status === "abandoned"
      ? clampEp(asInt(body.abandonedAtEp), series.episodeCount)
      : null;

  const log = await prisma.log.upsert({
    where: { userId_seriesId: { userId, seriesId } },
    create: {
      userId,
      seriesId,
      status,
      abandonedAtEp,
      platformWatchedOn,
    },
    update: { status, abandonedAtEp, platformWatchedOn },
  });

  revalidateTag(seriesCacheTag(seriesId));
  revalidatePath(`/series/${seriesId}`);
  revalidatePath("/diary");
  revalidatePath("/");

  return Response.json({ ok: true, log });
}
