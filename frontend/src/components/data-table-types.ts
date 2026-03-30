// Generic data table type definitions

export interface ColumnDef<T> {
  id: string;
  header: string;
  accessorKey?: keyof T;
  accessorFn?: (row: T) => unknown;
  cell?: (info: { row: T; value: unknown }) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

export interface PaginationState {
  page: number;
  pageSize: number;
}

export interface SortingState {
  sortBy: string | null;
  sortOrder: "asc" | "desc";
}

export type FilterType = "text" | "multiselect" | "range" | "number";

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterConfig {
  id: string;
  type: FilterType;
  label: string;
  field: string;
  options?: FilterOption[]; // For multiselect
  min?: number; // For range/number
  max?: number; // For range/number
  step?: number; // For range/number
  placeholder?: string; // For text
}

export interface FilterState {
  [key: string]: unknown;
}

export interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  sorting: SortingState;
  onSortChange: (sorting: SortingState) => void;
  onRowClick?: (row: T) => void;
  isLoading?: boolean;
  emptyMessage?: string;
}

export interface DataTablePaginationProps {
  pagination: PaginationState;
  onPaginationChange: (pagination: PaginationState) => void;
  total: number;
  pageSizeOptions?: number[];
}

export interface DataTableFiltersProps {
  filters: FilterConfig[];
  filterState: FilterState;
  onFilterChange: (filterState: FilterState) => void;
  onClearFilters: () => void;
}
