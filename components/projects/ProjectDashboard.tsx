"use client";

import { useMemo, useState } from "react";
import { useProjectContext } from "@/components/projects/ProjectContext";
import { ProjectStagePanel } from "@/components/projects/ProjectStagePanel";
import type { ProjectProgress } from "@/types/projects";
import { useLabels } from "@/components/locale/useLabels";

type ProjectDashboardProps = {
  query: string;
  neededOnly: boolean;
  project?: ProjectProgress | null;
};

export function ProjectDashboard({
  query,
  neededOnly,
  project,
}: ProjectDashboardProps) {
  const labels = useLabels();
  const {
    loading,
    selectedProject,
    memberCount,
    expeditionMemberCountsBySlug,
    communityCountsByItemId,
    updateItemQuantity,
  } = useProjectContext();
  const activeProject = project ?? selectedProject;
  const [expandedCompleted, setExpandedCompleted] = useState<Set<string>>(
    () => new Set()
  );

  const filteredStages = useMemo(() => {
    if (!activeProject) return [];
    const q = query.trim().toLowerCase();
    return activeProject.stages.map((stage) => ({
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
  }, [activeProject, neededOnly, query]);

  if (loading && !activeProject) {
    return (
      <div className="border-t border-frame2 px-4 py-5 text-sm uppercase tracking-[0.08em] text-muted">
        {labels.scanningProjectCache}
      </div>
    );
  }

  return activeProject ? (
    <div className="flex flex-col gap-4 pb-24">
      <div className="arc-panel-header flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="hud-label">{labels.projectLabel}</p>
          <h2 className="text-lg font-semibold uppercase tracking-[0.08em]">
            {activeProject.name}
          </h2>
        </div>
      </div>
      {filteredStages
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((stage) => {
          const fullStage = activeProject.stages.find(
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
              expeditionMemberCountsBySlug={expeditionMemberCountsBySlug}
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
              stripBlueprintLabel={activeProject.kind === "blueprints"}
              progressCompletedCount={progressCompletedCount}
              progressTotalCount={progressTotalCount}
            />
          );
        })}
    </div>
  ) : (
    <div className="border border-frame2/70 bg-panel2/40 px-4 py-4 text-[11px] uppercase tracking-[0.12em] text-muted">
      {labels.noSignalProjectData}
    </div>
  );
}
