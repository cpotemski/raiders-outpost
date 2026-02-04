"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home } from "lucide-react";
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
  const showHome = ready && Boolean(identity);

  return (
    <div className="arc-panel arc-panel-topless arc-corners relative w-full px-4 py-[0.6rem] sm:px-6 [--arc-corner-offset:6px]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-text sm:text-sm">
            ARC // Raiders Outpost
          </span>
          {showHome ? (
            <Link
              href="/"
              data-nav-home="true"
              className={cn(
                "inline-flex items-center gap-2 rounded-[6px] border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] transition",
                isHome
                  ? "border-accent bg-panel text-text"
                  : "border-frame bg-panel text-muted hover:border-accent/70 hover:text-text"
              )}
            >
              <Home className="h-3.5 w-3.5 text-current" aria-hidden="true" />
              {labels.navHome}
            </Link>
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
