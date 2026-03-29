import heroImg from "../assets/hero.jpeg";
import { Link } from "react-router-dom";
import { UniverseMap } from "@/components/universe-map";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent
} from "../components/ui/card";

export function HomePage() {
  return (
    <main className="min-h-screen w-full bg-black flex flex-col text-white">
      <header className="w-full border-b border-white/10 bg-slate-950/80">
        <nav className="mx-auto flex max-w-6xl gap-3 px-6 py-4 text-sm">
          <Link className="rounded-md border border-white/20 px-3 py-1.5" to="/">
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

      <div className="w-full h-[50vh] shrink-0 relative border-b border-white/10">
        <UniverseMap />
      </div>

      <div className="flex-1 w-full bg-slate-950 flex flex-col items-center justify-center p-8">
        <div className="text-white/30 text-sm italic font-medium">
          <div className="flex justify-center">
            <img src={heroImg} width="600" height="200" alt="Dawid Jasper" />
          </div>
          <div className="flex justify-center mt-10">
            <Card className="max-w-87.5">
              <CardHeader>
                <CardTitle>Tailwind + shadcn test</CardTitle>
                <CardDescription>
                  Lorem ipsum dolor, sit amet consectetur adipisicing elit.
                  Ipsam, eum.
                </CardDescription>
              </CardHeader>
              <CardContent>
                Lorem ipsum dolor sit amet consectetur adipisicing elit. At?
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
