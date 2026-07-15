import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { Poster } from "@/components/Poster";
import { CoinBadge } from "@/components/CoinBadge";
import { scoreFor } from "@/lib/queries";
import {
  RemoveFromListButton,
  DeleteListButton,
} from "@/components/ListOwnerControls";

export const dynamic = "force-dynamic";

async function loadList(id: string) {
  return prisma.list.findUnique({
    where: { id },
    include: {
      user: { select: { handle: true } },
      items: {
        orderBy: { createdAt: "asc" },
        include: {
          series: {
            include: {
              tropeTags: { include: { trope: true } },
              logs: {
                select: {
                  status: true,
                  abandonedAtEp: true,
                  user: { select: { createdAt: true, bannedAt: true } },
                },
              },
              reviews: {
                select: {
                  stars: true,
                  worthCoins: true,
                  fallsApartAtEp: true,
                  user: { select: { createdAt: true, bannedAt: true } },
                },
              },
            },
          },
        },
      },
    },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const list = await loadList(id);
  if (!list) return { title: "Not found — DramaScore" };
  return {
    title: `${list.title} — a DramaScore list by @${list.user.handle ?? "anon"}`,
    description: list.description ?? `${list.items.length} short dramas, hand-picked.`,
  };
}

export default async function ListPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [list, user] = await Promise.all([loadList(id), getCurrentUser()]);
  if (!list) notFound();
  const isOwner = user?.id === list.userId;

  return (
    <main className="pb-8 pt-4">
      <div className="flex items-center gap-2 px-4">
        <Link href="/" className="text-2xl text-ink-faint">
          ‹
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-xl font-black">📃 {list.title}</h1>
        {isOwner && <DeleteListButton listId={list.id} />}
      </div>
      <p className="px-4 text-sm text-ink-soft">
        {list.items.length} series · by{" "}
        {list.user.handle ? (
          <Link href={`/u/${list.user.handle}`} className="text-brand">
            @{list.user.handle}
          </Link>
        ) : (
          "@anon"
        )}
      </p>
      {list.description && (
        <p className="mt-1 px-4 text-sm text-ink-faint">{list.description}</p>
      )}

      <ol className="mt-4 flex flex-col gap-2 px-4 lg:grid lg:grid-cols-2 lg:gap-3">
        {list.items.map((item, i) => {
          const s = item.series;
          const score = scoreFor(s);
          return (
            <li key={item.id} className="card flex items-center gap-3 p-2.5">
              <span className="w-6 shrink-0 text-center text-lg font-black tabular-nums text-ink-faint">
                {i + 1}
              </span>
              <Link
                href={`/series/${s.id}`}
                className="flex min-w-0 flex-1 items-center gap-3"
              >
                <Poster
                  title={s.canonicalTitle}
                  posterUrl={s.posterUrl}
                  showTitle={false}
                  className="h-14 w-10 shrink-0 rounded-lg"
                />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-bold">{s.canonicalTitle}</h3>
                  <p className="truncate text-xs text-ink-faint">
                    {s.episodeCount} eps ·{" "}
                    {s.tropeTags
                      .map((t) => t.trope.name)
                      .slice(0, 2)
                      .join(" · ")}
                  </p>
                </div>
                <CoinBadge score={score.score} size="sm" />
              </Link>
              {isOwner && (
                <RemoveFromListButton listId={list.id} seriesId={s.id} />
              )}
            </li>
          );
        })}
      </ol>

      {list.items.length === 0 && (
        <p className="px-4 pt-6 text-sm text-ink-soft">
          Empty list — add series from any series page (&quot;Save to list&quot;).
        </p>
      )}
    </main>
  );
}
