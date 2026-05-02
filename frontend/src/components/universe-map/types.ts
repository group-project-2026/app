import type { TFunction } from "i18next";

export type CosmicCategory =
  | "FERMI"
  | "LHAASO"
  | "HAWC"
  | "TEVCAT";

export interface CosmicPoint {
  id: string;
  name: string;
  category: CosmicCategory;
  ra: number;
  dec: number;
  magnitude: number;
  primaryCatalog: CosmicCategory;
  sourceClass: string | null;
  significance: number | null;
  flux1000: number | null;
  spectralIndex: number | null;
  associatedName: string | null;
  discoveryMethod: string | null;
  bestConfidence: number | null;
  avgConfidence: number | null;
  catalogCount: number;
}

export const CATEGORY_COLORS: Record<CosmicCategory, string> = {
  FERMI: "#facc15",
  LHAASO: "#22d3ee",
  HAWC: "#f97316",
  TEVCAT: "#a855f7",
};

export const ALL_CATEGORIES: CosmicCategory[] = [
  "FERMI",
  "LHAASO",
  "HAWC",
  "TEVCAT",
];

export const getCategoryMeta = (
  t: TFunction,
): Record<CosmicCategory, { label: string; color: string }> => ({
  FERMI: { label: t("universeMap.categories.fermi"), color: CATEGORY_COLORS.FERMI },
  LHAASO: { label: t("universeMap.categories.lhaaso"), color: CATEGORY_COLORS.LHAASO },
  HAWC: { label: t("universeMap.categories.hawc"), color: CATEGORY_COLORS.HAWC },
  TEVCAT: { label: t("universeMap.categories.tevcat"), color: CATEGORY_COLORS.TEVCAT },
});

export const CATEGORY_META: Record<
  CosmicCategory,
  { label: string; color: string }
> = {
  FERMI: { label: "Fermi-LAT", color: CATEGORY_COLORS.FERMI },
  LHAASO: { label: "LHAASO", color: CATEGORY_COLORS.LHAASO },
  HAWC: { label: "HAWC", color: CATEGORY_COLORS.HAWC },
  TEVCAT: { label: "TeVCat", color: CATEGORY_COLORS.TEVCAT },
};
