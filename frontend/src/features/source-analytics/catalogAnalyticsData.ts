export type CatalogKey =
  | "FERMIN"
  | "HAWC"
  | "LHAASO"
  | "NED"
  | "TEVCAT"
  | "MAGIC";

export interface CatalogMeta {
  label: string;
  color: string;
}

export const CATALOG_META: Record<CatalogKey, CatalogMeta> = {
  FERMIN: { label: "Fermin", color: "#2E86AB" },
  HAWC: { label: "HAWC", color: "#E07A5F" },
  LHAASO: { label: "LHAASO", color: "#81B29A" },
  NED: { label: "NED", color: "#F2CC8F" },
  TEVCAT: { label: "TeVCat", color: "#6D597A" },
  MAGIC: { label: "MAGIC", color: "#D62828" }
};

export const CATALOG_KEYS = Object.keys(CATALOG_META) as CatalogKey[];

export const ENERGY_BANDS = [
  "0.1-1 GeV",
  "1-100 GeV",
  "0.1-1 TeV",
  "1-30 TeV"
] as const;

export const SKY_REGIONS = ["North", "South", "Equatorial"] as const;

export const SOURCE_TYPES = ["Pulsar", "SNR", "AGN", "PWN"] as const;

export type EnergyBand = (typeof ENERGY_BANDS)[number];
export type SkyRegion = (typeof SKY_REGIONS)[number];
export type SourceType = (typeof SOURCE_TYPES)[number];

export interface CatalogObservation {
  id: string;
  catalog: CatalogKey;
  year: number;
  energyBand: EnergyBand;
  skyRegion: SkyRegion;
  sourceType: SourceType;
  emissionFlux: number;
  significanceSigma: number;
  detectability: number;
}

interface CatalogProfile {
  emissionBase: number;
  significanceBase: number;
  detectabilityBoost: number;
  yearlyEmissionGrowth: number;
  yearlySignificanceGrowth: number;
}

const CATALOG_PROFILES: Record<CatalogKey, CatalogProfile> = {
  FERMIN: {
    emissionBase: 3.1e-11,
    significanceBase: 7.8,
    detectabilityBoost: 7,
    yearlyEmissionGrowth: 0.028,
    yearlySignificanceGrowth: 0.018
  },
  HAWC: {
    emissionBase: 2.5e-11,
    significanceBase: 8.9,
    detectabilityBoost: 9,
    yearlyEmissionGrowth: 0.024,
    yearlySignificanceGrowth: 0.022
  },
  LHAASO: {
    emissionBase: 2.8e-11,
    significanceBase: 9.2,
    detectabilityBoost: 10,
    yearlyEmissionGrowth: 0.03,
    yearlySignificanceGrowth: 0.024
  },
  NED: {
    emissionBase: 1.8e-11,
    significanceBase: 6.2,
    detectabilityBoost: 4,
    yearlyEmissionGrowth: 0.019,
    yearlySignificanceGrowth: 0.013
  },
  TEVCAT: {
    emissionBase: 2.2e-11,
    significanceBase: 7.4,
    detectabilityBoost: 6,
    yearlyEmissionGrowth: 0.021,
    yearlySignificanceGrowth: 0.017
  },
  MAGIC: {
    emissionBase: 2.9e-11,
    significanceBase: 8.4,
    detectabilityBoost: 8,
    yearlyEmissionGrowth: 0.027,
    yearlySignificanceGrowth: 0.019
  }
};

const ENERGY_BAND_FACTORS: Record<EnergyBand, number> = {
  "0.1-1 GeV": 1.05,
  "1-100 GeV": 1,
  "0.1-1 TeV": 0.78,
  "1-30 TeV": 0.56
};

const REGION_FACTORS: Record<SkyRegion, number> = {
  North: 1.07,
  South: 1,
  Equatorial: 0.94
};

const SIGNIFICANCE_REGION_FACTORS: Record<SkyRegion, number> = {
  North: 1.03,
  South: 1,
  Equatorial: 0.98
};

const SOURCE_FACTORS: Record<
  SourceType,
  { emission: number; significance: number }
> = {
  Pulsar: { emission: 1.04, significance: 1.03 },
  SNR: { emission: 0.92, significance: 0.96 },
  AGN: { emission: 1.1, significance: 1.06 },
  PWN: { emission: 0.99, significance: 1.01 }
};

function round(value: number, precision = 2): number {
  return Number(value.toFixed(precision));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function calculateDetectability(
  significance: number,
  emission: number,
  boost: number
): number {
  const emissionScale = Math.log10(emission * 1e13 + 1) * 8;
  const score = 28 + boost + significance * 2.3 + emissionScale;
  return round(clamp(score, 0, 100), 1);
}

function generateCatalogAnalyticsData(): CatalogObservation[] {
  const observations: CatalogObservation[] = [];
  const years = [2021, 2022, 2023, 2024, 2025];

  for (const catalog of CATALOG_KEYS) {
    const profile = CATALOG_PROFILES[catalog];

    for (const year of years) {
      const yearOffset = year - years[0];

      for (const energyBand of ENERGY_BANDS) {
        for (const skyRegion of SKY_REGIONS) {
          for (const sourceType of SOURCE_TYPES) {
            const sourceFactor = SOURCE_FACTORS[sourceType];
            const baseEmission =
              profile.emissionBase *
              ENERGY_BAND_FACTORS[energyBand] *
              REGION_FACTORS[skyRegion] *
              sourceFactor.emission;
            const emissionFlux =
              baseEmission * (1 + yearOffset * profile.yearlyEmissionGrowth);

            const baseSignificance =
              profile.significanceBase *
              Math.sqrt(ENERGY_BAND_FACTORS[energyBand] + 0.15) *
              SIGNIFICANCE_REGION_FACTORS[skyRegion] *
              sourceFactor.significance;
            const significanceSigma =
              baseSignificance *
              (1 + yearOffset * profile.yearlySignificanceGrowth);

            const detectability = calculateDetectability(
              significanceSigma,
              emissionFlux,
              profile.detectabilityBoost
            );

            observations.push({
              id: `${catalog}-${year}-${energyBand}-${skyRegion}-${sourceType}`,
              catalog,
              year,
              energyBand,
              skyRegion,
              sourceType,
              emissionFlux: Number(emissionFlux.toExponential(3)),
              significanceSigma: round(significanceSigma),
              detectability
            });
          }
        }
      }
    }
  }

  return observations;
}

export const CATALOG_ANALYTICS_DATA = generateCatalogAnalyticsData();
