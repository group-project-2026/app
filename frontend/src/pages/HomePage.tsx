import { UniverseMap } from "@/components/universe-map";

export function HomePage() {
  return (
    <main className="min-h-screen w-full flex flex-col text-white">
      <div className="w-full h-[50vh] shrink-0 relative border-b border-white/10">
        <UniverseMap />
      </div>
    </main>
  );
}
