import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function SourceDetailPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <main className="min-h-screen w-full">
      <div className="container mx-auto py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Source Details</h1>
          <Link to="/sources">
            <Button variant="outline">← Back to Sources</Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Source ID: {id}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Detail page implementation coming soon...
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
