import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { sourcesColumns } from "./sourcesColumns";
import { sourcesFilters } from "./sourcesFilters";
import type { Source, SourceClass, SourcesQueryParams } from "./types";

const isSourceClass = (value: unknown): value is SourceClass =>
  typeof value === "string" &&
  ["PSR", "BLL", "FSRQ", "AGN", "UNK", "BIN", "HMB", "SNR"].includes(value);

const asString = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;

const asNumber = (value: unknown): number | undefined =>
  typeof value === "number" ? value : undefined;

const asSourceClassArray = (value: unknown): SourceClass[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const classes = value.filter(isSourceClass);
  return classes.length > 0 ? classes : undefined;
};

export function SourcesPage() {
  const navigate = useNavigate();

  // Pagination state
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    pageSize: 100
  });

  // Sorting state (default: significance descending)
  const [sorting, setSorting] = useState<SortingState>({
    sortBy: "significance",
    sortOrder: "desc"
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
    sourceClass: asSourceClassArray(filterState.sourceClass),
    raMin: asNumber(filterState.raMin),
    raMax: asNumber(filterState.raMax),
    decMin: asNumber(filterState.decMin),
    decMax: asNumber(filterState.decMax),
    fluxMin: asNumber(filterState.fluxMin),
    fluxMax: asNumber(filterState.fluxMax),
    significanceMin: asNumber(filterState.significanceMin)
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
            Gamma-Ray Sources
          </h1>
          <p className="text-muted-foreground mt-2">
            Browse and filter gamma-ray sources from various astronomical
            catalogs
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>
              Refine your search using the filters below
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataTableFilters
              filters={sourcesFilters}
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
                Error loading sources: {error.message}
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="pt-6">
            <DataTable
              columns={sourcesColumns}
              data={data?.data || []}
              sorting={sorting}
              onSortChange={setSorting}
              onRowClick={handleRowClick}
              isLoading={isLoading}
              emptyMessage="No sources found. Try adjusting your filters."
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
