import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  XAxis,
  YAxis
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  CATALOG_ANALYTICS_DATA,
  CATALOG_KEYS,
  CATALOG_META,
  type CatalogKey
} from "./catalogAnalyticsData";
import {
  aggregateByDimension,
  buildCatalogRadarComparison,
  buildDetectabilityComparison,
  buildEmissionComparison,
  buildEmissionTrend,
  buildSignificanceComparison,
  calculateHeadlineMetrics,
  getCatalogLabel,
  type GroupByDimension
} from "./aggregations";

const GROUPING_OPTIONS: Array<{ value: GroupByDimension; label: string }> = [
  { value: "catalog", label: "Katalog" },
  { value: "year", label: "Rok" },
  { value: "energyBand", label: "Pasmo energii" },
  { value: "skyRegion", label: "Region nieba" },
  { value: "sourceType", label: "Typ źródła" }
];

function formatFlux(value: number | string | undefined): string {
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  if (!Number.isFinite(numeric)) {
    return "-";
  }

  return numeric.toExponential(2);
}

function formatFloat(value: number | string | undefined, digits = 2): string {
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  if (!Number.isFinite(numeric)) {
    return "-";
  }

  return numeric.toFixed(digits);
}

function formatCatalogLabel(catalog: string): string {
  if ((CATALOG_KEYS as string[]).includes(catalog)) {
    return getCatalogLabel(catalog as CatalogKey);
  }

  return catalog;
}

export function CatalogAnalyticsPage() {
  const [selectedCatalogs, setSelectedCatalogs] =
    useState<CatalogKey[]>(CATALOG_KEYS);
  const [groupBy, setGroupBy] = useState<GroupByDimension>("catalog");

  const filteredObservations = useMemo(
    () =>
      CATALOG_ANALYTICS_DATA.filter((item) =>
        selectedCatalogs.includes(item.catalog)
      ),
    [selectedCatalogs]
  );

  const headlineMetrics = useMemo(
    () => calculateHeadlineMetrics(filteredObservations),
    [filteredObservations]
  );

  const emissionTrend = useMemo(
    () => buildEmissionTrend(filteredObservations, selectedCatalogs),
    [filteredObservations, selectedCatalogs]
  );

  const emissionComparison = useMemo(
    () => buildEmissionComparison(filteredObservations),
    [filteredObservations]
  );

  const significanceComparison = useMemo(
    () => buildSignificanceComparison(filteredObservations),
    [filteredObservations]
  );

  const detectabilityComparison = useMemo(
    () => buildDetectabilityComparison(filteredObservations),
    [filteredObservations]
  );

  const groupingRows = useMemo(
    () => aggregateByDimension(filteredObservations, groupBy),
    [filteredObservations, groupBy]
  );

  const radarRawData = useMemo(
    () => buildCatalogRadarComparison(filteredObservations),
    [filteredObservations]
  );

  const radarMetrics = useMemo(() => {
    const byCatalog = new Map(radarRawData.map((item) => [item.catalog, item]));

    const entries = [
      { key: "emissionIndex", label: "Emission index" },
      { key: "significanceIndex", label: "Significance index" },
      { key: "detectabilityIndex", label: "Detectability index" },
      { key: "highDetectabilityShare", label: "High detectability share" }
    ] as const;

    return entries.map((entry) => {
      const row: { metric: string } & Partial<Record<CatalogKey, number>> = {
        metric: entry.label
      };

      for (const catalog of selectedCatalogs) {
        const sourceRow = byCatalog.get(catalog);
        row[catalog] = sourceRow ? sourceRow[entry.key] : 0;
      }

      return row;
    });
  }, [radarRawData, selectedCatalogs]);

  const catalogChartConfig = useMemo(() => {
    const config: ChartConfig = {};

    for (const catalog of selectedCatalogs) {
      config[catalog] = {
        label: CATALOG_META[catalog].label,
        color: CATALOG_META[catalog].color
      };
    }

    return config;
  }, [selectedCatalogs]);

  const significanceConfig = useMemo<ChartConfig>(
    () => ({
      avgSignificance: {
        label: "Średnia sigma",
        color: "#4D908E"
      },
      p95Significance: {
        label: "95 percentyl sigma",
        color: "#F9844A"
      },
      peakSignificance: {
        label: "Maksimum sigma",
        color: "#F94144"
      }
    }),
    []
  );

  const detectabilityConfig = useMemo<ChartConfig>(
    () => ({
      low: { label: "Low", color: "#577590" },
      medium: { label: "Medium", color: "#F9C74F" },
      high: { label: "High", color: "#43AA8B" }
    }),
    []
  );

  const emissionComparisonConfig = useMemo<ChartConfig>(
    () => ({
      avgEmissionFlux: {
        label: "Średnia emisja",
        color: "#2A9D8F"
      },
      peakEmissionFlux: {
        label: "Szczyt emisji",
        color: "#E76F51"
      }
    }),
    []
  );

  const toggleCatalog = (catalog: CatalogKey) => {
    setSelectedCatalogs((previous) => {
      if (previous.includes(catalog)) {
        if (previous.length === 1) {
          return previous;
        }

        return previous.filter((item) => item !== catalog);
      }

      return [...previous, catalog];
    });
  };

  const selectedGroupingLabel =
    GROUPING_OPTIONS.find((item) => item.value === groupBy)?.label ?? "Katalog";

  return (
    <main className="min-h-screen w-full">
      <div className="container mx-auto py-8 space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Catalog Analytics
          </h1>
          <p className="text-muted-foreground max-w-3xl">
            Podstrona analityczna oparta o shadcn charts dla katalogów Fermin,
            HAWC, LHAASO, NED, TeVCat i MAGIC: emisja, istotność statystyczna,
            porównania między katalogami, osobna sekcja detectability oraz
            groupingi i agregacje pod analizę.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Zakres analizy</CardTitle>
            <CardDescription>
              Wybierz katalogi i poziom agregacji do sekcji porównawczej.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-wrap gap-2">
              {CATALOG_KEYS.map((catalog) => {
                const active = selectedCatalogs.includes(catalog);

                return (
                  <Button
                    key={catalog}
                    type="button"
                    variant={active ? "default" : "outline"}
                    onClick={() => toggleCatalog(catalog)}
                  >
                    {CATALOG_META[catalog].label}
                  </Button>
                );
              })}
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <Card size="sm">
                <CardHeader>
                  <CardDescription>Próbki</CardDescription>
                  <CardTitle>{headlineMetrics.samples}</CardTitle>
                </CardHeader>
              </Card>
              <Card size="sm">
                <CardHeader>
                  <CardDescription>Średnia emisja</CardDescription>
                  <CardTitle>
                    {formatFlux(headlineMetrics.avgEmissionFlux)}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card size="sm">
                <CardHeader>
                  <CardDescription>Średnia sigma</CardDescription>
                  <CardTitle>
                    {formatFloat(headlineMetrics.avgSignificance)}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card size="sm">
                <CardHeader>
                  <CardDescription>High detectability</CardDescription>
                  <CardTitle>
                    {formatFloat(headlineMetrics.highDetectabilityShare, 1)}%
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>

            <div className="max-w-sm space-y-2">
              <p className="text-sm text-muted-foreground">
                Grouping dla tabeli agregacji
              </p>
              <Select
                value={groupBy}
                onValueChange={(value) => setGroupBy(value as GroupByDimension)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GROUPING_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <section className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Wykresy emisji: trend roczny</CardTitle>
              <CardDescription>
                Średni strumień emisji dla wybranych katalogów w czasie.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={catalogChartConfig}>
                <LineChart data={emissionTrend} margin={{ left: 8, right: 8 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="year" />
                  <YAxis
                    tickFormatter={(value) => formatFlux(value)}
                    width={72}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        valueFormatter={(value) => formatFlux(value)}
                      />
                    }
                  />
                  <Legend
                    formatter={(value: string | number) =>
                      formatCatalogLabel(String(value))
                    }
                  />
                  {selectedCatalogs.map((catalog) => (
                    <Line
                      key={catalog}
                      type="monotone"
                      dataKey={catalog}
                      stroke={`var(--color-${catalog})`}
                      strokeWidth={2}
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Wykresy emisji: średnia vs maksimum</CardTitle>
              <CardDescription>
                Porównanie poziomów emisji pomiędzy katalogami.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={emissionComparisonConfig}>
                <BarChart
                  data={emissionComparison}
                  margin={{ left: 8, right: 8 }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="catalog"
                    tickFormatter={(value) => formatCatalogLabel(String(value))}
                  />
                  <YAxis
                    tickFormatter={(value) => formatFlux(value)}
                    width={72}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        valueFormatter={(value) => formatFlux(value)}
                      />
                    }
                  />
                  <Legend />
                  <Bar
                    dataKey="avgEmissionFlux"
                    fill="var(--color-avgEmissionFlux)"
                  />
                  <Bar
                    dataKey="peakEmissionFlux"
                    fill="var(--color-peakEmissionFlux)"
                  />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Wykres istotności statystycznej</CardTitle>
            <CardDescription>
              Średnia, 95 percentyl i wartość maksymalna detekcji (sigma) na
              katalog.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={significanceConfig}>
              <BarChart
                data={significanceComparison}
                margin={{ left: 8, right: 8 }}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="catalog"
                  tickFormatter={(value) => formatCatalogLabel(String(value))}
                />
                <YAxis width={48} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      valueFormatter={(value) => `${formatFloat(value, 2)} σ`}
                    />
                  }
                />
                <Legend />
                <Bar
                  dataKey="avgSignificance"
                  fill="var(--color-avgSignificance)"
                />
                <Bar
                  dataKey="p95Significance"
                  fill="var(--color-p95Significance)"
                />
                <Bar
                  dataKey="peakSignificance"
                  fill="var(--color-peakSignificance)"
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Porównania między katalogami</CardTitle>
            <CardDescription>
              Radar porównujący emisję, istotność i detectability po
              normalizacji.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={catalogChartConfig}>
              <RadarChart data={radarMetrics} outerRadius="70%">
                <PolarGrid />
                <PolarAngleAxis dataKey="metric" />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      valueFormatter={(value) => formatFloat(value, 1)}
                    />
                  }
                />
                <Legend
                  formatter={(value: string | number) =>
                    formatCatalogLabel(String(value))
                  }
                />
                {selectedCatalogs.map((catalog) => (
                  <Radar
                    key={catalog}
                    dataKey={catalog}
                    stroke={`var(--color-${catalog})`}
                    fill={`var(--color-${catalog})`}
                    fillOpacity={0.18}
                  />
                ))}
              </RadarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Detectability: osobna sekcja porównania</CardTitle>
            <CardDescription>
              Rozkład low/medium/high detectability dla każdego katalogu.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ChartContainer config={detectabilityConfig}>
              <BarChart
                data={detectabilityComparison}
                margin={{ left: 8, right: 8 }}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="catalog"
                  tickFormatter={(value) => formatCatalogLabel(String(value))}
                />
                <YAxis width={56} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      valueFormatter={(value) => formatFloat(value, 0)}
                    />
                  }
                />
                <Legend />
                <Bar
                  dataKey="low"
                  stackId="detectability"
                  fill="var(--color-low)"
                />
                <Bar
                  dataKey="medium"
                  stackId="detectability"
                  fill="var(--color-medium)"
                />
                <Bar
                  dataKey="high"
                  stackId="detectability"
                  fill="var(--color-high)"
                />
              </BarChart>
            </ChartContainer>

            <div className="flex flex-wrap gap-2">
              {detectabilityComparison.map((row) => (
                <Badge key={row.catalog} variant="secondary">
                  {formatCatalogLabel(row.catalog)}: avg {row.avgDetectability}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Groupingi i agregacje pod analizę</CardTitle>
            <CardDescription>
              Aktualny grouping: {selectedGroupingLabel}. Tabela zbiorcza dla
              wybranego wymiaru analitycznego.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Grupa</TableHead>
                  <TableHead>Próbki</TableHead>
                  <TableHead>Avg emission</TableHead>
                  <TableHead>Median emission</TableHead>
                  <TableHead>Avg sigma</TableHead>
                  <TableHead>Peak sigma</TableHead>
                  <TableHead>Avg detectability</TableHead>
                  <TableHead>High detectability %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupingRows.map((row) => (
                  <TableRow key={row.group}>
                    <TableCell>{formatCatalogLabel(row.group)}</TableCell>
                    <TableCell>{row.sampleCount}</TableCell>
                    <TableCell>{formatFlux(row.avgEmissionFlux)}</TableCell>
                    <TableCell>{formatFlux(row.medianEmissionFlux)}</TableCell>
                    <TableCell>{formatFloat(row.avgSignificance, 2)}</TableCell>
                    <TableCell>
                      {formatFloat(row.peakSignificance, 2)}
                    </TableCell>
                    <TableCell>
                      {formatFloat(row.avgDetectability, 1)}
                    </TableCell>
                    <TableCell>
                      {formatFloat(row.highDetectabilityShare, 1)}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
