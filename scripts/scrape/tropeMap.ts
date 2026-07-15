// Platform genre labels → our 30 trope slugs. Conservative on purpose: only
// unambiguous mappings. Everything else rides along in `_unmappedGenres` for
// a human to tag during the import spot-check.

const GENRE_TO_SLUG: Record<string, string> = {
  // billionaire / CEO
  billionaire: "billionaire-ceo",
  ceo: "billionaire-ceo",
  "billionaire ceo": "billionaire-ceo",
  tycoon: "billionaire-ceo",
  // werewolf-verse
  werewolf: "werewolf",
  "alpha male": "alpha-mate",
  alpha: "alpha-mate",
  luna: "alpha-mate",
  mate: "alpha-mate",
  // revenge & comebacks
  revenge: "revenge",
  counterattack: "comeback-queen",
  comeback: "comeback-queen",
  "face slap": "face-slapping",
  "face-slapping": "face-slapping",
  // marriage shapes
  "contract marriage": "contract-marriage",
  "flash marriage": "flash-marriage",
  "arranged marriage": "arranged-marriage",
  "substitute bride": "substitute-bride",
  "fake dating": "fake-dating",
  "fake relationship": "fake-dating",
  divorce: "divorce-regret",
  regret: "divorce-regret",
  // identity
  "hidden identity": "hidden-identity",
  "secret identity": "hidden-identity",
  heiress: "disguised-heiress",
  "true heiress": "disguised-heiress",
  cinderella: "cinderella",
  "rags to riches": "rags-to-riches",
  underdog: "rags-to-riches",
  // babies & paternity
  "secret baby": "secret-baby",
  "hidden baby": "secret-baby",
  paternity: "paternity-secret",
  // time & rebirth
  rebirth: "rebirth",
  reborn: "rebirth",
  "time travel": "time-travel",
  "second chance": "second-chance",
  // relationships
  "enemies to lovers": "enemies-to-lovers",
  "forbidden love": "forbidden-love",
  "age gap": "age-gap",
  "love triangle": "love-triangle",
  bodyguard: "bodyguard-romance",
  // settings & factions
  mafia: "mafia",
  campus: "campus",
  amnesia: "amnesia",
  // ReelShort taxonomy (tag_list texts observed 2026-07-15)
  "contract lovers": "contract-marriage",
  "identity reveal": "hidden-identity",
  "crime lord": "mafia",
  reincarnation: "rebirth",
  // DramaBox taxonomy (labels/typeTwoNames observed 2026-07-16)
  "concealed identity": "hidden-identity",
  "second-chance love": "second-chance",
  "winning her back": "divorce-regret",
};

export function mapGenres(labels: string[]): { slugs: string[]; unmapped: string[] } {
  const slugs = new Set<string>();
  const unmapped: string[] = [];
  for (const raw of labels) {
    const label = raw.trim().toLowerCase();
    if (!label) continue;
    const slug = GENRE_TO_SLUG[label];
    if (slug) slugs.add(slug);
    else unmapped.push(raw.trim());
  }
  return { slugs: [...slugs], unmapped };
}
