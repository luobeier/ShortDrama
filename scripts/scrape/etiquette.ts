/* eslint-disable no-console */
// Scraping etiquette — hard requirements, not suggestions:
//  - honest User-Agent (if a site blocks it, we stop; we never disguise)
//  - robots.txt is checked before the browser even launches, and FAILS CLOSED
//  - ≥2s + jitter between page navigations (Crawl-delay raises the floor)

export const USER_AGENT =
  "Mozilla/5.0 (compatible; DramaScoreBot/0.1; +mailto:luobeier@gmail.com; metadata-only, for a fan review index)";

const BOT_TOKEN = "dramascorebot";

interface RobotsRule {
  allow: boolean;
  path: string;
}

interface RobotsGroup {
  agents: string[];
  rules: RobotsRule[];
  crawlDelayMs: number | null;
}

function parseRobots(text: string): RobotsGroup[] {
  const groups: RobotsGroup[] = [];
  let current: RobotsGroup | null = null;
  let lastWasAgent = false;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const field = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();

    if (field === "user-agent") {
      if (!lastWasAgent || !current) {
        current = { agents: [], rules: [], crawlDelayMs: null };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
    } else if (current) {
      lastWasAgent = false;
      if (field === "disallow" || field === "allow") {
        if (value) current.rules.push({ allow: field === "allow", path: value });
        // An empty Disallow means "allow everything" — no rule needed.
      } else if (field === "crawl-delay") {
        const s = Number(value);
        if (Number.isFinite(s) && s > 0) current.crawlDelayMs = s * 1000;
      }
    }
  }
  return groups;
}

function groupFor(groups: RobotsGroup[], bot: string): RobotsGroup | null {
  // Most-specific agent match wins; fall back to "*".
  let best: RobotsGroup | null = null;
  let bestLen = -1;
  for (const g of groups) {
    for (const a of g.agents) {
      if (a === "*" && bestLen < 0) best = best ?? g;
      else if (bot.includes(a) && a.length > bestLen) {
        best = g;
        bestLen = a.length;
      }
    }
  }
  return best;
}

function pathAllowed(group: RobotsGroup, path: string): boolean {
  // Longest-match wins; Allow beats Disallow on equal length. No wildcards
  // beyond prefix matching — if a site uses '*' patterns we treat the segment
  // before the first '*' as the prefix (conservative enough for fail-closed).
  let verdict = true;
  let matchLen = -1;
  for (const rule of group.rules) {
    const prefix = rule.path.split("*")[0];
    if (path.startsWith(prefix)) {
      if (prefix.length > matchLen || (prefix.length === matchLen && rule.allow)) {
        matchLen = prefix.length;
        verdict = rule.allow;
      }
    }
  }
  return verdict;
}

/**
 * Fetch and evaluate robots.txt for every path the run will touch.
 * Throws (aborting the run) if ANY probe path is disallowed — fail closed.
 * Returns the delay floor (Crawl-delay-aware) to use between navigations.
 */
export async function checkRobots(origin: string, probePaths: string[]): Promise<number> {
  const url = `${origin}/robots.txt`;
  let text = "";
  try {
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (res.status >= 500) throw new Error(`robots.txt returned ${res.status}`);
    // 404 = no robots file = everything allowed.
    text = res.ok ? await res.text() : "";
  } catch (e) {
    throw new Error(
      `Could not evaluate ${url} (${e instanceof Error ? e.message : e}) — failing closed, run aborted.`
    );
  }

  const group = groupFor(parseRobots(text), BOT_TOKEN);
  if (group) {
    for (const p of probePaths) {
      if (!pathAllowed(group, p)) {
        throw new Error(`robots.txt disallows "${p}" for us — run aborted (we fail closed).`);
      }
    }
    if (group.crawlDelayMs) {
      console.log(`robots.txt Crawl-delay honored: ${group.crawlDelayMs / 1000}s`);
      return group.crawlDelayMs;
    }
  }
  return 0;
}

/** ≥2s between navigations, plus jitter; Crawl-delay can raise the floor. */
export async function politeDelay(floorMs = 0): Promise<void> {
  const base = Math.max(2000, floorMs);
  const jitter = Math.random() * 1000;
  await new Promise((r) => setTimeout(r, base + jitter));
}
