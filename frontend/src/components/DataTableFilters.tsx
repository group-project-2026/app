import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import type {
  DataTableFiltersProps,
  FilterConfig
} from "@/components/data-table-types";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command";

export function DataTableFilters({
  filters,
  filterState,
  onFilterChange,
  onClearFilters
}: DataTableFiltersProps) {
  const getArrayFilterValue = (value: unknown): string[] =>
    Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string")
      : [];

  const getNumberFilterValue = (value: unknown, fallback: number): number =>
    typeof value === "number" ? value : fallback;

  const handleTextChange = (filterId: string, value: string) => {
    onFilterChange({ ...filterState, [filterId]: value || undefined });
  };

  const handleNumberChange = (filterId: string, value: string) => {
    const numValue = parseFloat(value);
    onFilterChange({
      ...filterState,
      [filterId]: isNaN(numValue) ? undefined : numValue
    });
  };

  const handleMultiSelectChange = (filterId: string, value: string) => {
    const current = getArrayFilterValue(filterState[filterId]);
    const newValue = current.includes(value)
      ? current.filter((v: string) => v !== value)
      : [...current, value];
    onFilterChange({
      ...filterState,
      [filterId]: newValue.length > 0 ? newValue : undefined
    });
  };

  const removeFilter = (key: string) => {
    const newState = { ...filterState };
    delete newState[key];
    onFilterChange(newState);
  };

  const renderFilter = (filter: FilterConfig) => {
    switch (filter.type) {
      case "text":
        return (
          <div key={filter.id} className="flex flex-col space-y-2">
            <Label htmlFor={filter.id}>{filter.label}</Label>
            <Input
              id={filter.id}
              placeholder={filter.placeholder}
              value={String(filterState[filter.id] || "")}
              onChange={(e) => handleTextChange(filter.id, e.target.value)}
              className="h-9"
            />
          </div>
        );

      case "number":
        return (
          <div key={filter.id} className="flex flex-col space-y-2">
            <Label htmlFor={filter.id}>{filter.label}</Label>
            <Input
              id={filter.id}
              type="number"
              placeholder={filter.placeholder}
              value={String(filterState[filter.id] || "")}
              onChange={(e) => handleNumberChange(filter.id, e.target.value)}
              min={filter.min}
              step={filter.step}
              className="h-9"
            />
          </div>
        );

      case "multiselect": {
        const selectedValues = getArrayFilterValue(filterState[filter.id]);
        return (
          <div key={filter.id} className="flex flex-col space-y-2">
            <Label>{filter.label}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="justify-start h-9 font-normal"
                >
                  {selectedValues.length > 0
                    ? `${selectedValues.length} selected`
                    : "Select..."}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-50 p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search..." />
                  <CommandList>
                    <CommandEmpty>No results found.</CommandEmpty>
                    <CommandGroup>
                      {filter.options?.map((option) => (
                        <CommandItem
                          key={option.value}
                          onSelect={() =>
                            handleMultiSelectChange(filter.id, option.value)
                          }
                        >
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={selectedValues.includes(option.value)}
                              onCheckedChange={() =>
                                handleMultiSelectChange(filter.id, option.value)
                              }
                            />
                            <span>{option.label}</span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        );
      }

      case "range": {
        const minKey = `${filter.field}Min`;
        const maxKey = `${filter.field}Max`;
        const minValue = getNumberFilterValue(
          filterState[minKey],
          filter.min ?? 0
        );
        const maxValue = getNumberFilterValue(
          filterState[maxKey],
          filter.max ?? 100
        );
        return (
          <div key={filter.id} className="flex flex-col space-y-2">
            <Label>{filter.label}</Label>
            <div className="flex items-center space-x-2">
              <Input
                type="number"
                value={minValue}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val)) {
                    onFilterChange({
                      ...filterState,
                      [minKey]: val !== filter.min ? val : undefined
                    });
                  }
                }}
                min={filter.min}
                max={filter.max}
                step={filter.step}
                className="h-9 w-20"
              />
              <span className="text-sm text-muted-foreground">to</span>
              <Input
                type="number"
                value={maxValue}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val)) {
                    onFilterChange({
                      ...filterState,
                      [maxKey]: val !== filter.max ? val : undefined
                    });
                  }
                }}
                min={filter.min}
                max={filter.max}
                step={filter.step}
                className="h-9 w-20"
              />
            </div>
          </div>
        );
      }

      default:
        return null;
    }
  };

  const activeFilters = Object.entries(filterState).filter(
    ([, value]) =>
      value !== undefined && (Array.isArray(value) ? value.length > 0 : true)
  );

  return (
    <div className="space-y-4">
      {/* Filter controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {filters.map(renderFilter)}
      </div>

      {/* Active filter badges and clear button */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {activeFilters.map(([key, value]) => {
            const filter = filters.find(
              (f) => f.id === key || key.startsWith(f.field)
            );
            const displayValue = Array.isArray(value)
              ? `${value.length} selected`
              : typeof value === "number"
                ? value.toFixed(2)
                : String(value);

            return (
              <Badge key={key} variant="secondary" className="gap-1">
                {filter?.label || key}: {displayValue}
                <X
                  className="h-3 w-3 cursor-pointer hover:text-destructive"
                  onClick={() => removeFilter(key)}
                />
              </Badge>
            );
          })}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="h-7 px-2 text-xs"
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
}
