import type {
  CatalogEntry,
  CatalogName,
  Source,
  SourceDetail,
  SourcesQueryParams,
  SourcesResponse
} from "./types";

type PaginatedApiResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || "/api";

function toQueryString(params: SourcesQueryParams): string {
  const query = new URLSearchParams();
  query.set("page", String(params.page));
  query.set("page_size", String(params.pageSize));

  if (params.sortBy) {
    const ordering =
      params.sortOrder === "desc" ? `-${params.sortBy}` : params.sortBy;
    query.set("ordering", ordering);
  }

  if (params.search) {
    query.set("search", params.search);
  }

  for (const catalog of params.primaryCatalogs ?? []) {
    query.append("catalog", catalog);
  }

  for (const sourceClass of params.sourceClasses ?? []) {
    query.append("source_class", sourceClass);
  }

  if (typeof params.raMin === "number") {
    query.set("ra_min", String(params.raMin));
  }

  if (typeof params.raMax === "number") {
    query.set("ra_max", String(params.raMax));
  }

  if (typeof params.decMin === "number") {
    query.set("dec_min", String(params.decMin));
  }

  if (typeof params.decMax === "number") {
    query.set("dec_max", String(params.decMax));
  }

  if (typeof params.confidenceMin === "number") {
    query.set("confidence_min", String(params.confidenceMin));
  }

  if (typeof params.confidenceMax === "number") {
    query.set("confidence_max", String(params.confidenceMax));
  }

  if (typeof params.significanceMin === "number") {
    query.set("significance_min", String(params.significanceMin));
  }

  if (typeof params.significanceMax === "number") {
    query.set("significance_max", String(params.significanceMax));
  }

  if (typeof params.fluxMin === "number") {
    query.set("flux_min", String(params.fluxMin));
  }

  if (typeof params.fluxMax === "number") {
    query.set("flux_max", String(params.fluxMax));
  }

  if (typeof params.minCatalogCount === "number") {
    query.set("min_catalog_count", String(params.minCatalogCount));
  }

  return query.toString();
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return (await response.json()) as T;
}

export async function fetchSources(
  params: SourcesQueryParams
): Promise<SourcesResponse> {
  const query = toQueryString(params);
  const payload = await fetchJson<PaginatedApiResponse<Source>>(
    `/sources/filter/?${query}`
  );

  return {
    data: payload.results,
    total: payload.count,
    page: params.page,
    pageSize: params.pageSize
  };
}

export async function fetchSourceDetail(id: string): Promise<SourceDetail> {
  return fetchJson<SourceDetail>(`/sources/${id}/`);
}

export async function fetchCatalogEntriesBySource(
  id: string
): Promise<CatalogEntry[]> {
  const payload = await fetchJson<PaginatedApiResponse<CatalogEntry>>(
    `/catalog-entries/?source=${encodeURIComponent(id)}`
  );
  return payload.results;
}

export interface MagicSimulationSource {
  id: string;
  unified_name: string;
  ra: number;
  dec: number;
  primary_catalog: CatalogName;
}

export interface MagicSimulationCatalogEntry {
  original_name: string;
  catalog_name: CatalogName;
  confidence: number;
  discovery_method: string;
}

export interface MagicSpectralPoint {
  energy_gev: number;
  energy_bin_lower_gev?: number;
  energy_bin_upper_gev?: number;
  flux?: number;
  flux_err?: number;
  flux_sed_tev_cm2_s?: number;
  flux_sed_error?: number;
  significance_sigma?: number;
  is_detected?: number | boolean;
}

export interface MagicSimulationAggregateStats {
  total_significance: number;
  min_observation_time_hours: number;
  total_signal_events: number;
  total_background_events: number;
  signal_to_background_ratio: number;
  detection_threshold_events: number;
  detected_bins?: number;
  total_bins_evaluated?: number;
  detection_probability?: number;
}

export interface MagicSimulationObservationParameters {
  zenith_angle: "low" | "mid" | "high";
  observation_time_hours: number;
  psf_deg: number;
  extension_deg: number;
  offset_degrad: number;
  num_off_regions: number;
  min_events: number;
  min_sbr: number;
  pulsar_mode?: number | boolean;
}

export interface MagicSimulationPreCalculated {
  magic_significance: number;
  magic_detectable: boolean;
  magic_calculated_at: string;
  observation_params: {
    observation_time_hours: number;
    zenith_angle: "low" | "mid" | "high";
    note?: string;
  };
}

export interface MagicSimulationResponse {
  source: MagicSimulationSource;
  catalog_entry: MagicSimulationCatalogEntry;
  energy_bins?: number[];
  spectral_points?: MagicSpectralPoint[];
  aggregate_stats?: MagicSimulationAggregateStats;
  parameters?: MagicSimulationObservationParameters;
  observation_parameters?: MagicSimulationObservationParameters;
  pre_calculated_magic?: MagicSimulationPreCalculated;
  note?: string;
  error?: string;
}

export interface MagicSimulationQueryParams {
  zenith_angle?: "low" | "mid" | "high";
  observation_time_hours?: number;
  psf_deg?: number;
  extension_deg?: number;
  offset_degrad?: number;
  num_off_regions?: number;
  min_events?: number;
  min_sbr?: number;
}

export async function fetchSourceMagicSimulation(
  id: string,
  params: MagicSimulationQueryParams = {}
): Promise<MagicSimulationResponse> {
  const query = new URLSearchParams();

  if (params.zenith_angle) query.set("zenith_angle", params.zenith_angle);
  if (typeof params.observation_time_hours === "number") {
    query.set("observation_time_hours", String(params.observation_time_hours));
  }
  if (typeof params.psf_deg === "number") {
    query.set("psf_deg", String(params.psf_deg));
  }
  if (typeof params.extension_deg === "number") {
    query.set("extension_deg", String(params.extension_deg));
  }
  if (typeof params.offset_degrad === "number") {
    query.set("offset_degrad", String(params.offset_degrad));
  }
  if (typeof params.num_off_regions === "number") {
    query.set("num_off_regions", String(params.num_off_regions));
  }
  if (typeof params.min_events === "number") {
    query.set("min_events", String(params.min_events));
  }
  if (typeof params.min_sbr === "number") {
    query.set("min_sbr", String(params.min_sbr));
  }

  const suffix = query.toString() ? `?${query.toString()}` : "";
  return fetchJson<MagicSimulationResponse>(
    `/sources/${encodeURIComponent(id)}/magic_simulation/${suffix}`
  );
}
