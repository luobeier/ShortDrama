import { ImageResponse } from "next/og";
import { getCurrentUser } from "@/lib/session";
import { getDiary } from "@/lib/diary";
import { posterGradient } from "@/lib/gradient";

export const runtime = "nodejs";

// "My DramaScore Wrapped" — a 1080×1920 share card generated from the diary.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("Sign in to generate your Wrapped.", { status: 401 });
  }
  const { stats } = await getDiary(user.id);
  const topSeries = stats.topRated[0];
  const accent = posterGradient(user.handle ?? user.id);

  return new ImageResponse(
    (
      <div
        style={{
          width: "1080px",
          height: "1920px",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(160deg, #0a0a0f 0%, #171225 55%, #0a0a0f 100%)",
          color: "#f4f4f8",
          padding: "90px 80px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "90px",
              height: "90px",
              borderRadius: "999px",
              background: "radial-gradient(circle at 35% 30%, #ffe08a, #f5a623 65%, #d98c0f)",
              color: "#3a2600",
              fontSize: "56px",
              fontWeight: 900,
            }}
          >
            D
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "40px", fontWeight: 900, letterSpacing: "-1px" }}>
              DramaScore
            </span>
            <span style={{ fontSize: "30px", color: "#b8b8c8" }}>@{user.handle}</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", marginTop: "60px" }}>
          <span style={{ fontSize: "56px", fontWeight: 800, color: "#ff4d7d" }}>
            MY DRAMASCORE
          </span>
          <span style={{ fontSize: "120px", fontWeight: 900, lineHeight: 1, letterSpacing: "-4px" }}>
            WRAPPED
          </span>
        </div>

        {/* Big numbers */}
        <div style={{ display: "flex", flexDirection: "column", gap: "36px", marginTop: "80px" }}>
          <BigStat label="dramas finished" value={String(stats.finished)} sub={`${stats.totalLogged} logged in total`} />
          <BigStat label="episodes watched" value={stats.episodesWatched.toLocaleString()} sub="that's a lot of cliffhangers" />
          <BigStat
            label="estimated coins spent"
            value={`$${stats.estimatedSpend.toFixed(2)}`}
            sub="estimated · no judgment 🪙"
          />
        </div>

        {/* Top tropes */}
        <div style={{ display: "flex", flexDirection: "column", marginTop: "70px" }}>
          <span style={{ fontSize: "34px", color: "#7a7a90", fontWeight: 700 }}>
            YOUR TOP TROPES
          </span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "20px", marginTop: "24px" }}>
            {(stats.topTropes.length ? stats.topTropes : [{ name: "still discovering", slug: "x", count: 0 }]).map(
              (t, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    fontSize: "40px",
                    fontWeight: 800,
                    padding: "18px 36px",
                    borderRadius: "999px",
                    background: i === 0 ? "#ff4d7d" : "#20202e",
                    color: i === 0 ? "#ffffff" : "#f4f4f8",
                  }}
                >
                  {t.name}
                </div>
              )
            )}
          </div>
        </div>

        {/* Top-rated series */}
        {topSeries && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "30px",
              marginTop: "auto",
              padding: "36px",
              borderRadius: "36px",
              background: "#12121a",
              border: "2px solid #2a2a3a",
            }}
          >
            <div
              style={{
                display: "flex",
                width: "120px",
                height: "170px",
                borderRadius: "20px",
                background: accent.css,
              }}
            />
            <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
              <span style={{ fontSize: "28px", color: "#7a7a90", fontWeight: 700 }}>
                MY #1 THIS YEAR
              </span>
              <span style={{ fontSize: "44px", fontWeight: 900, marginTop: "8px" }}>
                {topSeries.title}
              </span>
              <span style={{ fontSize: "40px", color: "#ffcc4d", marginTop: "6px" }}>
                {"★".repeat(Math.round(topSeries.stars))}
                {"☆".repeat(5 - Math.round(topSeries.stars))}
              </span>
            </div>
          </div>
        )}

        <span
          style={{
            fontSize: "30px",
            color: "#7a7a90",
            marginTop: topSeries ? "40px" : "auto",
            textAlign: "center",
            width: "100%",
          }}
        >
          made on DramaScore · is it worth your coins?
        </span>
      </div>
    ),
    {
      width: 1080,
      height: 1920,
      headers: { "Cache-Control": "no-store" },
    }
  );
}

function BigStat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: "24px" }}>
        <span style={{ fontSize: "96px", fontWeight: 900, color: "#ffcc4d", lineHeight: 1 }}>
          {value}
        </span>
        <span style={{ fontSize: "40px", fontWeight: 700, color: "#f4f4f8" }}>{label}</span>
      </div>
      <span style={{ fontSize: "28px", color: "#7a7a90", marginTop: "6px" }}>{sub}</span>
    </div>
  );
}
