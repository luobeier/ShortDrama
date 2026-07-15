import { ImageResponse } from "@vercel/og";
import { prisma } from "@/lib/prisma";
import { posterGradient } from "@/lib/gradient";
import { ogFonts } from "@/lib/ogFonts";
import {
  ENDING_VERDICT_EMOJI,
  ENDING_VERDICT_LABELS,
  isEndingVerdict,
} from "@/lib/enums";

// A single review as a shareable 4:5 image — the viral unit is one spicy
// one-liner, not the yearly Wrapped. Public by design: sharing is the point.

const WIDTH = 1080;
const HEIGHT = 1350;

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id") ?? "";
  const review = await prisma.review.findUnique({
    where: { id },
    include: {
      user: { select: { handle: true, bannedAt: true } },
      series: { select: { canonicalTitle: true, episodeCount: true } },
    },
  });
  if (!review || review.user.bannedAt) {
    return new Response("Not found", { status: 404 });
  }

  const g = posterGradient(review.series.canonicalTitle);
  const verdict = isEndingVerdict(review.endingVerdict) ? review.endingVerdict : "na";
  // ⭐ (emoji) renders via the emoji pipeline; ★/☆ glyphs aren't in the
  // bundled Latin font and would show as tofu boxes.
  const stars = "⭐".repeat(review.stars);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: `linear-gradient(rgba(10,10,15,0.82), rgba(10,10,15,0.94)), ${g.css}`,
          color: "#f4f4f8",
          padding: 80,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 34, color: "#ffcc4d", fontWeight: 700 }}>
          🪙 DramaScore
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 36,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              fontSize: 56,
              color: "#ffcc4d",
            }}
          >
            <span>{stars}</span>
            <span style={{ fontSize: 40, color: "#7a7a90" }}>{review.stars}/5</span>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 40,
              fontWeight: 700,
              color: review.worthCoins ? "#ffcc4d" : "#ff5c5c",
            }}
          >
            {review.worthCoins ? "🪙 Worth your coins" : "🪙 Not worth your coins"}
          </div>
          {review.oneLiner && (
            <div
              style={{
                display: "flex",
                fontSize: review.oneLiner.length > 120 ? 44 : 56,
                fontWeight: 900,
                lineHeight: 1.25,
              }}
            >
              “{review.oneLiner}”
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", fontSize: 32, color: "#b8b8c8" }}>
              {ENDING_VERDICT_EMOJI[verdict]} Ending: {ENDING_VERDICT_LABELS[verdict]}
            </div>
            {review.fallsApartAtEp != null && (
              <div style={{ display: "flex", fontSize: 32, color: "#ffb020" }}>
                📉 Falls apart around ep {review.fallsApartAtEp}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", fontSize: 44, fontWeight: 900 }}>
            {review.series.canonicalTitle}
          </div>
          <div style={{ display: "flex", fontSize: 28, color: "#7a7a90" }}>
            {review.series.episodeCount} episodes · reviewed by @
            {review.user.handle ?? "anon"} · dramascore
          </div>
        </div>
      </div>
    ),
    { width: WIDTH, height: HEIGHT, fonts: ogFonts() }
  );
}
