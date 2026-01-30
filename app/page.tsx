"use client";

import { useState } from "react";
import { ProjectDashboard } from "@/components/projects/ProjectDashboard";
import { useProjectContext } from "@/components/projects/ProjectContext";
import { cn } from "@/lib/cn";

export default function StartPage() {
  const { projects, selectedSlug, setSelectedSlug } = useProjectContext();
  const [query, setQuery] = useState("");
  const [neededOnly, setNeededOnly] = useState(false);

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-40" data-testid="project-control-bar">
        <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen">
          <div className="arc-panel arc-panel-bottomless arc-corners px-4 py-2 sm:px-6 [--arc-corner-offset:6px]">
            <div className="mx-auto flex max-w-[1320px] flex-wrap items-center gap-3 px-4 sm:px-6 lg:px-8">
              <label className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                Project
                <span className="relative">
                  <select
                    value={selectedSlug ?? ""}
                    onChange={(event) => setSelectedSlug(event.target.value)}
                    aria-label="Project selection"
                    data-testid="project-select"
                    className="h-8 min-w-[180px] appearance-none border border-frame bg-panel px-2 pr-7 text-[11px] font-semibold uppercase tracking-[0.12em] text-text"
                  >
                    {projects.map((project) => (
                      <option key={project.slug} value={project.slug}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted">
                    <svg
                      aria-hidden="true"
                      className="h-3 w-3"
                      viewBox="0 0 16 16"
                      fill="none"
                    >
                      <path
                        d="M4 6l4 4 4-4"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="square"
                      />
                    </svg>
                  </span>
                </span>
              </label>
              <label className="relative">
                <span className="sr-only">Quicksearch</span>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="SEARCH..."
                  className="h-8 w-36 border-b border-frame2 bg-transparent px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-text placeholder:text-muted/70 focus:border-accent/60 focus:outline-none"
                />
              </label>
              <button
                type="button"
                aria-pressed={neededOnly}
                aria-label="Filter needed only"
                onClick={() => setNeededOnly((prev) => !prev)}
                className={cn(
                  "h-8 border px-2 text-[10px] font-semibold uppercase tracking-[0.16em] transition",
                  neededOnly
                    ? "border-accent/70 text-text"
                    : "border-frame2 text-muted hover:border-accent/60"
                )}
              >
                Needed Only
              </button>
            </div>
          </div>
        </div>
      </div>
      <ProjectDashboard
        query={query}
        neededOnly={neededOnly}
      />
    </div>
  );
}
