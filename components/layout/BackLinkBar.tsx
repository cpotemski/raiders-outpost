"use client";

import { usePathname } from "next/navigation";
import { useLabels } from "@/components/locale/useLabels";
import { BackButton } from "@/components/layout/BackButton";

const getBackHref = (pathname: string) => {
  if (pathname.startsWith("/projects/")) return "/projects";
  if (pathname.startsWith("/blueprints")) return "/";
  if (pathname.startsWith("/hideout")) return "/";
  if (pathname.startsWith("/projects")) return "/";
  return "/";
};

export function BackLinkBar() {
  const pathname = usePathname() ?? "/";
  const labels = useLabels();

  if (pathname === "/" || pathname.startsWith("/projects/")) return null;

  const backHref = getBackHref(pathname);
  const hideOnDesktop =
    pathname.startsWith("/blueprints") ||
    pathname.startsWith("/hideout") ||
    pathname.startsWith("/projects") ||
    pathname.startsWith("/community") ||
    pathname.startsWith("/operator");

  return (
    <div
      className={`mx-auto w-full max-w-[1320px] px-2 pt-2 lg:px-4 lg:pt-4 ${
        hideOnDesktop ? "md:hidden" : ""
      }`}
    >
      <BackButton href={backHref} label={labels.back} testId="nav-back" />
    </div>
  );
}
