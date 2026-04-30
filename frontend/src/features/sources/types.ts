export type CatalogName = "FERMI" | "LHAASO" | "HAWC" | "TEVCAT" | "NED";

export interface CatalogEntry {
  id: string;
  catalog_name: CatalogName;
  original_name: string;
  metadata: Record<string, unknown>;
  discovery_method: string;
  confidence: number;
  last_verified: string;
}

export interface Source {
  id: string;
  unified_name: string;
  ra: number;
  dec: number;
  primary_catalog: CatalogName;
  created_at: string;
  catalog_count: number;
  avg_confidence: number | null;
  best_confidence: number | null;
  source_class: string | null;
  significance: number | null;
  flux1000: number | null;
  spectral_index: number | null;
  associated_name: string | null;
  discovery_method: string | null;
}

export interface SourceDetail {
  id: string;
  unified_name: string;
  ra: number;
  dec: number;
  primary_catalog: CatalogName;
  discovery_date: string | null;
  created_at: string;
  updated_at: string;
  catalog_entries: CatalogEntry[];
  distance: number | null;
}

export interface SourcesQueryParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  search?: string;
  primaryCatalogs?: CatalogName[];
  sourceClasses?: string[];
  raMin?: number;
  raMax?: number;
  decMin?: number;
  decMax?: number;
  confidenceMin?: number;
  confidenceMax?: number;
  significanceMin?: number;
  significanceMax?: number;
  fluxMin?: number;
  fluxMax?: number;
  minCatalogCount?: number;
}

export interface SourcesResponse {
  data: Source[];
  total: number;
  page: number;
  pageSize: number;
}
