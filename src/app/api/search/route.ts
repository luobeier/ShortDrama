import { searchSeries } from "@/lib/queries";

/** Typeahead endpoint: top matches as lightweight rows for the dropdown. */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  if (q.trim().length < 2) return Response.json({ results: [] });

  const results = (await searchSeries(q)).slice(0, 6).map((s) => ({
    id: s.id,
    title: s.canonicalTitle,
    episodeCount: s.episodeCount,
    score: s.score.score,
  }));
  return Response.json({ results });
}
