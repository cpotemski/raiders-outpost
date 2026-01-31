"use client";

import { useMemo, useState } from "react";
import { useProjectContext } from "@/components/projects/ProjectContext";
import { ProjectStagePanel } from "@/components/projects/ProjectStagePanel";

type ProjectDashboardProps = {
  query: string;
  neededOnly: boolean;
};

export function ProjectDashboard({
  query,
  neededOnly,
}: ProjectDashboardProps) {
  const {
    loading,
    selectedProject,
    memberCount,
    communityCountsByItemId,
    updateItemQuantity,
  } = useProjectContext();
  const [expandedCompleted, setExpandedCompleted] = useState<Set<string>>(
    () => new Set()
  );

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
    <div className="flex flex-col gap-4 pb-24">
      <div className="arc-panel-header flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="hud-label">Project</p>
          <h2 className="text-lg font-semibold uppercase tracking-[0.08em]">
            {selectedProject.name}
          </h2>
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
          const progressItems = fullStage?.items ?? stage.items;
          const progressCompletedCount = progressItems.filter(
            (item) =>
              item.quantityRequired > 0 &&
              item.quantityOwned >= item.quantityRequired
          ).length;
          const progressTotalCount = progressItems.length;
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
              stripBlueprintLabel={selectedProject.kind === "blueprints"}
              progressCompletedCount={progressCompletedCount}
              progressTotalCount={progressTotalCount}
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
