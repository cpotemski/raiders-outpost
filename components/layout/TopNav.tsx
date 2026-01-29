"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "../../lib/cn";
import { Chip } from "../ui/Chip";

const tabs = [
  { href: "/", label: "Start" },
];

export function TopNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname?.startsWith(href);
  };

  return (
    <div className="arc-panel arc-corners px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold uppercase tracking-[0.2em] text-text">
            ARC // Raiders Outpost
          </span>
          <span className="hud-label">Community Exchange</span>
        </div>
        <div className="flex items-center gap-2">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "rounded-[12px] border px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] transition",
                isActive(tab.href)
                  ? "border-accent bg-accent/10 text-text"
                  : "border-frame text-muted hover:border-accent/70"
              )}
            >
              {tab.label}
            </Link>
          ))}
        </div>
        <Chip variant="good">Synced</Chip>
      </div>
    </div>
  );
}
