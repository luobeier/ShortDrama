import { redirect } from "next/navigation";
import Link from "next/link";
import { isAdmin, adminEnabled } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AdminClient } from "@/components/AdminClient";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!adminEnabled()) {
    return (
      <main className="min-h-dvh px-6 pt-20 text-center">
        <h1 className="text-xl font-black">Admin is disabled</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Set <code className="text-coin">ADMIN_EMAILS</code> in your environment to enable it.
        </p>
        <Link href="/" className="btn-ghost mt-6 inline-flex">
          Back home
        </Link>
      </main>
    );
  }
  if (!(await isAdmin())) redirect("/signin?next=/admin");

  const [series, tropes, reports] = await Promise.all([
    prisma.series.findMany({
      orderBy: { canonicalTitle: "asc" },
      select: {
        id: true,
        canonicalTitle: true,
        episodeCount: true,
        status: true,
        synopsis: true,
        posterUrl: true,
        tropeTags: { select: { tropeId: true } },
        _count: { select: { logs: true, reviews: true, aliases: true } },
      },
    }),
    prisma.trope.findMany({ orderBy: { name: "asc" } }),
    prisma.report.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        reporter: { select: { handle: true } },
        review: {
          include: {
            user: { select: { id: true, handle: true, bannedAt: true } },
            series: { select: { id: true, canonicalTitle: true } },
          },
        },
      },
    }),
  ]);

  return (
    <main className="pb-10 pt-6">
      <div className="flex items-center justify-between px-4">
        <h1 className="text-2xl font-black">Admin</h1>
        <Link href="/" className="text-sm text-ink-faint">
          ‹ back
        </Link>
      </div>
      <p className="px-4 pb-4 text-sm text-ink-soft">
        {series.length} series · {tropes.length} tropes
      </p>
      <AdminClient
        series={series.map((s) => ({
          id: s.id,
          canonicalTitle: s.canonicalTitle,
          episodeCount: s.episodeCount,
          status: s.status,
          synopsis: s.synopsis,
          posterUrl: s.posterUrl,
          tropeIds: s.tropeTags.map((t) => t.tropeId),
          logs: s._count.logs,
          reviews: s._count.reviews,
          aliases: s._count.aliases,
        }))}
        tropes={tropes.map((t) => ({ id: t.id, name: t.name, slug: t.slug }))}
        reports={reports.map((r) => ({
          id: r.id,
          reason: r.reason,
          createdAt: r.createdAt.toISOString(),
          reporterHandle: r.reporter.handle,
          reviewId: r.review.id,
          stars: r.review.stars,
          oneLiner: r.review.oneLiner,
          authorId: r.review.user.id,
          authorHandle: r.review.user.handle,
          authorBanned: r.review.user.bannedAt !== null,
          seriesId: r.review.series.id,
          seriesTitle: r.review.series.canonicalTitle,
        }))}
      />
    </main>
  );
}
