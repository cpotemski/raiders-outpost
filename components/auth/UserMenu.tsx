"use client";

import Link from "next/link";
import { useLocalIdentity } from "@/components/auth/useLocalIdentity";
import { cn } from "@/lib/cn";

export function UserMenu() {
  const { identity, ready } = useLocalIdentity();

  if (!ready) return null;

  return (
    <Link
      href="/operator"
      data-testid="user-menu-trigger"
      className={cn(
        "flex items-center gap-2 rounded-[8px] border border-frame px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-[0.12em] transition",
        "hover:border-accent/70"
      )}
    >
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          identity ? "bg-accent" : "bg-frame"
        )}
        aria-hidden="true"
      />
      <span
        className="max-w-[120px] truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-text sm:max-w-[160px]"
        title={identity?.name ?? "No Signal"}
      >
        {identity?.name ?? "No Signal"}
      </span>
      <span className="text-[9px] text-muted">ID</span>
    </Link>
  );
}
