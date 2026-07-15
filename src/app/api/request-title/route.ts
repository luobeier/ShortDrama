import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { badRequest } from "@/lib/validate";
import { isPlatform } from "@/lib/enums";

const MAX_OPEN_REQUESTS_PER_USER = 10;

/** "Can't find it? Request it." — lands in the admin Mods queue. */
export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return badRequest("Sign in to request a title.", 401);

  const body = await req.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim().slice(0, 120) : "";
  if (!title) return badRequest("Give us the title.");
  const platform = isPlatform(body?.platform) ? body.platform : null;
  const note =
    typeof body?.note === "string" && body.note.trim()
      ? body.note.trim().slice(0, 280)
      : null;

  const open = await prisma.titleRequest.count({ where: { requesterId: userId } });
  if (open >= MAX_OPEN_REQUESTS_PER_USER)
    return badRequest("You have too many open requests — thanks for the enthusiasm!", 429);

  await prisma.titleRequest.create({
    data: { title, platform, note, requesterId: userId },
  });
  return Response.json({ ok: true });
}
