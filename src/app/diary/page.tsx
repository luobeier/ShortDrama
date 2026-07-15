import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getDiary } from "@/lib/diary";
import { prisma } from "@/lib/prisma";
import { DiaryClient } from "@/components/DiaryClient";
import { EmptyState } from "@/components/EmptyState";

export const dynamic = "force-dynamic";

export default async function DiaryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/signin?next=/diary");
  if (!user.handle) redirect("/onboarding");

  const [{ entries, stats }, lists] = await Promise.all([
    getDiary(user.id),
    prisma.list.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { items: true } } },
    }),
  ]);

  return (
    <main className="pb-8 pt-5">
      <div className="flex items-center justify-between px-4">
        <div>
          <h1 className="text-2xl font-black">My diary</h1>
          <p className="text-sm text-ink-soft">Everything you&apos;ve logged, @{user.handle}</p>
        </div>
        {stats.totalLogged > 0 && (
          <Link href="/share" className="btn-coin px-3 py-2 text-sm">
            🎁 Wrapped
          </Link>
        )}
      </div>

      {lists.length > 0 && (
        <div className="mt-4 px-4">
          <p className="mb-2 text-xs font-black uppercase tracking-wide text-ink-faint">
            📃 My lists
          </p>
          <div className="no-scrollbar flex gap-2 overflow-x-auto">
            {lists.map((l) => (
              <Link key={l.id} href={`/list/${l.id}`} className="chip">
                {l.title} <span className="text-ink-faint">{l._count.items}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {entries.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            emoji="📖"
            title="Your diary is empty"
            body="Log the last drama you binged — even the one you rage-quit at ep 12. It all counts."
            ctaLabel="Find something to log"
            ctaHref="/"
          />
        </div>
      ) : (
        <DiaryClient entries={entries} stats={stats} />
      )}
    </main>
  );
}
