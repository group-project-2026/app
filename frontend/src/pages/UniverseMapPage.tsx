import { Link } from "react-router-dom";
import { UniverseMap } from "@/components/universe-map";

export function UniverseMapPage() {
  return (
    <main className="min-h-screen w-full bg-black text-white">
      <header className="w-full border-b border-white/10 bg-slate-950/80">
        <nav className="mx-auto flex max-w-6xl gap-3 px-6 py-4 text-sm">
          <Link
            className="rounded-md border border-white/20 px-3 py-1.5"
            to="/"
          >
            Home
          </Link>
          <Link
            className="rounded-md border border-white/20 px-3 py-1.5"
            to="/universe-map"
          >
            Universe Map
          </Link>
        </nav>
      </header>

      <div className="h-[calc(100vh-69px)] w-full">
        <UniverseMap />
      </div>
    </main>
  );
}
