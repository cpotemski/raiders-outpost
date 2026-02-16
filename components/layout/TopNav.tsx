"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Layers, Radar, Users } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLocalIdentity } from "@/components/auth/useLocalIdentity";
import { useLocale } from "@/components/locale/LocaleProvider";
import { useLabels } from "@/components/locale/useLabels";

export function TopNav() {
  const pathname = usePathname();
  const { locale, setLocale } = useLocale();
  const labels = useLabels();
  const { identity, ready } = useLocalIdentity();
  const isHome = pathname === "/";
  const showNav = ready && Boolean(identity);
  const desktopNavItems = [
    {
      href: "/projects",
      label: labels.navProjects,
      isActive: pathname === "/projects" || pathname.startsWith("/projects/"),
      testId: "projects",
      Icon: Layers,
    },
    {
      href: "/community",
      label: labels.navCommunity,
      isActive: pathname === "/community" || pathname.startsWith("/community/"),
      testId: "community",
      Icon: Users,
    },
    {
      href: "/operator",
      label: labels.navOperator,
      isActive: pathname === "/operator" || pathname.startsWith("/operator/"),
      testId: "user",
      Icon: Radar,
    },
  ] as const;

  return (
    <div className="arc-panel arc-panel-topless arc-corners relative w-full px-3 py-3 [--arc-corner-offset:6px]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-text sm:text-sm">
            ARC // Raiders Outpost
          </span>
          {showNav ? (
            <>
              <Link
                href="/"
                data-nav-home="true"
                className={cn(
                  "inline-flex items-center gap-2 rounded-[6px] border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] transition md:hidden",
                  isHome
                    ? "border-accent bg-panel text-text"
                    : "border-frame bg-panel text-muted hover:border-accent/70 hover:text-text"
                )}
              >
                <Home className="h-3.5 w-3.5 text-current" aria-hidden="true" />
                {labels.navHome}
              </Link>
              <nav
                className="hidden items-center gap-2 md:flex"
                aria-label={labels.mainNavigation}
              >
                {desktopNavItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    data-testid={`nav-${item.testId}`}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-[6px] border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] transition",
                      item.isActive
                        ? "border-accent bg-panel text-text"
                        : "border-frame bg-panel text-muted hover:border-accent/70 hover:text-text"
                    )}
                  >
                    <item.Icon className="h-3.5 w-3.5 text-current" aria-hidden="true" />
                    {item.label}
                  </Link>
                ))}
              </nav>
            </>
          ) : null}
        </div>
        <div
          className="flex rounded-[6px] border border-frame bg-panel overflow-hidden"
          data-testid="language-switch"
        >
          {(["de", "en"] as const).map((option, index) => {
            const active = locale === option;
            return (
              <button
                key={option}
                type="button"
                aria-pressed={active}
                data-testid={`language-option-${option}`}
                onClick={() => setLocale(option)}
                className={cn(
                  "h-8 px-2 text-[10px] font-semibold uppercase tracking-[0.16em] transition",
                  index > 0 && "border-l border-frame",
                  active ? "bg-panel text-text" : "text-muted hover:text-text"
                )}
              >
                {option}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
