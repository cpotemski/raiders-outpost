"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/cn";

type BackButtonProps = {
  href: string;
  label: string;
  testId?: string;
  className?: string;
};

export function BackButton({ href, label, testId, className }: BackButtonProps) {
  return (
    <Link
      href={href}
      data-testid={testId}
      className={cn(
        "inline-flex h-8 items-center gap-1 rounded-[6px] border border-frame bg-panel px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted transition hover:border-accent/70 hover:text-text",
        className
      )}
    >
      <ChevronLeft className="h-3.5 w-3.5 text-current" aria-hidden="true" />
      {label}
    </Link>
  );
}
