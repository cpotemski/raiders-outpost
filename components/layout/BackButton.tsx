"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/cn";

type BackButtonProps = {
  href: string;
  label: string;
  testId?: string;
  className?: string;
  iconOnly?: boolean;
};

export function BackButton({
  href,
  label,
  testId,
  className,
  iconOnly = false,
}: BackButtonProps) {
  return (
    <Link
      href={href}
      data-testid={testId}
      aria-label={iconOnly ? label : undefined}
      className={cn(
        "inline-flex h-8 items-center gap-1 rounded-[6px] border border-frame bg-panel px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted transition hover:border-accent/70 hover:text-text",
        iconOnly && "w-8 justify-center px-0",
        className
      )}
    >
      <ChevronLeft className="h-3.5 w-3.5 text-current" aria-hidden="true" />
      {iconOnly ? <span className="sr-only">{label}</span> : label}
    </Link>
  );
}
