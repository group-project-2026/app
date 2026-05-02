import type { Source } from "@/features/sources/types";
import type { CosmicCategory, CosmicPoint } from "./types";
import { ALL_CATEGORIES } from "./types";

type PaginatedApiResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || "/api";

const PAGE_SIZE = 200;
const MAX_PAGES = 100;

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return (await response.json()) as T;
}

const ALLOWED_CATEGORIES = new Set<CosmicCategory>(ALL_CATEGORIES);

function toCategory(catalog: string | null | undefined): CosmicCategory | null {
  if (!catalog) return null;
  const upper = catalog.toUpperCase();
  return ALLOWED_CATEGORIES.has(upper as CosmicCategory)
    ? (upper as CosmicCategory)
    : null;
}

function deriveMagnitude(source: Source): number {
  if (typeof source.significance === "number" && Number.isFinite(source.significance)) {
    const clamped = Math.max(2, Math.min(20, source.significance));
    return clamped * 0.6;
  }
  if (typeof source.flux1000 === "number" && source.flux1000 > 0) {
    return Math.max(3, Math.min(12, Math.log10(source.flux1000 * 1e10) * 2));
  }
  return 5;
}

function toCosmicPoint(source: Source): CosmicPoint | null {
  const category = toCategory(source.primary_catalog);
  if (!category) return null;
  if (typeof source.ra !== "number" || typeof source.dec !== "number") return null;

  return {
    id: source.id,
    name: source.unified_name,
    category,
    ra: source.ra,
    dec: source.dec,
    magnitude: deriveMagnitude(source),
    primaryCatalog: category,
    sourceClass: source.source_class,
    significance: source.significance,
    flux1000: source.flux1000,
    spectralIndex: source.spectral_index,
    associatedName: source.associated_name,
    discoveryMethod: source.discovery_method,
    bestConfidence: source.best_confidence,
    avgConfidence: source.avg_confidence,
    catalogCount: source.catalog_count,
  };
}

export async function fetchUniverseMapPoints(): Promise<CosmicPoint[]> {
  const points: CosmicPoint[] = [];

  for (let page = 1; page <= MAX_PAGES; page++) {
    const payload = await fetchJson<PaginatedApiResponse<Source>>(
      `/sources/?page=${page}&page_size=${PAGE_SIZE}`,
    );

    for (const source of payload.results) {
      const point = toCosmicPoint(source);
      if (point) points.push(point);
    }

    if (!payload.next) break;
  }

  return points;
}
