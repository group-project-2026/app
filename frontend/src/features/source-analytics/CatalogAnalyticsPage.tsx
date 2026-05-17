import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks";
import { Bar, BarChart, CartesianGrid, Legend, XAxis, YAxis } from "recharts";

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
  fetchBackendAnalytics,
  SOURCE_CATALOGS,
  SOURCE_CATALOG_META,
  type GroupByDimension,
  type SourceAnalyticsData,
  type BackendAnalyticsResponse
} from "./api";
import { CatalogSkyMap } from "./CatalogSkyMap";
import { MagicSedChart } from "./MagicSedChart";
import type { CosmicPoint } from "@/components/universe-map/types";

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
  usePageTitle("pages.analytics");
  const { t } = useTranslation();
  const [selectedCatalogs, setSelectedCatalogs] =
    useState<CatalogName[]>(SOURCE_CATALOGS);
  const [groupBy, setGroupBy] = useState<GroupByDimension>("catalog");

  const [searchParams] = useSearchParams();
  const location = useLocation();
  const focusedObjectId = searchParams.get("id");
  const focusedObject =
    (location.state as { point?: CosmicPoint } | null)?.point ?? null;

  useEffect(() => {
    if (!focusedObjectId) return;
    const el = document.getElementById("object-detail");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [focusedObjectId]);

  const analyticsQuery = useQuery<SourceAnalyticsData, Error>({
    queryKey: ["source-analytics", selectedCatalogs],
    queryFn: () => fetchSourceAnalytics(selectedCatalogs),
    staleTime: 5 * 60 * 1000,
    placeholderData: (previousData) => previousData
  });

  const backendAnalyticsQuery = useQuery<
    BackendAnalyticsResponse | null,
    Error
  >({
    queryKey: ["backend-analytics", selectedCatalogs],
    queryFn: () => fetchBackendAnalytics(selectedCatalogs),
    staleTime: 5 * 60 * 1000,
    retry: false
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
  const magicHeadlineMetrics = analyticsData?.magicHeadlineMetrics ?? {
    samples: 0,
    sourcesWithMagic: 0,
    avgMagicSignificance: 0,
    detectableShare: 0
  };
  const magicComparison = analyticsData?.magicComparison ?? [];
  const magicTopSources = analyticsData?.magicTopSources ?? [];

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
  const magicComparisonConfig = useMemo<ChartConfig>(
    () => ({
      avgMagicSignificance: {
        label: t("analytics.magic.chart.avgMagicSignificance"),
        color: "#D62828"
      },
      detectableShare: {
        label: t("analytics.magic.chart.detectableShare"),
        color: "#F4A261"
      }
    }),
    [t]
  );
  const classMixConfig = useMemo(
    () => buildClassMixConfig(topClasses, t),
    [topClasses, t]
  );

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

        {focusedObjectId && (
          <Card id="object-detail">
            <CardHeader>
              <CardTitle>{t("analytics.objectDetail.title")}</CardTitle>
              <CardDescription>
                {t("analytics.objectDetail.description")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {focusedObject ? (
                <div className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                    <ObjectDetailField
                      label={t("sources.columns.sourceName")}
                      value={focusedObject.name}
                    />
                    <ObjectDetailField
                      label={t("sources.columns.primaryCatalog")}
                      value={formatCatalogLabel(focusedObject.primaryCatalog)}
                    />
                    <ObjectDetailField
                      label={t("sources.columns.ra")}
                      value={`${focusedObject.ra.toFixed(4)}°`}
                    />
                    <ObjectDetailField
                      label={t("sources.columns.dec")}
                      value={`${focusedObject.dec.toFixed(4)}°`}
                    />
                    <ObjectDetailField
                      label={t("sources.columns.sourceClass")}
                      value={focusedObject.sourceClass ?? "-"}
                    />
                    <ObjectDetailField
                      label={t("sources.columns.significance")}
                      value={formatFloat(
                        focusedObject.significance ?? undefined,
                        2
                      )}
                    />
                    <ObjectDetailField
                      label={t("sources.columns.flux1000")}
                      value={formatFlux(focusedObject.flux1000 ?? undefined)}
                    />
                    <ObjectDetailField
                      label={t("sources.columns.spectralIndex")}
                      value={formatFloat(
                        focusedObject.spectralIndex ?? undefined,
                        3
                      )}
                    />
                    <ObjectDetailField
                      label={t("sources.columns.avgConfidence")}
                      value={formatFloat(
                        focusedObject.avgConfidence ?? undefined,
                        3
                      )}
                    />
                    <ObjectDetailField
                      label={t("sources.columns.bestConfidence")}
                      value={formatFloat(
                        focusedObject.bestConfidence ?? undefined,
                        3
                      )}
                    />
                    <ObjectDetailField
                      label={t("sources.columns.catalogCount")}
                      value={String(focusedObject.catalogCount)}
                    />
                    <ObjectDetailField
                      label={t("sources.columns.associatedName")}
                      value={focusedObject.associatedName ?? "-"}
                    />
                    <ObjectDetailField
                      label={t("sources.columns.discoveryMethod")}
                      value={focusedObject.discoveryMethod ?? "-"}
                    />
                  </div>

                  <MagicSedChart sourceId={focusedObjectId} />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t("analytics.objectDetail.empty")}
                </p>
              )}
            </CardContent>
          </Card>
        )}

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
                    name={t("analytics.comparison.scienceScore")}
                    dataKey="scienceScore"
                    fill="var(--color-scienceScore)"
                  />
                  <Bar
                    name={t("analytics.comparison.multiCatalogShare")}
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
                  <Bar
                    name={t("analytics.coverageMetrics.sampleCount")}
                    dataKey="sampleCount"
                    fill="var(--color-sampleCount)"
                  />
                  <Bar
                    name={t("analytics.coverageMetrics.classDiversity")}
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
              <CardTitle>{t("analytics.magic.title")}</CardTitle>
              <CardDescription>
                {t("analytics.magic.description")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <Card size="sm">
                  <CardHeader>
                    <CardDescription>
                      {t("analytics.magic.metrics.samples")}
                    </CardDescription>
                    <CardTitle>{magicHeadlineMetrics.samples}</CardTitle>
                  </CardHeader>
                </Card>
                <Card size="sm">
                  <CardHeader>
                    <CardDescription>
                      {t("analytics.magic.metrics.withMagic")}
                    </CardDescription>
                    <CardTitle>
                      {magicHeadlineMetrics.sourcesWithMagic}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card size="sm">
                  <CardHeader>
                    <CardDescription>
                      {t("analytics.magic.metrics.avgSignificance")}
                    </CardDescription>
                    <CardTitle>
                      {formatFloat(
                        magicHeadlineMetrics.avgMagicSignificance,
                        2
                      )}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card size="sm">
                  <CardHeader>
                    <CardDescription>
                      {t("analytics.magic.metrics.detectableShare")}
                    </CardDescription>
                    <CardTitle>
                      {formatFloat(magicHeadlineMetrics.detectableShare, 1)}%
                    </CardTitle>
                  </CardHeader>
                </Card>
              </div>

              <ChartContainer config={magicComparisonConfig}>
                <BarChart data={magicComparison} margin={{ left: 8, right: 8 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="catalog"
                    tickFormatter={(value) => formatCatalogLabel(String(value))}
                  />
                  <YAxis
                    yAxisId="left"
                    tickFormatter={(value) => formatFloat(value, 1)}
                    width={56}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    domain={[0, 100]}
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
                    yAxisId="left"
                    name={t("analytics.magic.chart.avgMagicSignificance")}
                    dataKey="avgMagicSignificance"
                    fill="var(--color-avgMagicSignificance)"
                  />
                  <Bar
                    yAxisId="right"
                    name={t("analytics.magic.chart.detectableShare")}
                    dataKey="detectableShare"
                    fill="var(--color-detectableShare)"
                  />
                </BarChart>
              </ChartContainer>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      {t("analytics.magic.tableColumns.name")}
                    </TableHead>
                    <TableHead>
                      {t("analytics.magic.tableColumns.catalog")}
                    </TableHead>
                    <TableHead>
                      {t("analytics.magic.tableColumns.significance")}
                    </TableHead>
                    <TableHead>
                      {t("analytics.magic.tableColumns.detectable")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {magicTopSources.map((row) => (
                    <TableRow key={`${row.catalog}-${row.name}`}>
                      <TableCell>{row.name}</TableCell>
                      <TableCell>{formatCatalogLabel(row.catalog)}</TableCell>
                      <TableCell>
                        {formatFloat(row.magicSignificance, 2)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={
                            row.magicDetectable === null
                              ? "border-white/10 bg-slate-700/40 text-slate-100"
                              : row.magicDetectable
                                ? "border-emerald-400/30 bg-emerald-500/20 text-emerald-50"
                                : "border-amber-400/30 bg-amber-500/20 text-amber-50"
                          }
                        >
                          {row.magicDetectable === null
                            ? t("analytics.magic.statusUnavailable")
                            : row.magicDetectable
                              ? t("analytics.magic.statusDetectable")
                              : t("analytics.magic.statusNotDetectable")}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {magicTopSources.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-muted-foreground">
                        {t("analytics.magic.noMagicData")}
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
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

        {/* ============ NEW BACKEND ANALYTICS SECTIONS ============ */}

        {backendAnalyticsQuery.data && (
          <>
            <section className="gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t("analytics.sampleCountTitle")}</CardTitle>
                  <CardDescription>
                    {t("analytics.sampleCountDescription")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      sampleCount: {
                        label: t("analytics.tableColumns.samples"),
                        color: "#2A9D8F"
                      }
                    }}
                  >
                    <BarChart
                      data={backendAnalyticsQuery.data.catalogRows}
                      margin={{ left: 8, right: 8 }}
                    >
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="catalog"
                        tickFormatter={(value) =>
                          formatCatalogLabel(String(value))
                        }
                      />
                      <YAxis scale="log" domain={[1, 10000]} width={56} />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            valueFormatter={(value) => String(value)}
                          />
                        }
                      />
                      <Bar
                        dataKey="sampleCount"
                        fill="var(--color-sampleCount)"
                      />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </section>

            <section className="gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>
                    {t("analytics.significanceComparisonTitle")}
                  </CardTitle>
                  <CardDescription>
                    {t("analytics.significanceComparisonDescription")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      avgSignificance: {
                        label: t("analytics.tableColumns.avgSigma"),
                        color: "#2A9D8F"
                      },
                      peakSignificance: {
                        label: t("analytics.tableColumns.peakSignificance"),
                        color: "#E76F51"
                      }
                    }}
                  >
                    <BarChart
                      data={backendAnalyticsQuery.data.significanceComparison}
                      margin={{ left: 8, right: 8 }}
                    >
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="catalog"
                        tickFormatter={(value) =>
                          formatCatalogLabel(String(value))
                        }
                      />
                      <YAxis
                        tickFormatter={(value) => formatFloat(value, 0)}
                        width={56}
                      />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            valueFormatter={(value) => formatFloat(value, 2)}
                          />
                        }
                      />
                      <Legend />
                      <Bar
                        name={t("analytics.tableColumns.avgSigma")}
                        dataKey="avgSignificance"
                        fill="var(--color-avgSignificance)"
                      />
                      <Bar
                        name={t("analytics.tableColumns.peakSignificance")}
                        dataKey="peakSignificance"
                        fill="var(--color-peakSignificance)"
                      />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </section>

            <section className="gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t("analytics.detectabilityMixTitle")}</CardTitle>
                  <CardDescription>
                    {t("analytics.detectabilityMixDescription")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      high: {
                        label: t("analytics.detectabilityBands.high"),
                        color: "#81B29A"
                      },
                      medium: {
                        label: t("analytics.detectabilityBands.medium"),
                        color: "#F2CC8F"
                      },
                      low: {
                        label: t("analytics.detectabilityBands.low"),
                        color: "#E07A5F"
                      }
                    }}
                  >
                    <BarChart
                      data={backendAnalyticsQuery.data.detectabilityComparison}
                      margin={{ left: 8, right: 8 }}
                    >
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="catalog"
                        tickFormatter={(value) =>
                          formatCatalogLabel(String(value))
                        }
                      />
                      <YAxis width={56} />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            valueFormatter={(value) => String(value)}
                          />
                        }
                      />
                      <Legend />
                      <Bar
                        dataKey="high"
                        stackId="detectability"
                        fill="var(--color-high)"
                      />
                      <Bar
                        dataKey="medium"
                        stackId="detectability"
                        fill="var(--color-medium)"
                      />
                      <Bar
                        dataKey="low"
                        stackId="detectability"
                        fill="var(--color-low)"
                      />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function ObjectDetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-slate-900/40 p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
        {label}
      </p>
      <p className="text-sm font-medium text-white/90 break-all">{value}</p>
    </div>
  );
}
