import { prisma } from "./prisma";
import { episodesWatchedFor, estimatedSpendFor } from "./spend";

export { COIN_PER_EP, FREE_EP_RUNWAY } from "./spend";

export interface DiaryEntry {
  seriesId: string;
  title: string;
  status: string;
  platform: string;
  episodeCount: number;
  abandonedAtEp: number | null;
  tropes: { name: string; slug: string }[];
  myStars: number | null;
  myWorthCoins: boolean | null;
  episodesWatched: number;
  loggedAt: string;
}

export interface DiaryStats {
  totalLogged: number;
  finished: number;
  abandoned: number;
  watching: number;
  episodesWatched: number;
  estimatedSpend: number;
  topTropes: { name: string; slug: string; count: number }[];
  topRated: { seriesId: string; title: string; stars: number }[];
}

export { episodesWatchedFor } from "./spend";

export async function getDiary(
  userId: string
): Promise<{ entries: DiaryEntry[]; stats: DiaryStats }> {
  const logs = await prisma.log.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: {
      series: {
        include: { tropeTags: { include: { trope: true } } },
      },
    },
  });

  const reviews = await prisma.review.findMany({
    where: { userId },
    select: { seriesId: true, stars: true, worthCoins: true },
  });
  const reviewBySeries = new Map(reviews.map((r) => [r.seriesId, r]));

  const entries: DiaryEntry[] = logs.map((l) => {
    const episodesWatched = episodesWatchedFor({
      status: l.status,
      episodeCount: l.series.episodeCount,
      abandonedAtEp: l.abandonedAtEp,
    });
    const review = reviewBySeries.get(l.seriesId);
    return {
      seriesId: l.seriesId,
      title: l.series.canonicalTitle,
      status: l.status,
      platform: l.platformWatchedOn,
      episodeCount: l.series.episodeCount,
      abandonedAtEp: l.abandonedAtEp,
      tropes: l.series.tropeTags.map((t) => ({
        name: t.trope.name,
        slug: t.trope.slug,
      })),
      myStars: review?.stars ?? null,
      myWorthCoins: review?.worthCoins ?? null,
      episodesWatched,
      loggedAt: l.updatedAt.toISOString(),
    };
  });

  const finished = entries.filter((e) => e.status === "finished").length;
  const abandoned = entries.filter((e) => e.status === "abandoned").length;
  const watching = entries.filter((e) => e.status === "watching").length;
  const episodesWatched = entries.reduce((s, e) => s + e.episodesWatched, 0);
  const estimatedSpend = entries.reduce(
    (s, e) => s + estimatedSpendFor(e.episodesWatched),
    0
  );

  const tropeTally = new Map<string, { name: string; slug: string; count: number }>();
  for (const e of entries) {
    for (const t of e.tropes) {
      const cur = tropeTally.get(t.slug) ?? { ...t, count: 0 };
      cur.count += 1;
      tropeTally.set(t.slug, cur);
    }
  }
  const topTropes = [...tropeTally.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  const topRated = entries
    .filter((e) => e.myStars != null)
    .sort((a, b) => (b.myStars ?? 0) - (a.myStars ?? 0))
    .slice(0, 5)
    .map((e) => ({ seriesId: e.seriesId, title: e.title, stars: e.myStars! }));

  return {
    entries,
    stats: {
      totalLogged: entries.length,
      finished,
      abandoned,
      watching,
      episodesWatched,
      estimatedSpend: Math.round(estimatedSpend * 100) / 100,
      topTropes,
      topRated,
    },
  };
}
