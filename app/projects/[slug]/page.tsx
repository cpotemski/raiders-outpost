"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ProjectDashboard } from "@/components/projects/ProjectDashboard";
import { useProjectContext } from "@/components/projects/ProjectContext";
import { cn } from "@/lib/cn";
import { useLabels } from "@/components/locale/useLabels";

export default function ProjectDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { projects, loading } = useProjectContext();
  const labels = useLabels();
  const storageScope = slug ?? "global";
  const queryStorageKey = `project-filter-${storageScope}-query`;
  const neededOnlyStorageKey = `project-filter-${storageScope}-needed`;

  const getStoredQuery = () => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem(queryStorageKey) ?? "";
  };

  const getStoredNeededOnly = () => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(neededOnlyStorageKey) === "true";
  };

  const [query, setQuery] = useState(getStoredQuery);
  const [neededOnly, setNeededOnly] = useState(getStoredNeededOnly);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setQuery(window.localStorage.getItem(queryStorageKey) ?? "");
    setNeededOnly(
      window.localStorage.getItem(neededOnlyStorageKey) === "true"
    );
  }, [queryStorageKey, neededOnlyStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(queryStorageKey, query);
  }, [query, queryStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      neededOnlyStorageKey,
      neededOnly ? "true" : "false"
    );
  }, [neededOnly, neededOnlyStorageKey]);

  const project = useMemo(() => {
    return projects.find((entry) => entry.slug === slug) ?? null;
  }, [projects, slug]);

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-40" data-testid="project-control-bar">
        <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen">
          <div className="arc-panel arc-panel-bottomless arc-corners px-4 py-2 sm:px-6 [--arc-corner-offset:6px]">
            <div className="mx-auto flex max-w-[1320px] flex-wrap items-center gap-3 px-4 sm:px-6 lg:px-8">
              <Link
                href="/"
                className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted transition hover:text-text"
              >
                {labels.backToProjectSelection}
              </Link>
              <label className="relative">
                <span className="sr-only">{labels.quicksearch}</span>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={labels.searchPlaceholder}
                  className="h-8 w-36 border-b border-frame2 bg-transparent px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-text placeholder:text-muted/70 focus:border-accent/60 focus:outline-none"
                />
              </label>
              <button
                type="button"
                aria-pressed={neededOnly}
                aria-label={labels.filterNeededOnly}
                onClick={() => setNeededOnly((prev) => !prev)}
                className={cn(
                  "h-8 border px-2 text-[10px] font-semibold uppercase tracking-[0.16em] transition",
                  neededOnly
                    ? "border-accent/70 text-text"
                    : "border-frame2 text-muted hover:border-accent/60"
                )}
              >
                {labels.neededOnly}
              </button>
            </div>
          </div>
        </div>
      </div>
      {loading && !project ? (
        <div className="border-t border-frame2 px-4 py-5 text-sm uppercase tracking-[0.08em] text-muted">
          {labels.scanningProjectCache}
        </div>
      ) : project ? (
        <ProjectDashboard
          project={project}
          query={query}
          neededOnly={neededOnly}
        />
      ) : (
        <div className="border border-frame2/70 bg-panel2/40 px-4 py-4 text-[11px] uppercase tracking-[0.12em] text-muted">
          {labels.noSignalProjectData}
        </div>
      )}
    </div>
  );
}
