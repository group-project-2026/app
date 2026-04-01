import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function SourceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();

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
            <p className="text-muted-foreground">
              {t("sources.detailPlaceholder")}
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
