import * as React from "react";
import * as RechartsPrimitive from "recharts";

import { cn } from "@/lib/utils";

export type ChartConfig = Record<
  string,
  {
    label: string;
    color?: string;
  }
>;

interface ChartContextValue {
  config: ChartConfig;
}

const ChartContext = React.createContext<ChartContextValue | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);

  if (!context) {
    throw new Error("Chart components must be used inside ChartContainer.");
  }

  return context;
}

type ChartContainerProps = React.ComponentProps<"div"> & {
  config: ChartConfig;
  children: React.ComponentProps<
    typeof RechartsPrimitive.ResponsiveContainer
  >["children"];
};

function ChartContainer({
  config,
  className,
  children,
  ...props
}: ChartContainerProps) {
  const chartId = React.useId().replace(/:/g, "");

  const cssVariables = React.useMemo(() => {
    const declarations = Object.entries(config)
      .filter(([, value]) => Boolean(value.color))
      .map(([key, value]) => `--color-${key}: ${value.color};`)
      .join("");

    if (!declarations) {
      return "";
    }

    return `[data-chart="${chartId}"]{${declarations}}`;
  }, [chartId, config]);

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={chartId}
        className={cn(
          "h-80 w-full text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line]:stroke-border/60 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-layer.recharts-bar-rectangle]:outline-hidden [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted/30 [&_.recharts-sector]:outline-hidden",
          className
        )}
        {...props}
      >
        {cssVariables ? (
          <style dangerouslySetInnerHTML={{ __html: cssVariables }} />
        ) : null}
        <RechartsPrimitive.ResponsiveContainer>
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

const ChartTooltip = RechartsPrimitive.Tooltip;

type TooltipPayloadItem = {
  dataKey?: string | number;
  name?: string | number;
  value?: string | number;
  color?: string;
};

type ChartTooltipContentProps = React.ComponentProps<"div"> & {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string | number;
  hideLabel?: boolean;
  valueFormatter?: (
    value: string | number | undefined,
    dataKey: string
  ) => string;
};

const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  ChartTooltipContentProps
>(
  (
    {
      active,
      payload,
      label,
      className,
      hideLabel = false,
      valueFormatter,
      ...props
    },
    ref
  ) => {
    const { config } = useChart();

    if (!active || !payload || payload.length === 0) {
      return null;
    }

    return (
      <div
        ref={ref}
        className={cn(
          "grid min-w-45 gap-2 rounded-lg border bg-card px-3 py-2 text-xs shadow-md",
          className
        )}
        {...props}
      >
        {!hideLabel && label !== undefined ? (
          <div className="font-medium text-foreground">{String(label)}</div>
        ) : null}

        <div className="grid gap-1">
          {payload.map((item, index) => {
            const dataKey = String(
              item.dataKey ?? item.name ?? `value-${index}`
            );
            const itemConfig = config[dataKey];
            const labelText = itemConfig?.label ?? String(item.name ?? dataKey);
            const color =
              item.color ?? itemConfig?.color ?? "var(--foreground)";
            const displayValue = valueFormatter
              ? valueFormatter(item.value, dataKey)
              : String(item.value ?? "-");

            return (
              <div
                key={`${dataKey}-${index}`}
                className="flex items-center gap-2"
              >
                <span
                  className="size-2 shrink-0 rounded-xs"
                  style={{ backgroundColor: color }}
                />
                <span className="text-muted-foreground">{labelText}</span>
                <span className="ml-auto font-mono text-foreground">
                  {displayValue}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);
ChartTooltipContent.displayName = "ChartTooltipContent";

export { ChartContainer, ChartTooltip, ChartTooltipContent };
