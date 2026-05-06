import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  XAxis,
  YAxis,
  Tooltip
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
import type { CatalogName } from "../sources/types";
import {
  buildAnalyticsGroupRows,
  fetchSourceAnalytics,
  SOURCE_CATALOGS,
  SOURCE_CATALOG_META,
  type GroupByDimension,
  type SourceAnalyticsData
} from "./api";
import { CatalogSkyMap } from "./CatalogSkyMap";

const GROUPING_OPTIONS_KEYS: Array<{
  value: GroupByDimension;
  translationKey: string;
}> = [
  { value: "catalog", translationKey: "analytics.groupingOptions.catalog" },
  {
    value: "sourceClass",
    translationKey: "analytics.groupingOptions.sourceClass"
  },
  {
    value: "discoveryMethod",
    translationKey: "analytics.groupingOptions.discoveryMethod"
  },
  {
    value: "confidenceBand",
    translationKey: "analytics.groupingOptions.confidenceBand"
  },
  {
    value: "catalogCountBand",
    translationKey: "analytics.groupingOptions.catalogCountBand"
  }
];

const CLASS_COLORS = [
  "#2A9D8F",
  "#E76F51",
  "#577590",
  "#F9C74F",
  "#9B5DE5",
  "#00BBF9"
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
  if (catalog in SOURCE_CATALOG_META) {
    return SOURCE_CATALOG_META[catalog as CatalogName].label;
  }

  return catalog;
}

function formatGroupLabel(
  groupBy: GroupByDimension,
  value: string,
  t: (key: string) => string
): string {
  if (groupBy === "catalog") {
    return formatCatalogLabel(value);
  }

  if (groupBy === "confidenceBand") {
    return t(`analytics.confidenceBands.${value}`);
  }

  if (groupBy === "catalogCountBand") {
    return t(`analytics.catalogCountBands.${value}`);
  }

  return value;
}

function buildClassMixConfig(
  topClasses: string[],
  t: (key: string) => string
): ChartConfig {
  const config: ChartConfig = {
    Other: {
      label: t("analytics.other"),
      color: "#B8B8B8"
    }
  };

  topClasses.forEach((className, index) => {
    config[className] = {
      label: className,
      color: CLASS_COLORS[index % CLASS_COLORS.length]
    };
  });

  return config;
}

export function CatalogAnalyticsPage() {
  const { t } = useTranslation();
  const [selectedCatalogs, setSelectedCatalogs] =
    useState<CatalogName[]>(SOURCE_CATALOGS);
  const [groupBy, setGroupBy] = useState<GroupByDimension>("catalog");

  const analyticsQuery = useQuery<SourceAnalyticsData, Error>({
    queryKey: ["source-analytics", selectedCatalogs],
    queryFn: () => fetchSourceAnalytics(selectedCatalogs),
    staleTime: 5 * 60 * 1000,
    placeholderData: (previousData) => previousData
  });

  const analyticsData = analyticsQuery.data;
  const sources = useMemo(
    () => analyticsData?.sources ?? [],
    [analyticsData?.sources]
  );
  const groupingRows = useMemo(
    () => buildAnalyticsGroupRows(sources, groupBy),
    [sources, groupBy]
  );
  const headlineMetrics = analyticsData?.headlineMetrics ?? {
    samples: 0,
    avgSignificance: 0,
    avgFlux1000: 0,
    avgConfidence: 0,
    multiCatalogShare: 0
  };
  const catalogComparison = analyticsData?.catalogComparison ?? [];
  const topSources = analyticsData?.topSources ?? [];
  const classMixRows = analyticsData?.classMixRows ?? [];
  const topClasses = useMemo(
    () => analyticsData?.topClasses ?? [],
    [analyticsData?.topClasses]
  );

  const catalogComparisonConfig = useMemo<ChartConfig>(
    () => ({
      scienceScore: {
        label: t("analytics.comparison.scienceScore"),
        color: "#2A9D8F"
      },
      multiCatalogShare: {
        label: t("analytics.comparison.multiCatalogShare"),
        color: "#E76F51"
      }
    }),
    [t]
  );

  const catalogCoverageConfig = useMemo<ChartConfig>(
    () => ({
      sampleCount: {
        label: t("analytics.coverageMetrics.sampleCount"),
        color: "#577590"
      },
      classDiversity: {
        label: t("analytics.coverageMetrics.classDiversity"),
        color: "#F9C74F"
      }
    }),
    [t]
  );
  const classMixConfig = useMemo(
    () => buildClassMixConfig(topClasses, t),
    [topClasses, t]
  );

  const significanceHistogram = analyticsData?.significanceHistogram;

  const histogramBins = useMemo(() => {
    if (!significanceHistogram)
      return [] as Array<{ label: string; edges: [number, number] }>;
    const edges = significanceHistogram.edges;
    const bins: Array<{ label: string; edges: [number, number] }> = [];
    for (let i = 0; i < edges.length - 1; i++) {
      const lo = edges[i];
      const hi = edges[i + 1];
      bins.push({
        label: `${lo.toExponential(1)}-${hi.toExponential(1)}`,
        edges: [lo, hi]
      });
    }
    return bins;
  }, [significanceHistogram]);

  const histogramChartConfig = useMemo<ChartConfig>(() => {
    const cfg: ChartConfig = {};
    for (const cat of SOURCE_CATALOGS) {
      cfg[cat] = {
        label: SOURCE_CATALOG_META[cat].label,
        color: SOURCE_CATALOG_META[cat].color
      };
    }
    return cfg;
  }, []);

  const histogramCombinedData = useMemo(() => {
    if (!significanceHistogram) return [];
    const per = significanceHistogram.perCatalog || {};
    const bins = histogramBins;
    return bins.map((b, idx) => {
      const row: Record<string, string | number> = { bin: b.label };
      for (const cat of SOURCE_CATALOGS) {
        const catalogEntry = per[cat];
        row[cat] = catalogEntry?.bins?.[idx]?.count ?? 0;
      }
      return row;
    });
  }, [significanceHistogram, histogramBins]);

  const toggleCatalog = (catalog: CatalogName) => {
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

  const selectedGroupingLabel = t(
    GROUPING_OPTIONS_KEYS.find((item) => item.value === groupBy)
      ?.translationKey ?? "analytics.groupingOptions.catalog"
  );

  const selectedCatalogComparison = catalogComparison.filter((row) =>
    selectedCatalogs.includes(row.catalog)
  );

  return (
    <main className="min-h-screen w-full">
      <div className="container mx-auto py-8 space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            {t("analytics.title")}
          </h1>
          <p className="text-muted-foreground max-w-3xl">
            {t("analytics.description")}
          </p>
        </header>

        {analyticsQuery.isLoading ? (
          <Card>
            <CardHeader>
              <CardTitle>{t("analytics.loadingTitle")}</CardTitle>
              <CardDescription>
                {t("analytics.loadingDescription")}
              </CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        {analyticsQuery.isError ? (
          <Card>
            <CardHeader>
              <CardTitle>{t("analytics.errorTitle")}</CardTitle>
              <CardDescription>
                {analyticsQuery.error instanceof Error
                  ? analyticsQuery.error.message
                  : t("analytics.errorDescription")}
              </CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        <section className="grid gap-6">
          <CatalogSkyMap selectedCatalogs={selectedCatalogs} />
        </section>

        <Card>
          <CardHeader>
            <CardTitle>{t("analytics.analysisScope")}</CardTitle>
            <CardDescription>
              {t("analytics.analysisScopeDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-wrap gap-2">
              {SOURCE_CATALOGS.map((catalog) => {
                const active = selectedCatalogs.includes(catalog);

                return (
                  <Button
                    key={catalog}
                    type="button"
                    variant={active ? "default" : "outline"}
                    onClick={() => toggleCatalog(catalog)}
                  >
                    {SOURCE_CATALOG_META[catalog].label}
                  </Button>
                );
              })}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>{t("analytics.groupingsTitle")}</CardTitle>
                <CardDescription>
                  {t("analytics.groupingsDescription", {
                    grouping: selectedGroupingLabel
                  })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("analytics.tableColumns.group")}</TableHead>
                      <TableHead>
                        {t("analytics.tableColumns.samples")}
                      </TableHead>
                      <TableHead>
                        {t("analytics.tableColumns.avgEmission")}
                      </TableHead>
                      <TableHead>
                        {t("analytics.tableColumns.avgSigma")}
                      </TableHead>
                      <TableHead>
                        {t("analytics.tableColumns.avgConfidence")}
                      </TableHead>
                      <TableHead>
                        {t("analytics.tableColumns.avgCatalogCount")}
                      </TableHead>
                      <TableHead>
                        {t("analytics.tableColumns.multiCatalogPercent")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupingRows.map((row) => (
                      <TableRow key={row.group}>
                        <TableCell>
                          {formatGroupLabel(groupBy, row.group, t)}
                        </TableCell>
                        <TableCell>{row.sampleCount}</TableCell>
                        <TableCell>{formatFlux(row.avgFlux1000)}</TableCell>
                        <TableCell>
                          {formatFloat(row.avgSignificance, 2)}
                        </TableCell>
                        <TableCell>
                          {formatFloat(row.avgConfidence, 3)}
                        </TableCell>
                        <TableCell>
                          {formatFloat(row.avgCatalogCount, 2)}
                        </TableCell>
                        <TableCell>
                          {formatFloat(row.multiCatalogShare, 1)}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <Card size="sm">
                <CardHeader>
                  <CardDescription>
                    {t("analytics.metrics.samples")}
                  </CardDescription>
                  <CardTitle>{headlineMetrics.samples}</CardTitle>
                </CardHeader>
              </Card>
              <Card size="sm">
                <CardHeader>
                  <CardDescription>
                    {t("analytics.metrics.avgSigma")}
                  </CardDescription>
                  <CardTitle>
                    {formatFloat(headlineMetrics.avgSignificance, 2)}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card size="sm">
                <CardHeader>
                  <CardDescription>
                    {t("analytics.metrics.avgFlux")}
                  </CardDescription>
                  <CardTitle>
                    {formatFlux(headlineMetrics.avgFlux1000)}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card size="sm">
                <CardHeader>
                  <CardDescription>
                    {t("analytics.metrics.avgConfidence")}
                  </CardDescription>
                  <CardTitle>
                    {formatFloat(headlineMetrics.avgConfidence, 3)}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card size="sm">
                <CardHeader>
                  <CardDescription>
                    {t("analytics.metrics.multiCatalogShare")}
                  </CardDescription>
                  <CardTitle>
                    {formatFloat(headlineMetrics.multiCatalogShare, 1)}%
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>

            <div className="max-w-sm space-y-2">
              <p className="text-sm text-muted-foreground">
                {t("analytics.groupingLabel")}
              </p>
              <Select
                value={groupBy}
                onValueChange={(value) => setGroupBy(value as GroupByDimension)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GROUPING_OPTIONS_KEYS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {t(option.translationKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <section className="gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("analytics.catalogComparison")}</CardTitle>
              <CardDescription>
                {t("analytics.catalogComparisonDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={catalogComparisonConfig}>
                <BarChart
                  data={selectedCatalogComparison}
                  margin={{ left: 8, right: 8 }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="catalog"
                    tickFormatter={(value) => formatCatalogLabel(String(value))}
                  />
                  <YAxis
                    tickFormatter={(value) => formatFloat(value, 0)}
                    width={56}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        valueFormatter={(value) => formatFloat(value, 1)}
                      />
                    }
                  />
                  <Legend />
                  <Bar
                    dataKey="scienceScore"
                    fill="var(--color-scienceScore)"
                  />
                  <Bar
                    dataKey="multiCatalogShare"
                    fill="var(--color-multiCatalogShare)"
                  />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </section>

        <section className="gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("analytics.catalogCoverage")}</CardTitle>
              <CardDescription>
                {t("analytics.catalogCoverageDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={catalogCoverageConfig}>
                <BarChart
                  data={selectedCatalogComparison}
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
                        valueFormatter={(value) => formatFloat(value, 1)}
                      />
                    }
                  />
                  <Legend />
                  <Bar dataKey="sampleCount" fill="var(--color-sampleCount)" />
                  <Bar
                    dataKey="classDiversity"
                    fill="var(--color-classDiversity)"
                  />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </section>

        <section className="gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("analytics.classMixTitle")}</CardTitle>
              <CardDescription>
                {t("analytics.classMixDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={classMixConfig}>
                <BarChart data={classMixRows} margin={{ left: 8, right: 8 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="catalog"
                    tickFormatter={(value) => formatCatalogLabel(String(value))}
                  />
                  <YAxis width={48} />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        valueFormatter={(value) => formatFloat(value, 0)}
                      />
                    }
                  />
                  <Legend />
                  {topClasses.map((className) => (
                    <Bar
                      key={className}
                      dataKey={className}
                      stackId="classes"
                      fill={`var(--color-${className})`}
                    />
                  ))}
                  <Bar
                    dataKey="Other"
                    stackId="classes"
                    fill="var(--color-Other)"
                  />
                </BarChart>
              </ChartContainer>

              <div className="flex flex-wrap gap-2 mt-4">
                {topClasses.map((className) => (
                  <Badge key={className} variant="secondary">
                    {className}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between w-full">
                <div>
                  <CardTitle>
                    {t("analytics.significanceHistogramTitle")}
                  </CardTitle>
                  <CardDescription>
                    {t("analytics.significanceHistogramDescription")}
                  </CardDescription>
                </div>
                {/* Facets mode removed — showing overlap histogram only */}
              </div>
            </CardHeader>
            <CardContent>
              <ChartContainer config={histogramChartConfig}>
                <BarChart
                  data={histogramCombinedData}
                  margin={{ left: 8, right: 8 }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="bin" tick={{ fontSize: 11 }} />
                  <YAxis width={56} />
                  <Tooltip
                    formatter={(value, name) => [String(value), String(name)]}
                  />
                  <Legend />
                  {selectedCatalogs.map((cat) => (
                    <Bar
                      key={cat}
                      dataKey={cat}
                      fill={`var(--color-${cat})`}
                      fillOpacity={0.6}
                    />
                  ))}
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>{t("analytics.topSourcesTitle")}</CardTitle>
            <CardDescription>
              {t("analytics.topSourcesDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    {t("analytics.topSourcesColumns.sourceName")}
                  </TableHead>
                  <TableHead>
                    {t("analytics.topSourcesColumns.catalog")}
                  </TableHead>
                  <TableHead>
                    {t("analytics.topSourcesColumns.sourceClass")}
                  </TableHead>
                  <TableHead>
                    {t("analytics.topSourcesColumns.significance")}
                  </TableHead>
                  <TableHead>{t("analytics.topSourcesColumns.flux")}</TableHead>
                  <TableHead>
                    {t("analytics.topSourcesColumns.confidence")}
                  </TableHead>
                  <TableHead>
                    {t("analytics.topSourcesColumns.catalogCount")}
                  </TableHead>
                  <TableHead>
                    {t("analytics.topSourcesColumns.score")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topSources.map((row) => (
                  <TableRow key={`${row.catalog}-${row.name}`}>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{formatCatalogLabel(row.catalog)}</TableCell>
                    <TableCell>{row.sourceClass}</TableCell>
                    <TableCell>{formatFloat(row.significance, 2)}</TableCell>
                    <TableCell>{formatFlux(row.flux1000)}</TableCell>
                    <TableCell>{formatFloat(row.confidence, 3)}</TableCell>
                    <TableCell>{row.catalogCount}</TableCell>
                    <TableCell>{formatFloat(row.score, 1)}</TableCell>
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
