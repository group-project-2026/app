import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSourceDetail } from "./useSourceDetail";
import { useSourceCatalogEntries } from "./useSourceCatalogEntries";

export function SourceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const { data: source, isLoading, error } = useSourceDetail(id);
  const { data: catalogEntries } = useSourceCatalogEntries(id);

  return (
    <main className="min-h-screen w-full">
      <div className="container mx-auto py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">{t("sources.title")}</h1>
          <Link to="/sources">
            <Button variant="outline">{t("sources.backToSources")}</Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("sources.sourceId", { id })}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading && (
              <p className="text-muted-foreground">{t("dataTable.loading")}</p>
            )}
            {error && (
              <p className="text-destructive">
                {t("sources.errorLoading", { message: error.message })}
              </p>
            )}
            {source && (
              <div className="space-y-2">
                <p>
                  <span className="font-semibold">{t("sources.columns.sourceName")}:</span>{" "}
                  {source.unified_name}
                </p>
                <p>
                  <span className="font-semibold">{t("sources.columns.primaryCatalog")}:</span>{" "}
                  {source.primary_catalog}
                </p>
                <p>
                  <span className="font-semibold">{t("sources.columns.ra")}:</span>{" "}
                  {source.ra.toFixed(4)}
                </p>
                <p>
                  <span className="font-semibold">{t("sources.columns.dec")}:</span>{" "}
                  {source.dec.toFixed(4)}
                </p>
                <p>
                  <span className="font-semibold">{t("sources.columns.catalogCount")}:</span>{" "}
                  {catalogEntries?.length ?? source.catalog_entries.length}
                </p>
                {source.distance !== null && (
                  <p>
                    <span className="font-semibold">{t("sources.distanceDeg")}:</span>{" "}
                    {source.distance.toFixed(6)}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("sources.catalogEntriesTitle")}</CardTitle>
            <CardDescription>{t("sources.catalogEntriesDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("sources.catalogEntriesColumns.catalog")}</TableHead>
                  <TableHead>{t("sources.catalogEntriesColumns.originalName")}</TableHead>
                  <TableHead>{t("sources.catalogEntriesColumns.discoveryMethod")}</TableHead>
                  <TableHead>{t("sources.catalogEntriesColumns.confidence")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(catalogEntries ?? []).map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{entry.catalog_name}</TableCell>
                    <TableCell>{entry.original_name}</TableCell>
                    <TableCell>{entry.discovery_method || "-"}</TableCell>
                    <TableCell>{entry.confidence.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
                {(catalogEntries ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-muted-foreground">
                      {t("sources.noCatalogEntries")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
