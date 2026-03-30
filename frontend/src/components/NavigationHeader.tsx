import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

export function NavigationHeader() {
  const location = useLocation();

  const links = [
    { to: "/", label: "Home" },
    { to: "/universe-map", label: "Universe Map" },
    { to: "/sources", label: "Sources" },
  ];

  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <header className="w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="mx-auto flex max-w-7xl gap-3 px-6 py-4 text-sm">
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className={cn(
              "rounded-md border px-3 py-1.5 transition-colors",
              isActive(link.to)
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border hover:bg-accent"
            )}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
