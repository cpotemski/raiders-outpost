"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ListChecks, Search } from "lucide-react";
import { useProjectContext } from "@/components/projects/ProjectContext";
import { useLabels } from "@/components/locale/useLabels";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import { filterProjectsByCategory } from "@/lib/project-categories";
import { ProjectDashboard } from "@/components/projects/ProjectDashboard";
import { Panel } from "@/components/ui/Panel";
import { IconButton } from "@/components/ui/IconButton";
import { EmptyState } from "@/components/ui/EmptyState";

export default function BlueprintsPage() {
  const { projects, loading } = useProjectContext();
  const labels = useLabels();
  const queryStorageKey = "project-filter-blueprints-query";
  const neededOnlyStorageKey = "project-filter-blueprints-needed";
  const [query, setQuery, queryHydrated] = useLocalStorageState<string>(
    queryStorageKey,
    "",
    {
      deserialize: (raw) => {
        try {
          const parsed = JSON.parse(raw);
          return typeof parsed === "string" ? parsed : raw;
        } catch {
          return raw;
        }
      },
      serialize: (value) => JSON.stringify(value),
    }
  );
  const [neededOnly, setNeededOnly, neededOnlyHydrated] = useLocalStorageState<boolean>(
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
  const filtersHydrated = queryHydrated && neededOnlyHydrated;
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (searchOpen) {
      searchInputRef.current?.focus();
    }
  }, [searchOpen]);

  const blueprintProject = useMemo(
    () => filterProjectsByCategory(projects, "blueprints")[0] ?? null,
    [projects]
  );

  return (
    <Panel className="overflow-hidden">
      <div className="arc-panel-header flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="hud-label">{labels.navBlueprints}</p>
          <h2 className="text-lg font-semibold uppercase tracking-[0.08em]">
            {blueprintProject ? blueprintProject.name : labels.navBlueprints}
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <IconButton
            type="button"
            aria-pressed={neededOnly}
            aria-label={labels.filterNeededOnly}
            onClick={() => setNeededOnly((prev) => !prev)}
            active={neededOnly}
          >
            <ListChecks className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">{labels.neededOnly}</span>
          </IconButton>
          <IconButton
            type="button"
            aria-pressed={searchOpen}
            aria-label={labels.quicksearch}
            onClick={() => setSearchOpen((prev) => !prev)}
            active={searchOpen}
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">{labels.quicksearch}</span>
          </IconButton>
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
        {!filtersHydrated ? (
          <div className="text-sm uppercase tracking-[0.08em] text-muted">
            {labels.scanningProjectCache}
          </div>
        ) : loading && !blueprintProject ? (
          <div className="text-sm uppercase tracking-[0.08em] text-muted">
            {labels.scanningProjectCache}
          </div>
        ) : blueprintProject ? (
          <ProjectDashboard
            project={blueprintProject}
            query={query}
            neededOnly={neededOnly}
          />
        ) : (
          <EmptyState className="px-2">
            {labels.noProjectData}
          </EmptyState>
        )}
      </div>
    </Panel>
  );
}
