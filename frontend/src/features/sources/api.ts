import type {
  CatalogEntry,
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
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() ||
  "/api";

function toQueryString(params: SourcesQueryParams): string {
  const query = new URLSearchParams();
  query.set("page", String(params.page));
  query.set("page_size", String(params.pageSize));

  if (params.sortBy) {
    const ordering = params.sortOrder === "desc" ? `-${params.sortBy}` : params.sortBy;
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

export async function fetchSources(params: SourcesQueryParams): Promise<SourcesResponse> {
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

export async function fetchCatalogEntriesBySource(id: string): Promise<CatalogEntry[]> {
  const payload = await fetchJson<PaginatedApiResponse<CatalogEntry>>(
    `/catalog-entries/?source=${encodeURIComponent(id)}`
  );
  return payload.results;
}

