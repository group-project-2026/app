import { useEffect, useState, type AnimationEvent } from "react";
import { X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { HamburgerMenuIcon } from "@radix-ui/react-icons";

type MobileMenuState = "closed" | "opening" | "open" | "closing";

export function NavigationHeader() {
  const location = useLocation();
  const [mobileMenuState, setMobileMenuState] =
    useState<MobileMenuState>("closed");

  const links = [
    { to: "/", label: "Home" },
    { to: "/universe-map", label: "Universe Map" },
    { to: "/source-analytics", label: "Analityka" },
    { to: "/sources", label: "Sources" }
  ];

  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  const activeLinkLabel =
    links.find((link) => isActive(link.to))?.label ?? "Navigation";

  const isMobileMenuExpanded =
    mobileMenuState === "opening" || mobileMenuState === "open";
  const isMobileMenuVisible = mobileMenuState !== "closed";

  const openMobileMenu = () => {
    setMobileMenuState((prev) =>
      prev === "open" || prev === "opening" ? prev : "opening"
    );
  };

  const closeMobileMenu = () => {
    setMobileMenuState((prev) =>
      prev === "closed" || prev === "closing" ? prev : "closing"
    );
  };

  const toggleMobileMenu = () => {
    if (isMobileMenuExpanded) {
      closeMobileMenu();
      return;
    }

    openMobileMenu();
  };

  const handleMobileMenuAnimationEnd = (
    event: AnimationEvent<HTMLDivElement>
  ) => {
    if (event.target !== event.currentTarget) {
      return;
    }

    setMobileMenuState((prev) => {
      if (prev === "opening") {
        return "open";
      }

      if (prev === "closing") {
        return "closed";
      }

      return prev;
    });
  };

  const handleLinkClick = () => {
    closeMobileMenu();
  };

  useEffect(() => {
    if (isMobileMenuExpanded) {
      document.body.style.overflow = "hidden";
      return;
    }

    document.body.style.overflow = "";
  }, [isMobileMenuExpanded]);

  useEffect(
    () => () => {
      document.body.style.overflow = "";
    },
    []
  );

  return (
    <header className="relative z-40 w-full border-b border-white/10 bg-slate-950/80">
      <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <span className="md:hidden text-sm font-medium text-slate-200">
            {activeLinkLabel}
          </span>

          <nav className="hidden md:flex md:gap-3 md:text-sm">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={cn(
                  "rounded-md px-3 py-1.5 text-slate-300 transition-colors",
                  isActive(link.to)
                    ? "border border-sky-300/70 bg-sky-300/15 text-white"
                    : "hover:bg-slate-800/80 hover:text-white"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <button
            type="button"
            className={cn(
              "md:hidden inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-200 transition-colors hover:bg-slate-800/80 hover:text-white",
              isMobileMenuExpanded &&
                "border border-sky-300/70 bg-sky-300/15 text-white"
            )}
            aria-label={isMobileMenuExpanded ? "Close menu" : "Open menu"}
            aria-expanded={isMobileMenuExpanded}
            aria-controls="mobile-nav-menu"
            onClick={toggleMobileMenu}
          >
            {isMobileMenuExpanded ? (
              <X className="h-4 w-4" />
            ) : (
              <HamburgerMenuIcon className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {isMobileMenuVisible && (
        <div
          id="mobile-nav-menu"
          className={cn(
            "mobile-cosmic-overlay md:hidden",
            mobileMenuState === "opening" || mobileMenuState === "open"
              ? "mobile-cosmic-overlay--open"
              : "mobile-cosmic-overlay--closing"
          )}
          onAnimationEnd={handleMobileMenuAnimationEnd}
        >
          <div className="mobile-cosmic-overlay__content">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium tracking-wide text-slate-200">
                Space Navigation
              </span>
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-sky-300/70 bg-sky-300/15 text-white transition-colors hover:bg-sky-300/20"
                onClick={closeMobileMenu}
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <nav className="mt-10 grid gap-3 text-base">
              {links.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={handleLinkClick}
                  className={cn(
                    "rounded-md px-4 py-3 text-slate-200 transition-colors",
                    isActive(link.to)
                      ? "border border-sky-300/70 bg-sky-300/15 text-white"
                      : "hover:bg-slate-800/80 hover:text-white"
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
