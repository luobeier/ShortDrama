// Deterministic gradient placeholder posters — no real posters hotlinked.
// A stable hash of the title picks two hues so every series has a consistent,
// recognizable colored card.

function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export interface PosterGradient {
  from: string;
  to: string;
  angle: number;
  css: string;
}

export function posterGradient(seed: string): PosterGradient {
  const h = hashString(seed);
  const hue1 = h % 360;
  const hue2 = (hue1 + 40 + ((h >> 8) % 80)) % 360;
  const angle = 115 + ((h >> 16) % 90);
  const from = `hsl(${hue1} 70% 42%)`;
  const to = `hsl(${hue2} 65% 22%)`;
  return {
    from,
    to,
    angle,
    css: `linear-gradient(${angle}deg, ${from}, ${to})`,
  };
}

/** Initials for the poster overlay (up to 2 words). */
export function posterInitials(title: string): string {
  const words = title.replace(/[^a-zA-Z0-9 ]/g, "").trim().split(/\s+/);
  const letters = words
    .filter((w) => !["the", "a", "of", "to", "and"].includes(w.toLowerCase()))
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "");
  return letters.join("") || title.slice(0, 2).toUpperCase();
}
