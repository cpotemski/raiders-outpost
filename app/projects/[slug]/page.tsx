"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ProjectDashboard } from "@/components/projects/ProjectDashboard";
import { useProjectContext } from "@/components/projects/ProjectContext";
import { ListChecks, Search } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLabels } from "@/components/locale/useLabels";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import { BackButton } from "@/components/layout/BackButton";
import { Panel } from "@/components/ui/Panel";

export default function ProjectDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { projects, loading } = useProjectContext();
  const labels = useLabels();
  const storageScope = slug ?? "global";
  const queryStorageKey = `project-filter-${storageScope}-query`;
  const neededOnlyStorageKey = `project-filter-${storageScope}-needed`;

  const [query, setQuery] = useLocalStorageState(queryStorageKey, "", {
    deserialize: (raw) => {
      try {
        const parsed = JSON.parse(raw);
        return typeof parsed === "string" ? parsed : raw;
      } catch {
        return raw;
      }
    },
    serialize: (value) => JSON.stringify(value),
  });
  const [neededOnly, setNeededOnly] = useLocalStorageState(
    neededOnlyStorageKey,
    false,
    {
      deserialize: (raw) => {
        if (raw === "true" || raw === "false") {
          return raw === "true";
        }
        try {
          return JSON.parse(raw);
        } catch {
          return false;
        }
      },
      serialize: (value) => (value ? "true" : "false"),
    }
  );

  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (searchOpen) {
      searchInputRef.current?.focus();
    }
  }, [searchOpen]);

  const project = useMemo(() => {
    return projects.find((entry) => entry.slug === slug) ?? null;
  }, [projects, slug]);

  return (
    <Panel className="overflow-hidden">
      <div className="arc-panel-header flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="hud-label">{labels.navProjects}</p>
          <h2 className="text-lg font-semibold uppercase tracking-[0.08em]">
            {project ? project.name : labels.projectSelection}
          </h2>
        </div>
        <div
          className="flex flex-wrap items-center gap-2"
          data-testid="project-control-bar"
        >
          <BackButton href="/projects" label={labels.back} testId="nav-back" />
          <button
            type="button"
            aria-pressed={neededOnly}
            aria-label={labels.filterNeededOnly}
            onClick={() => setNeededOnly((prev) => !prev)}
            className={cn(
              "inline-flex h-8 w-8 items-center justify-center rounded-[6px] border text-text transition",
              neededOnly
                ? "border-accent/70 text-text"
                : "border-frame2/70 bg-panel2/40 text-muted hover:border-accent/70 hover:text-text"
            )}
          >
            <ListChecks className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">{labels.neededOnly}</span>
          </button>
          <button
            type="button"
            aria-pressed={searchOpen}
            aria-label={labels.quicksearch}
            onClick={() => setSearchOpen((prev) => !prev)}
            className={cn(
              "inline-flex h-8 w-8 items-center justify-center rounded-[6px] border text-text transition",
              searchOpen
                ? "border-accent/70 text-text"
                : "border-frame2/70 bg-panel2/40 text-muted hover:border-accent/70 hover:text-text"
            )}
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">{labels.quicksearch}</span>
          </button>
        </div>
      </div>
      <div className="border-t border-frame2 px-2 py-5">
        {searchOpen ? (
          <div className="mb-4 flex items-center gap-2">
            <label className="relative flex-1">
              <span className="sr-only">{labels.quicksearch}</span>
              <input
                ref={searchInputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={labels.searchPlaceholder}
                className="h-8 w-full border-b border-frame2 bg-transparent px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-text placeholder:text-muted/70 focus:border-accent/60 focus:outline-none"
              />
            </label>
          </div>
        ) : null}
        {loading && !project ? (
          <div className="text-sm uppercase tracking-[0.08em] text-muted">
            {labels.scanningProjectCache}
          </div>
        ) : project ? (
          <ProjectDashboard
            project={project}
            query={query}
            neededOnly={neededOnly}
          />
        ) : (
          <div className="border border-frame2/70 bg-panel2/40 px-2 py-4 text-[11px] uppercase tracking-[0.12em] text-muted">
            {labels.noSignalProjectData}
          </div>
        )}
      </div>
    </Panel>
  );
}
