import { ImageResponse } from "@vercel/og";
import { getSeriesDetail } from "@/lib/seriesDetail";
import { posterGradient, posterInitials } from "@/lib/gradient";
import { scoreBand } from "@/lib/score";
import { ogFonts } from "@/lib/ogFonts";

// Link-preview card for series pages — every pasted Reddit/Discord link
// becomes a poster + Coin Score ad. Uses the same deterministic gradient as
// the in-app posters.

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "DramaScore — is it worth your coins?";

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const series = await getSeriesDetail(id);

  if (!series) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#0a0a0f",
            color: "#f4f4f8",
            fontSize: 64,
            fontWeight: 900,
          }}
        >
          DramaScore
        </div>
      ),
      { ...size, fonts: ogFonts() }
    );
  }

  const g = posterGradient(series.canonicalTitle);
  const score = series.score.score;
  const band = score !== null ? scoreBand(score).label : "Not enough reviews yet";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#0a0a0f",
          color: "#f4f4f8",
          fontFamily: "sans-serif",
        }}
      >
        {/* Poster panel */}
        <div
          style={{
            width: 340,
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: g.css,
            fontSize: 110,
            fontWeight: 900,
            color: "rgba(255,255,255,0.92)",
          }}
        >
          {posterInitials(series.canonicalTitle)}
        </div>

        {/* Text panel */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "0 64px",
            gap: 24,
          }}
        >
          <div style={{ display: "flex", fontSize: 26, color: "#ffcc4d", fontWeight: 700 }}>
            🪙 DramaScore
          </div>
          <div
            style={{
              display: "flex",
              fontSize: series.canonicalTitle.length > 40 ? 44 : 56,
              fontWeight: 900,
              lineHeight: 1.1,
            }}
          >
            {series.canonicalTitle}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
            <div
              style={{
                width: 130,
                height: 130,
                borderRadius: 999,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background:
                  score !== null
                    ? "radial-gradient(circle at 35% 30%, #ffe08a, #f5a623 65%, #d98c0f)"
                    : "radial-gradient(circle at 35% 30%, #2a2a38, #16161f)",
                color: score !== null ? "#3a2600" : "#7a7a90",
                fontSize: 56,
                fontWeight: 900,
                boxShadow: "0 6px 0 0 #8a5a00",
              }}
            >
              {score !== null ? score : "??"}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", fontSize: 34, fontWeight: 700 }}>{band}</div>
              <div style={{ display: "flex", fontSize: 24, color: "#b8b8c8" }}>
                {series.totalReviewCount} reviews · {series.episodeCount} episodes
              </div>
            </div>
          </div>
          <div style={{ display: "flex", fontSize: 24, color: "#7a7a90" }}>
            Is it worth your coins? Real logs from people who binged it first.
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: ogFonts() }
  );
}
