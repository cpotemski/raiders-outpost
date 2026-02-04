"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { usePathname } from "next/navigation";
import { useLabels } from "@/components/locale/useLabels";

const getBackHref = (pathname: string) => {
  if (pathname.startsWith("/projects/")) return "/projects";
  if (pathname.startsWith("/projects")) return "/";
  return "/";
};

export function BackLinkBar() {
  const pathname = usePathname() ?? "/";
  const labels = useLabels();

  if (pathname === "/") return null;

  const backHref = getBackHref(pathname);

  return (
    <div className="mx-auto w-full max-w-[1320px] px-4 pt-2 sm:px-6 lg:px-8">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1 rounded-[6px] border border-frame2/70 bg-panel2/40 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted transition hover:border-accent/70 hover:text-text"
        data-testid="nav-back"
      >
        <ChevronLeft className="h-3.5 w-3.5 text-current" aria-hidden="true" />
        {labels.back}
      </Link>
    </div>
  );
}
