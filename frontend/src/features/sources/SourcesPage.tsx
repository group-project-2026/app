import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { DataTable } from "@/components/DataTable";
import { DataTablePagination } from "@/components/DataTablePagination";
import { DataTableFilters } from "@/components/DataTableFilters";
import type {
  PaginationState,
  SortingState,
  FilterState
} from "@/components/data-table-types";
import { useSourcesData } from "./useSourcesData";
import { getSourcesColumns } from "./sourcesColumns";
import { getSourcesFilters } from "./sourcesFilters";
import type { CatalogName, Source, SourcesQueryParams } from "./types";

const asString = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;

const asNumber = (value: unknown): number | undefined =>
  typeof value === "number" ? value : undefined;

const isCatalogName = (value: unknown): value is CatalogName =>
  typeof value === "string" &&
  ["FERMI", "LHAASO", "HAWC", "TEVCAT", "NED"].includes(value);

const asCatalogArray = (value: unknown): CatalogName[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const catalogs = value.filter(isCatalogName);
  return catalogs.length > 0 ? catalogs : undefined;
};

const asStringArray = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const values = value.filter(
    (item): item is string => typeof item === "string" && item.length > 0
  );
  return values.length > 0 ? values : undefined;
};

export function SourcesPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Pagination state
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    pageSize: 100
  });

  // Sorting state (default: source name ascending)
  const [sorting, setSorting] = useState<SortingState>({
    sortBy: "unified_name",
    sortOrder: "asc"
  });

  // Filter state
  const [filterState, setFilterState] = useState<FilterState>({});

  // Build query params from state
  const queryParams: SourcesQueryParams = {
    page: pagination.page,
    pageSize: pagination.pageSize,
    sortBy: sorting.sortBy || undefined,
    sortOrder: sorting.sortOrder,
    search: asString(filterState.search),
    primaryCatalogs: asCatalogArray(filterState.primaryCatalog),
    sourceClasses: asStringArray(filterState.sourceClasses),
    raMin: asNumber(filterState.raMin),
    raMax: asNumber(filterState.raMax),
    decMin: asNumber(filterState.decMin),
    decMax: asNumber(filterState.decMax),
    confidenceMin: asNumber(filterState.confidenceMin),
    confidenceMax: asNumber(filterState.confidenceMax),
    significanceMin: asNumber(filterState.significanceMin),
    significanceMax: asNumber(filterState.significanceMax),
    fluxMin: asNumber(filterState.fluxMin),
    fluxMax: asNumber(filterState.fluxMax),
    minCatalogCount: asNumber(filterState.minCatalogCount)
  };

  // Fetch data with TanStack Query
  const { data, isLoading, error } = useSourcesData(queryParams);

  const handleRowClick = (source: Source) => {
    navigate(`/sources/${source.id}`);
  };

  const handleClearFilters = () => {
    setFilterState({});
  };

  // Reset to page 1 when filters change
  const handleFilterChange = (newFilterState: FilterState) => {
    setFilterState(newFilterState);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  return (
    <main className="min-h-screen w-full">
      <div className="container mx-auto py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("sources.title")}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t("sources.description")}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("sources.filters")}</CardTitle>
            <CardDescription>
              {t("sources.filtersDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataTableFilters
              filters={getSourcesFilters(t)}
              filterState={filterState}
              onFilterChange={handleFilterChange}
              onClearFilters={handleClearFilters}
            />
          </CardContent>
        </Card>

        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive">
                {t("sources.errorLoading", { message: error.message })}
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="pt-6">
            <DataTable
              columns={getSourcesColumns(t)}
              data={data?.data || []}
              sorting={sorting}
              onSortChange={setSorting}
              onRowClick={handleRowClick}
              isLoading={isLoading}
              emptyMessage={t("sources.noResults")}
            />
            {data && (
              <DataTablePagination
                pagination={pagination}
                onPaginationChange={setPagination}
                total={data.total}
                pageSizeOptions={[10, 25, 50, 100]}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
