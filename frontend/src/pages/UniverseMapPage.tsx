import { UniverseMap } from "@/components/universe-map";
import { usePageTitle } from "@/hooks";

export function UniverseMapPage() {
  usePageTitle("pages.universeMap");
  return (
    <main className="w-full text-white">
      <div className="h-[calc(100vh-69px)] w-full">
        <UniverseMap />
      </div>
    </main>
  );
}
