"use client";

import { useMemo, useState } from "react";
import { useProjectContext } from "@/components/projects/ProjectContext";
import { ProjectStagePanel } from "@/components/projects/ProjectStagePanel";
import { cn } from "@/lib/cn";

export function ProjectDashboard() {
  const {
    loading,
    projects,
    selectedProject,
    selectedSlug,
    setSelectedSlug,
    memberCount,
    communityCountsByItemId,
    updateItemQuantity,
  } = useProjectContext();
  const [expandedCompleted, setExpandedCompleted] = useState<Set<string>>(
    () => new Set()
  );
  const [query, setQuery] = useState("");
  const [neededOnly, setNeededOnly] = useState(false);

  const filteredStages = useMemo(() => {
    if (!selectedProject) return [];
    const q = query.trim().toLowerCase();
    return selectedProject.stages.map((stage) => ({
      ...stage,
      items: stage.items.filter((item) => {
        if (neededOnly && item.quantityOwned >= item.quantityRequired) {
          return false;
        }
        if (!q) return true;
        return (
          item.displayName.toLowerCase().includes(q) ||
          item.itemId.toLowerCase().includes(q)
        );
      }),
    }));
  }, [neededOnly, query, selectedProject]);

  if (loading && !selectedProject) {
    return (
      <div className="border-t border-frame2 px-4 py-5 text-sm uppercase tracking-[0.08em] text-muted">
        Scanning project cache...
      </div>
    );
  }

  return selectedProject ? (
    <div className="space-y-4">
      <div className="arc-panel-header flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="hud-label">Project</p>
          <select
            value={selectedSlug ?? ""}
            onChange={(event) => setSelectedSlug(event.target.value)}
            aria-label="Project selection"
            data-testid="project-select"
            className="mt-1 h-9 w-full min-w-[220px] border border-frame bg-panel px-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-text sm:w-auto"
          >
            {projects.map((project) => (
              <option key={project.slug} value={project.slug}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto sm:justify-end">
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
      {filteredStages
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((stage) => {
          const fullStage = selectedProject.stages.find(
            (entry) => entry.stageKey === stage.stageKey
          );
          const isCompleted =
            !fullStage?.items.length ||
            fullStage.items.every(
              (item) =>
                item.quantityRequired > 0 &&
                item.quantityOwned >= item.quantityRequired
            );
          const isExpanded =
            !isCompleted || expandedCompleted.has(stage.stageKey);
          return (
            <ProjectStagePanel
              key={stage.stageKey}
              stage={stage}
              memberCount={memberCount}
              communityCountsByItemId={communityCountsByItemId}
              onAdjust={updateItemQuantity}
              isExpanded={isExpanded}
              onToggleExpanded={() => {
                setExpandedCompleted((prev) => {
                  const next = new Set(prev);
                  if (next.has(stage.stageKey)) {
                    next.delete(stage.stageKey);
                  } else {
                    next.add(stage.stageKey);
                  }
                  return next;
                });
              }}
            />
          );
        })}
    </div>
  ) : (
    <div className="border border-frame2/70 bg-panel2/40 px-4 py-4 text-[11px] uppercase tracking-[0.12em] text-muted">
      No signal. Project data not found.
    </div>
  );
}
