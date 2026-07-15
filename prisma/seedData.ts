// Seed catalog data, extracted from seed.ts so the app (e.g. the admin
// purge action) can reference the placeholder titles without pulling in the
// seeding logic. Pure data — no Prisma, no side effects.

// --- Tropes (30) ------------------------------------------------------------
export const TROPES: string[] = [
  "contract-marriage",
  "hidden-identity",
  "revenge",
  "billionaire-ceo",
  "werewolf",
  "second-chance",
  "secret-baby",
  "divorce-regret",
  "mafia",
  "substitute-bride",
  "flash-marriage",
  "disguised-heiress",
  "love-triangle",
  "age-gap",
  "enemies-to-lovers",
  "comeback-queen",
  "amnesia",
  "arranged-marriage",
  "bodyguard-romance",
  "campus",
  "time-travel",
  "rebirth",
  "face-slapping",
  "cinderella",
  "alpha-mate",
  "forbidden-love",
  "fake-dating",
  "rags-to-riches",
  "vengeful-ex",
  "paternity-secret",
];

// --- 30 series --------------------------------------------------------------
export interface SeedSeries {
  title: string;
  synopsis: string;
  tropes: string[];
  eps: number;
  status: "ongoing" | "complete";
  aliases: { title: string; platform: string }[];
}

export const SERIES: SeedSeries[] = [
  {
    title: "Married to the Billionaire's Shadow",
    synopsis:
      "A struggling nurse signs a one-year contract marriage to a reclusive CEO — never guessing he's the masked stranger who saved her life.",
    tropes: ["contract-marriage", "billionaire-ceo", "hidden-identity"],
    eps: 68,
    status: "complete",
    aliases: [
      { title: "The Shadow CEO's Contract Wife", platform: "ReelShort" },
      { title: "Hidden Boss, Secret Vows", platform: "DramaBox" },
    ],
  },
  {
    title: "My Ex-Husband Begs for a Second Chance",
    synopsis:
      "Three years after signing the divorce papers, the tycoon who threw her away discovers exactly what he lost — and she's not coming back quietly.",
    tropes: ["divorce-regret", "second-chance", "comeback-queen", "face-slapping"],
    eps: 74,
    status: "complete",
    aliases: [
      { title: "Divorce Me? You'll Regret It", platform: "DramaBox" },
      { title: "Too Late, Mr. President", platform: "GoodShort" },
    ],
  },
  {
    title: "The Alpha's Rejected Luna",
    synopsis:
      "Rejected by her fated mate at eighteen, she returns five years later as the most powerful she-wolf the packs have ever feared.",
    tropes: ["werewolf", "alpha-mate", "rejected", "comeback-queen", "second-chance"].filter((t) =>
      TROPES.includes(t)
    ),
    eps: 92,
    status: "ongoing",
    aliases: [
      { title: "Rejected by My Alpha Mate", platform: "ReelShort" },
      { title: "Luna's Revenge", platform: "ShortMax" },
    ],
  },
  {
    title: "Substitute Bride for the Cold Heir",
    synopsis:
      "She walked down the aisle in her sister's place — and accidentally married the one man her family was terrified of.",
    tropes: ["substitute-bride", "arranged-marriage", "billionaire-ceo", "enemies-to-lovers"],
    eps: 60,
    status: "complete",
    aliases: [
      { title: "The Cold Heir's Stand-In Wife", platform: "GoodShort" },
      { title: "Wrong Bride, Right Groom", platform: "ShortTV" },
    ],
  },
  {
    title: "Reborn to Ruin the Scumbag CEO",
    synopsis:
      "Betrayed and murdered by the husband she trusted, she wakes up on their wedding day — and this time, the knife points the other way.",
    tropes: ["rebirth", "revenge", "billionaire-ceo", "vengeful-ex", "face-slapping"],
    eps: 88,
    status: "ongoing",
    aliases: [
      { title: "Rebirth: The CEO's Downfall", platform: "DramaBox" },
      { title: "I Came Back for Revenge", platform: "ReelShort" },
    ],
  },
  {
    title: "The Nanny Who Hid a Secret Baby",
    synopsis:
      "She takes a job caring for a billionaire's son — never telling him the boy has the same eyes as the daughter she's hiding.",
    tropes: ["secret-baby", "billionaire-ceo", "paternity-secret", "second-chance"],
    eps: 66,
    status: "complete",
    aliases: [
      { title: "Daddy Doesn't Know", platform: "ShortMax" },
      { title: "The Billionaire's Hidden Twins", platform: "DramaBox" },
    ],
  },
  {
    title: "Bodyguard, Protect My Heart",
    synopsis:
      "A pop princess hires a stone-faced ex-soldier to keep her safe from a stalker — the one threat neither of them planned for was each other.",
    tropes: ["bodyguard-romance", "forbidden-love", "hidden-identity"],
    eps: 54,
    status: "complete",
    aliases: [{ title: "My Silent Bodyguard", platform: "GoodShort" }],
  },
  {
    title: "Flash Marriage to a Mysterious Tycoon",
    synopsis:
      "Dumped at her own engagement party, she marries a stranger from the bar in a fit of rage — then reads his name in the morning headlines.",
    tropes: ["flash-marriage", "billionaire-ceo", "hidden-identity", "enemies-to-lovers"],
    eps: 70,
    status: "ongoing",
    aliases: [
      { title: "24-Hour Marriage", platform: "ReelShort" },
      { title: "Married a Stranger, Woke Up Rich", platform: "ShortTV" },
    ],
  },
  {
    title: "The Disguised Heiress Returns",
    synopsis:
      "Everyone thinks she's a penniless country girl. They're about to learn she owns the building they're standing in.",
    tropes: ["disguised-heiress", "rags-to-riches", "face-slapping", "comeback-queen"],
    eps: 80,
    status: "ongoing",
    aliases: [
      { title: "Hidden Heiress, Real Boss", platform: "DramaBox" },
      { title: "Underestimate Me Again", platform: "ShortMax" },
    ],
  },
  {
    title: "Twin Sister, Stolen Life",
    synopsis:
      "Her identical twin stole her fiancé, her company, and her name. Now she's back to take all three — with interest.",
    tropes: ["revenge", "face-slapping", "substitute-bride", "comeback-queen"],
    eps: 76,
    status: "complete",
    aliases: [{ title: "The Twin's Revenge", platform: "GoodShort" }],
  },
  {
    title: "CEO Daddy's Little Matchmaker",
    synopsis:
      "A five-year-old genius decides the barista who spilled coffee on his father would make the perfect new mommy — and refuses to take no for an answer.",
    tropes: ["billionaire-ceo", "secret-baby", "fake-dating", "cinderella"],
    eps: 58,
    status: "complete",
    aliases: [
      { title: "My Little Cupid", platform: "ShortTV" },
      { title: "The CEO's Matchmaking Kid", platform: "ReelShort" },
    ],
  },
  {
    title: "Falling for the Mafia King",
    synopsis:
      "She witnessed the wrong murder. Now the only man who can protect her is the crime lord who ordered it.",
    tropes: ["mafia", "forbidden-love", "bodyguard-romance", "enemies-to-lovers"],
    eps: 84,
    status: "ongoing",
    aliases: [
      { title: "The Mafia's Reluctant Bride", platform: "ShortMax" },
      { title: "Married to the Don", platform: "DramaBox" },
    ],
  },
  {
    title: "Second Chance at the Altar",
    synopsis:
      "Left at the altar once, she swore off love — until the man who ran returns a decade later begging for the wedding they never had.",
    tropes: ["second-chance", "divorce-regret", "vengeful-ex"],
    eps: 62,
    status: "complete",
    aliases: [{ title: "Runaway Groom's Return", platform: "GoodShort" }],
  },
  {
    title: "The Professor and His Forbidden Muse",
    synopsis:
      "She's the brightest student in his class. He's the youngest professor in the department. Neither should cross the line — so of course they do.",
    tropes: ["campus", "age-gap", "forbidden-love", "enemies-to-lovers"],
    eps: 48,
    status: "complete",
    aliases: [{ title: "Off-Limits Lecture", platform: "ShortTV" }],
  },
  {
    title: "Amnesia Bride of the War God",
    synopsis:
      "She wakes with no memory in a stranger's mansion, a ring on her finger and a husband who insists she once loved him more than life.",
    tropes: ["amnesia", "arranged-marriage", "billionaire-ceo", "second-chance"],
    eps: 72,
    status: "ongoing",
    aliases: [
      { title: "Forgotten Vows", platform: "ReelShort" },
      { title: "I Forgot I Married You", platform: "ShortMax" },
    ],
  },
  {
    title: "Time-Traveled to Marry My Enemy",
    synopsis:
      "A modern surgeon wakes in an ancient palace as the bride of the ruthless general her family spent generations trying to destroy.",
    tropes: ["time-travel", "arranged-marriage", "enemies-to-lovers", "forbidden-love"],
    eps: 90,
    status: "ongoing",
    aliases: [{ title: "Palace of the Enemy General", platform: "DramaBox" }],
  },
  {
    title: "The Cinderella Coder",
    synopsis:
      "A janitor at a tech giant secretly patches the bug that saves the company — and catches the eye of the CEO who thinks she's just staff.",
    tropes: ["cinderella", "billionaire-ceo", "rags-to-riches", "hidden-identity"],
    eps: 56,
    status: "complete",
    aliases: [{ title: "The Girl Who Fixed the Code", platform: "GoodShort" }],
  },
  {
    title: "Pregnant by the Ruthless Tycoon",
    synopsis:
      "One reckless night, one positive test, and one man who will burn the world down before he lets her raise his child alone.",
    tropes: ["secret-baby", "flash-marriage", "billionaire-ceo", "paternity-secret"],
    eps: 78,
    status: "ongoing",
    aliases: [
      { title: "The Tycoon's Accidental Heir", platform: "ReelShort" },
      { title: "One Night, Two Lines", platform: "ShortTV" },
    ],
  },
  {
    title: "Rejected Mate, Crowned Queen",
    synopsis:
      "Cast out by the pack that raised her, she stumbles into the territory of a rival alpha who sees the queen everyone else refused to.",
    tropes: ["werewolf", "alpha-mate", "second-chance", "comeback-queen"],
    eps: 96,
    status: "ongoing",
    aliases: [
      { title: "The Rejected Wolf Queen", platform: "ShortMax" },
      { title: "Crowned by the Enemy Alpha", platform: "DramaBox" },
    ],
  },
  {
    title: "My Fake Fiancé Is the Real Deal",
    synopsis:
      "To dodge her family's setups, she hires a broke actor to play her boyfriend — right up until the tabloids reveal he's a hidden billionaire.",
    tropes: ["fake-dating", "billionaire-ceo", "hidden-identity", "cinderella"],
    eps: 64,
    status: "complete",
    aliases: [{ title: "Rent-a-Boyfriend Gone Wrong", platform: "GoodShort" }],
  },
  {
    title: "The Heiress Who Played Poor",
    synopsis:
      "To test whether anyone could love her without her fortune, she moves into a walk-up and takes a waitressing job — then falls for a customer with secrets of his own.",
    tropes: ["disguised-heiress", "cinderella", "hidden-identity", "rags-to-riches"],
    eps: 52,
    status: "complete",
    aliases: [{ title: "Rich Girl, Poor Disguise", platform: "ShortTV" }],
  },
  {
    title: "Vengeance of the Discarded Wife",
    synopsis:
      "He divorced her to marry her rival. Five years later she owns his creditors, his board, and every card he has left to play.",
    tropes: ["divorce-regret", "revenge", "comeback-queen", "face-slapping", "vengeful-ex"],
    eps: 86,
    status: "ongoing",
    aliases: [
      { title: "You Divorced the Wrong Woman", platform: "ReelShort" },
      { title: "The Discarded Wife's Empire", platform: "ShortMax" },
    ],
  },
  {
    title: "Bound to the Cold Bodyguard",
    synopsis:
      "Her father assigns her a bodyguard she can't stand — until the night someone tries to make sure she never sees morning.",
    tropes: ["bodyguard-romance", "enemies-to-lovers", "forbidden-love", "age-gap"],
    eps: 50,
    status: "complete",
    aliases: [{ title: "Guarded by My Enemy", platform: "DramaBox" }],
  },
  {
    title: "Secret Baby of the Snow Mountain",
    synopsis:
      "Stranded together in a blizzard years ago, they never exchanged names. Now their daughter has her father's rare, unmistakable eyes.",
    tropes: ["secret-baby", "paternity-secret", "second-chance", "hidden-identity"],
    eps: 68,
    status: "complete",
    aliases: [{ title: "The Blizzard's Secret", platform: "GoodShort" }],
  },
  {
    title: "Contract Wife of the Ice President",
    synopsis:
      "Six months, no feelings, generous terms — the perfect arrangement, until the ice president starts breaking every clause he wrote.",
    tropes: ["contract-marriage", "billionaire-ceo", "enemies-to-lovers", "flash-marriage"],
    eps: 74,
    status: "ongoing",
    aliases: [
      { title: "The Ice President's Contract", platform: "ShortTV" },
      { title: "Six Month Wife", platform: "ReelShort" },
    ],
  },
  {
    title: "Reborn as the Villain's Favorite",
    synopsis:
      "She died as the tragic side character. Reborn into the same story, she decides that this time she'll befriend the villain everyone fears.",
    tropes: ["rebirth", "second-chance", "enemies-to-lovers", "forbidden-love"],
    eps: 82,
    status: "ongoing",
    aliases: [{ title: "The Villain Picked Me", platform: "DramaBox" }],
  },
  {
    title: "The Campus Queen's Downfall",
    synopsis:
      "The most popular girl in school framed the quiet transfer student — never realizing the new girl transferred in specifically to end her.",
    tropes: ["campus", "revenge", "face-slapping", "comeback-queen"],
    eps: 46,
    status: "complete",
    aliases: [{ title: "New Girl, Old Grudge", platform: "ShortMax" }],
  },
  {
    title: "Married the CEO by Mistake",
    synopsis:
      "A clerical error at city hall legally weds her to the country's most eligible bachelor. Fixing it turns out to be the last thing either wants.",
    tropes: ["flash-marriage", "billionaire-ceo", "fake-dating", "cinderella"],
    eps: 60,
    status: "complete",
    aliases: [
      { title: "Accidentally Mrs. CEO", platform: "GoodShort" },
      { title: "The Paperwork Marriage", platform: "ShortTV" },
    ],
  },
  {
    title: "The General's Runaway Concubine",
    synopsis:
      "Sold into a warlord's household, she plots her escape at every turn — until the general starts letting the doors stay unlocked.",
    tropes: ["time-travel", "arranged-marriage", "forbidden-love", "age-gap"],
    eps: 94,
    status: "ongoing",
    aliases: [{ title: "Runaway Bride of the Warlord", platform: "DramaBox" }],
  },
  {
    title: "Paternity Twist at the Gala",
    synopsis:
      "A live DNA reveal at a charity gala detonates three families' secrets — and the child at the center of it all is hers.",
    tropes: ["paternity-secret", "secret-baby", "revenge", "billionaire-ceo", "face-slapping"],
    eps: 70,
    status: "ongoing",
    aliases: [
      { title: "The Gala Secret", platform: "ReelShort" },
      { title: "Whose Baby Is It", platform: "ShortMax" },
    ],
  },
];

/** Exact canonical titles of the placeholder catalog, for the admin purge. */
export const SEED_SERIES_TITLES = SERIES.map((s) => s.title);

/** Synthetic reviewer accounts are identifiable by this email domain. */
export const SEED_USER_EMAIL_DOMAIN = "@seed.dramascore.app";
