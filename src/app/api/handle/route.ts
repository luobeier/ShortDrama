import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { badRequest } from "@/lib/validate";

const HANDLE_RE = /^[a-zA-Z0-9_]{3,20}$/;
const RESERVED = new Set(["admin", "dramascore", "root", "support", "api", "you"]);

/** Set (or change) the current user's public handle. No real names anywhere. */
export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return badRequest("You need to sign in first.", 401);

  const body = await req.json().catch(() => null);
  const handle = typeof body?.handle === "string" ? body.handle.trim() : "";

  if (!HANDLE_RE.test(handle))
    return badRequest("Handles are 3–20 characters: letters, numbers, underscore.");
  if (RESERVED.has(handle.toLowerCase()))
    return badRequest("That handle is reserved.");

  const clash = await prisma.user.findFirst({
    where: { handle: { equals: handle }, NOT: { id: userId } },
    select: { id: true },
  });
  if (clash) return badRequest("That handle is taken.", 409);

  const user = await prisma.user.update({
    where: { id: userId },
    data: { handle },
    select: { handle: true },
  });

  return Response.json({ ok: true, handle: user.handle });
}
