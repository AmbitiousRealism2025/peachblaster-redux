export type ChapterConfig = {
  id: number;
  name: string;
  subtitle: string;
  waveCount: number;
  enemyTypes: string[];
  backgroundTint: string;
  musicCue: string;
  hasBoss: boolean;
};

export const chapters: ChapterConfig[] = [
  {
    id: 1,
    name: "Orchard Belt",
    subtitle: "Fresh fruit in familiar orbit",
    waveCount: 4,
    enemyTypes: ["classic-peach"],
    backgroundTint: "#1d2430",
    musicCue: "orchard-belt",
    hasBoss: false
  },
  {
    id: 2,
    name: "Syrup Nebula",
    subtitle: "Sticky skies and sour drift",
    waveCount: 5,
    enemyTypes: ["rotten-peach"],
    backgroundTint: "#2b1a2e",
    musicCue: "syrup-nebula",
    hasBoss: false
  },
  {
    id: 3,
    name: "Pitstorm Reef",
    subtitle: "Seeds in the undertow",
    waveCount: 5,
    enemyTypes: ["pit-satellite"],
    backgroundTint: "#0f2a2a",
    musicCue: "pitstorm-reef",
    hasBoss: false
  },
  {
    id: 4,
    name: "Fuzz Cathedral",
    subtitle: "Haloed rinds, armored hymns",
    waveCount: 6,
    enemyTypes: ["armored-peach"],
    backgroundTint: "#2a2412",
    musicCue: "fuzz-cathedral",
    hasBoss: false
  },
  {
    id: 5,
    name: "Canning Moon",
    subtitle: "Golden preserves at the edge",
    waveCount: 6,
    enemyTypes: ["golden-peach"],
    backgroundTint: "#2f2418",
    musicCue: "canning-moon",
    hasBoss: true
  }
];

