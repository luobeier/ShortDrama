import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { badRequest } from "@/lib/validate";
import { revalidatePath } from "next/cache";

const MAX_LISTS_PER_USER = 30;
const MAX_ITEMS_PER_LIST = 100;

/**
 * User-curated lists, action-dispatched like the admin API:
 *  createList { title, description?, seriesId? }  (seriesId = seed first item)
 *  deleteList { listId }
 *  addItem    { listId, seriesId }
 *  removeItem { listId, seriesId }
 */
export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return badRequest("You need to sign in first.", 401);

  const body = await req.json().catch(() => null);
  if (!body?.action) return badRequest("Missing action.");

  switch (body.action) {
    case "createList": {
      const title = typeof body.title === "string" ? body.title.trim().slice(0, 80) : "";
      if (!title) return badRequest("Your list needs a name.");
      const description =
        typeof body.description === "string" && body.description.trim()
          ? body.description.trim().slice(0, 280)
          : null;
      const count = await prisma.list.count({ where: { userId } });
      if (count >= MAX_LISTS_PER_USER) return badRequest("List limit reached.", 429);

      const seriesId = typeof body.seriesId === "string" ? body.seriesId : null;
      const list = await prisma.list.create({
        data: {
          userId,
          title,
          description,
          ...(seriesId ? { items: { create: [{ seriesId }] } } : {}),
        },
      });
      revalidatePath(`/list/${list.id}`);
      return Response.json({ ok: true, id: list.id });
    }

    case "deleteList": {
      const listId = String(body.listId ?? "");
      const list = await prisma.list.findUnique({ where: { id: listId } });
      if (!list || list.userId !== userId) return badRequest("List not found.", 404);
      await prisma.list.delete({ where: { id: listId } });
      return Response.json({ ok: true });
    }

    case "addItem":
    case "removeItem": {
      const listId = String(body.listId ?? "");
      const seriesId = String(body.seriesId ?? "");
      const list = await prisma.list.findUnique({
        where: { id: listId },
        include: { _count: { select: { items: true } } },
      });
      if (!list || list.userId !== userId) return badRequest("List not found.", 404);

      if (body.action === "addItem") {
        if (list._count.items >= MAX_ITEMS_PER_LIST)
          return badRequest("This list is full.", 429);
        await prisma.listItem
          .create({ data: { listId, seriesId } })
          .catch(() => null); // already in the list — fine
      } else {
        await prisma.listItem.deleteMany({ where: { listId, seriesId } });
      }
      revalidatePath(`/list/${listId}`);
      return Response.json({ ok: true });
    }

    default:
      return badRequest("Unknown action.");
  }
}
