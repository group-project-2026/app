import type {
  Source,
  SourceClass,
  SourcesQueryParams,
  SourcesResponse
} from "./types";

// Seeded random number generator for consistent mock data
function seededRandom(seed: number) {
  return function () {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

const SOURCE_NAME_PREFIXES: Record<SourceClass, string[]> = {
  PSR: ["J", "B"],
  BLL: ["PKS", "OJ", "S5", "TXS"],
  FSRQ: ["PKS", "3C", "4C", "NRAO"],
  AGN: ["NGC", "Mrk", "ESO"],
  UNK: ["4FGL J", "FL8Y J"],
  BIN: ["LS", "LSI", "HESS J"],
  HMB: ["Cyg X", "LMC X", "SS"],
  SNR: ["G", "SNR", "W"]
};

function generateSourceName(
  sourceClass: SourceClass,
  index: number,
  random: () => number
): string {
  const prefixes = SOURCE_NAME_PREFIXES[sourceClass];
  const prefix = prefixes[Math.floor(random() * prefixes.length)];

  const ra = random() * 360;
  const dec = random() * 180 - 90;
  const raHours = Math.floor(ra / 15);
  const raMin = Math.floor((ra / 15 - raHours) * 60);
  const decDeg = Math.floor(Math.abs(dec));
  const decMin = Math.floor((Math.abs(dec) - decDeg) * 60);
  const decSign = dec >= 0 ? "+" : "-";

  if (sourceClass === "PSR") {
    return `${prefix}${raHours.toString().padStart(2, "0")}${raMin.toString().padStart(2, "0")}${decSign}${decDeg.toString().padStart(2, "0")}${decMin.toString().padStart(2, "0")}`;
  } else if (sourceClass === "SNR") {
    const glon = random() * 360;
    const glat = random() * 180 - 90;
    return `${prefix}${glon.toFixed(1)}${glat >= 0 ? "+" : ""}${glat.toFixed(1)}`;
  } else {
    return `${prefix} ${raHours.toString().padStart(2, "0")}${raMin.toString().padStart(2, "0")}${decSign}${decDeg.toString().padStart(2, "0")}${decMin}`;
  }
}

// Generate 300 mock sources
function generateMockSources(): Source[] {
  const sources: Source[] = [];
  const random = seededRandom(42);

  // Distribution: PSR: 50, BLL: 60, FSRQ: 50, AGN: 40, UNK: 40, BIN: 25, HMB: 20, SNR: 15
  const distribution: Array<{ class: SourceClass; count: number }> = [
    { class: "PSR", count: 50 },
    { class: "BLL", count: 60 },
    { class: "FSRQ", count: 50 },
    { class: "AGN", count: 40 },
    { class: "UNK", count: 40 },
    { class: "BIN", count: 25 },
    { class: "HMB", count: 20 },
    { class: "SNR", count: 15 }
  ];

  let id = 1;

  for (const { class: sourceClass, count } of distribution) {
    for (let i = 0; i < count; i++) {
      const ra = random() * 360;
      const dec = random() * 180 - 90;
      const glon = random() * 360;
      const glat = random() * 180 - 90;

      // Flux varies by source type
      let fluxBase: number;
      if (sourceClass === "PSR") {
        fluxBase = random() * 5e-8 + 1e-9; // Pulsars: 1e-9 to 5e-8
      } else if (sourceClass === "BLL" || sourceClass === "FSRQ") {
        fluxBase = random() * 1e-7 + 5e-9; // Blazars: brighter
      } else if (sourceClass === "AGN") {
        fluxBase = random() * 5e-8 + 1e-9;
      } else if (sourceClass === "SNR") {
        fluxBase = random() * 2e-8 + 5e-10;
      } else {
        fluxBase = random() * 3e-8 + 1e-9;
      }

      const flux = fluxBase;
      const spectralIndex = random() * 1.5 + 1.5; // 1.5 to 3.0
      const significance = random() * 45 + 5; // 5 to 50 sigma

      sources.push({
        id: `src-${id}`,
        name: generateSourceName(sourceClass, i, random),
        ra: parseFloat(ra.toFixed(4)),
        dec: parseFloat(dec.toFixed(4)),
        glon: parseFloat(glon.toFixed(4)),
        glat: parseFloat(glat.toFixed(4)),
        sourceClass,
        flux: parseFloat(flux.toExponential(3)),
        spectralIndex: parseFloat(spectralIndex.toFixed(2)),
        significance: parseFloat(significance.toFixed(1))
      });

      id++;
    }
  }

  return sources;
}

// Generate mock data once
const MOCK_SOURCES = generateMockSources();

// Mock API function with filtering, sorting, and pagination
export async function fetchSources(
  params: SourcesQueryParams
): Promise<SourcesResponse> {
  // Simulate 2-second network delay
  await new Promise((resolve) => setTimeout(resolve, 2000));

  let filteredSources = [...MOCK_SOURCES];

  // Apply filters
  if (params.search) {
    const searchLower = params.search.toLowerCase();
    filteredSources = filteredSources.filter((s) =>
      s.name.toLowerCase().includes(searchLower)
    );
  }

  if (params.sourceClass && params.sourceClass.length > 0) {
    filteredSources = filteredSources.filter((s) =>
      params.sourceClass!.includes(s.sourceClass)
    );
  }

  if (params.raMin !== undefined) {
    filteredSources = filteredSources.filter((s) => s.ra >= params.raMin!);
  }

  if (params.raMax !== undefined) {
    filteredSources = filteredSources.filter((s) => s.ra <= params.raMax!);
  }

  if (params.decMin !== undefined) {
    filteredSources = filteredSources.filter((s) => s.dec >= params.decMin!);
  }

  if (params.decMax !== undefined) {
    filteredSources = filteredSources.filter((s) => s.dec <= params.decMax!);
  }

  if (params.fluxMin !== undefined) {
    filteredSources = filteredSources.filter((s) => s.flux >= params.fluxMin!);
  }

  if (params.fluxMax !== undefined) {
    filteredSources = filteredSources.filter((s) => s.flux <= params.fluxMax!);
  }

  if (params.significanceMin !== undefined) {
    filteredSources = filteredSources.filter(
      (s) => s.significance >= params.significanceMin!
    );
  }

  // Apply sorting
  if (params.sortBy) {
    const sortBy = params.sortBy as keyof Source;
    const sortOrder = params.sortOrder || "desc";

    filteredSources.sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
      } else {
        const aStr = String(aVal);
        const bStr = String(bVal);
        return sortOrder === "asc"
          ? aStr.localeCompare(bStr)
          : bStr.localeCompare(aStr);
      }
    });
  }

  // Apply pagination
  const total = filteredSources.length;
  const startIndex = (params.page - 1) * params.pageSize;
  const endIndex = startIndex + params.pageSize;
  const paginatedSources = filteredSources.slice(startIndex, endIndex);

  return {
    data: paginatedSources,
    total,
    page: params.page,
    pageSize: params.pageSize
  };
}
