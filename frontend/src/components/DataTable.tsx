import { ChevronUpIcon, ChevronDownIcon } from "@radix-ui/react-icons";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import type { DataTableProps } from "@/components/data-table-types";
import { cn } from "@/lib/utils";

export function DataTable<T extends { id: string }>({
  columns,
  data,
  sorting,
  onSortChange,
  onRowClick,
  isLoading,
  emptyMessage = "No results found."
}: DataTableProps<T>) {
  const handleSort = (columnId: string, sortable: boolean = false) => {
    if (!sortable) return;

    if (sorting.sortBy === columnId) {
      // Toggle sort order
      onSortChange({
        sortBy: columnId,
        sortOrder: sorting.sortOrder === "asc" ? "desc" : "asc"
      });
    } else {
      // New column, default to desc
      onSortChange({
        sortBy: columnId,
        sortOrder: "desc"
      });
    }
  };

  const getSortIcon = (columnId: string) => {
    if (sorting.sortBy !== columnId) return null;
    return sorting.sortOrder === "asc" ? (
      <ChevronUpIcon className="ml-2 h-4 w-4" />
    ) : (
      <ChevronDownIcon className="ml-2 h-4 w-4" />
    );
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead
                key={column.id}
                className={cn(
                  column.className,
                  column.sortable &&
                    "cursor-pointer select-none hover:bg-muted/50"
                )}
                onClick={() => handleSort(column.id, column.sortable)}
              >
                <div className="flex items-center">
                  {column.header}
                  {column.sortable && getSortIcon(column.id)}
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="h-24 text-center text-muted-foreground"
              >
                Loading...
              </TableCell>
            </TableRow>
          ) : data.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="h-24 text-center text-muted-foreground"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            data.map((row) => (
              <TableRow
                key={row.id}
                className={cn(onRowClick && "cursor-pointer")}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((column) => {
                  const value = column.accessorKey
                    ? row[column.accessorKey as keyof T]
                    : column.accessorFn?.(row);

                  return (
                    <TableCell key={column.id} className={column.className}>
                      {column.cell
                        ? column.cell({ row, value })
                        : String(value)}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
