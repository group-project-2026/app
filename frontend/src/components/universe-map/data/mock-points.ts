import type { CosmicCategory, CosmicPoint } from "../types";

const LOREM = [
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
  "Curabitur pretium tincidunt lacus. Nulla gravida orci a odio. Nullam varius, turpis et commodo pharetra, est eros bibendum elit, nec luctus magna felis sollicitudin mauris. Integer in mauris eu nibh euismod gravida.",
  "Praesent blandit laoreet nibh. Fusce convallis metus id felis luctus adipiscing. Pellentesque egestas, neque sit amet convallis pulvinar, justo nulla eleifend augue, ac auctor orci leo non est.",
  "Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae. Morbi lacinia molestie dui. Praesent blandit dolor. Sed non quam. In vel mi sit amet augue congue elementum.",
  "Maecenas vestibulum mollis diam. Phasellus blandit leo ut odio. Maecenas malesuada. Praesent congue erat at massa. Sed cursus turpis vitae tortor. Donec posuere vulputate arcu.",
  "Suspendisse potenti. Sed mollis, eros et ultrices tempus, mauris ipsum aliquam libero, non adipiscing dolor urna a orci. Nulla porta dolor. Class aptent taciti sociosqu ad litora torquent per conubia nostra.",
  "Etiam sit amet orci eget eros faucibus tincidunt. Duis leo. Sed fringilla mauris sit amet nibh. Donec sodales sagittis magna. Sed consequat, leo eget bibendum sodales, augue velit cursus nunc.",
  "Phasellus volutpat, metus eget egestas mollis, lacus lacus blandit dui, id egestas quam mauris ut lacus. Fusce vel dui. Sed in libero ut nibh placerat accumsan. Proin faucibus arcu quis ante.",
];

const DISCOVERERS = [
  "Hubble Space Telescope",
  "Galileo Galilei",
  "William Herschel",
  "Edwin Hubble",
  "Jocelyn Bell Burnell",
  "Charles Messier",
  "Vera Rubin",
  "Karl Jansky",
  "Cecilia Payne",
  "Subrahmanyan Chandrasekhar",
  "ALMA Observatory",
  "James Webb Space Telescope",
  "Chandra X-ray Observatory",
  "Event Horizon Telescope",
];

const STAR_NAMES = [
  "Proxima Centauri", "Betelgeuse", "Sirius", "Vega", "Rigel",
  "Aldebaran", "Antares", "Polaris", "Arcturus", "Capella",
  "Deneb", "Altair", "Spica", "Fomalhaut", "Canopus",
];

const GALAXY_NAMES = [
  "Andromeda", "Whirlpool Galaxy", "Sombrero Galaxy", "Pinwheel Galaxy",
  "Triangulum", "NGC 1300", "Centaurus A", "Cartwheel Galaxy",
  "NGC 4565", "Messier 87", "NGC 1365", "IC 1101", "Cigar Galaxy",
];

const NEBULA_NAMES = [
  "Orion Nebula", "Eagle Nebula", "Crab Nebula", "Horsehead Nebula",
  "Ring Nebula", "Lagoon Nebula", "Helix Nebula", "Cat's Eye Nebula",
  "Rosette Nebula", "Veil Nebula", "Butterfly Nebula", "Tarantula Nebula",
];

const PULSAR_NAMES = [
  "PSR B1919+21", "Crab Pulsar", "Vela Pulsar", "PSR J0737-3039",
  "Geminga", "PSR B1257+12", "PSR J1748-2446ad", "Black Widow Pulsar",
  "PSR J0108-1431", "PSR B0531+21", "Millisecond Pulsar X1",
];

const QUASAR_NAMES = [
  "3C 273", "Markarian 421", "TON 618", "APM 08279+5255",
  "HS 1946+7658", "ULAS J1120+0641", "3C 279", "OJ 287",
  "PKS 2155-304", "Markarian 501",
];

const BLACKHOLE_NAMES = [
  "Sagittarius A*", "Cygnus X-1", "M87*", "GRS 1915+105",
  "V404 Cygni", "NGC 1277 BH", "TON 618 BH", "Phoenix A",
  "Holm 15A*", "S5 0014+81",
];

const PLANET_NAMES = [
  "Proxima b", "Kepler-442b", "TRAPPIST-1e", "Kepler-22b",
  "Gliese 667Cc", "HD 209458 b", "55 Cancri e", "K2-18 b",
  "TOI-700 d", "Kepler-452b", "LHS 1140 b", "GJ 1214 b",
];

const CLUSTER_NAMES = [
  "Pleiades", "Hyades", "Omega Centauri", "47 Tucanae",
  "M13 Hercules", "NGC 869", "Messier 3", "NGC 104",
  "Praesepe", "Messier 67", "NGC 2682", "Messier 4",
];

const NAMES_MAP: Record<CosmicCategory, string[]> = {
  star: STAR_NAMES,
  galaxy: GALAXY_NAMES,
  nebula: NEBULA_NAMES,
  pulsar: PULSAR_NAMES,
  quasar: QUASAR_NAMES,
  "black-hole": BLACKHOLE_NAMES,
  planet: PLANET_NAMES,
  cluster: CLUSTER_NAMES,
};

const CATEGORIES: CosmicCategory[] = [
  "star", "galaxy", "nebula", "pulsar",
  "quasar", "black-hole", "planet", "cluster",
];

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generatePoints(): CosmicPoint[] {
  const rand = seededRandom(42);
  const points: CosmicPoint[] = [];
  const usedNames: Set<string> = new Set();

  const distribution: [CosmicCategory, number][] = [
    ["star", 18],
    ["galaxy", 16],
    ["nebula", 14],
    ["pulsar", 10],
    ["quasar", 8],
    ["black-hole", 8],
    ["planet", 14],
    ["cluster", 12],
  ];

  for (const [category, count] of distribution) {
    const names = NAMES_MAP[category];
    for (let i = 0; i < count; i++) {
      let name = names[i % names.length];
      if (usedNames.has(name)) {
        name = `${name} ${String.fromCharCode(65 + Math.floor(rand() * 26))}`;
      }
      usedNames.add(name);

      points.push({
        id: `${category}-${i}`,
        name,
        category,
        ra: Math.round(rand() * 360 * 100) / 100,
        dec: Math.round((rand() * 180 - 90) * 100) / 100,
        magnitude: Math.round((rand() * 9 + 1) * 10) / 10,
        description: LOREM[Math.floor(rand() * LOREM.length)],
        distance: generateDistance(category, rand),
        discoveredBy: DISCOVERERS[Math.floor(rand() * DISCOVERERS.length)],
      });
    }
  }

  return points;
}

function generateDistance(
  category: CosmicCategory,
  rand: () => number,
): string {
  switch (category) {
    case "star":
      return `${(rand() * 1000 + 1).toFixed(1)} ly`;
    case "planet":
      return `${(rand() * 500 + 4).toFixed(1)} ly`;
    case "galaxy":
      return `${(rand() * 100 + 0.5).toFixed(1)} Mly`;
    case "nebula":
      return `${(rand() * 8000 + 500).toFixed(0)} ly`;
    case "pulsar":
      return `${(rand() * 30000 + 100).toFixed(0)} ly`;
    case "quasar":
      return `${(rand() * 10 + 1).toFixed(1)} Gly`;
    case "black-hole":
      return `${(rand() * 500 + 1).toFixed(1)} Mly`;
    case "cluster":
      return `${(rand() * 50000 + 100).toFixed(0)} ly`;
    default:
      return "unknown";
  }
}

export const MOCK_POINTS: CosmicPoint[] = generatePoints();

export { CATEGORIES };
