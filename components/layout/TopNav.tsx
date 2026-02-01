"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { UserMenu } from "@/components/auth/UserMenu";
import { useLocale } from "@/components/locale/LocaleProvider";

const tabs = [
  { href: "/", label: "Projects" },
  { href: "/community", label: "Community" },
];

export function TopNav() {
  const pathname = usePathname();
  const { locale, setLocale } = useLocale();
  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname?.startsWith(href);
  };

  return (
    <div className="arc-panel arc-panel-topless arc-corners relative w-full px-4 py-[0.6rem] sm:px-6 [--arc-corner-offset:6px]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-text sm:text-sm">
              ARC // Raiders Outpost
            </span>
            <span className="hud-label text-[10px] sm:text-xs">
              Project Console
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "rounded-[6px] border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] transition",
                isActive(tab.href)
                  ? "border-accent bg-accent/10 text-text"
                  : "border-frame text-muted hover:border-accent/70"
              )}
            >
              {tab.label}
            </Link>
          ))}
          <div
            className="absolute right-3 top-3 z-10 flex rounded-[6px] border border-frame2 overflow-hidden sm:static sm:z-auto"
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
                    index > 0 && "border-l border-frame2",
                    active ? "bg-panel/60 text-text" : "text-muted hover:text-text"
                  )}
                >
                  {option}
                </button>
              );
            })}
          </div>
          <UserMenu />
        </div>
      </div>
    </div>
  );
}
