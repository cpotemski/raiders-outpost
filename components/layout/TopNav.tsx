"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { UserMenu } from "@/components/auth/UserMenu";

const tabs = [
  { href: "/", label: "Start" },
  { href: "/community", label: "Community" },
];

export function TopNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname?.startsWith(href);
  };

  return (
    <div className="arc-panel arc-corners px-4 py-3">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
            <span className="text-sm font-semibold uppercase tracking-[0.2em] text-text">
              ARC // Raiders Outpost
            </span>
            <span className="hud-label">Community Exchange</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "rounded-[6px] border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.1em] transition",
                isActive(tab.href)
                  ? "border-accent bg-accent/10 text-text"
                  : "border-frame text-muted hover:border-accent/70"
              )}
            >
              {tab.label}
            </Link>
          ))}
          <UserMenu />
        </div>
      </div>
    </div>
  );
}
