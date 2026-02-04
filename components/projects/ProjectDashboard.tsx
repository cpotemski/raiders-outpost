"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  const [recentlyCompleted, setRecentlyCompleted] = useState<Set<string>>(
    () => new Set()
  );
  const completionTimers = useRef<Map<string, number>>(new Map());
  const completionStatusRef = useRef<Record<string, boolean>>({});
  const initialCompletionCaptured = useRef(false);
  const activeProjectIdRef = useRef(activeProject?.slug ?? null);
  const COMPLETION_DISPLAY_MS = 5000;

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

  const stageCompletionStatus = useMemo(() => {
    if (!activeProject) return {};
    return activeProject.stages.reduce((acc, stage) => {
      const isCompletedStage =
        stage.items.length === 0 ||
        stage.items.every((item) => {
          if (item.quantityRequired <= 0) {
            return true;
          }
          return item.quantityOwned >= item.quantityRequired;
        });
      acc[stage.stageKey] = isCompletedStage;
      return acc;
    }, {} as Record<string, boolean>);
  }, [activeProject]);

  const justCompletedStages = useMemo(() => {
    if (!initialCompletionCaptured.current) {
      return new Set<string>();
    }
    const prevStatus = completionStatusRef.current;
    const newlyCompleted = new Set<string>();
    Object.entries(stageCompletionStatus).forEach(([stageKey, isCompleted]) => {
      const wasCompleted = prevStatus[stageKey];
      if (!wasCompleted && isCompleted) {
        newlyCompleted.add(stageKey);
      }
    });
    return newlyCompleted;
  }, [stageCompletionStatus]);

  const activeProjectId = activeProject?.slug ?? null;

  useEffect(() => {
    if (activeProjectIdRef.current !== activeProjectId) {
      completionStatusRef.current = {};
      initialCompletionCaptured.current = false;
      activeProjectIdRef.current = activeProjectId;
      setRecentlyCompleted(new Set());
      completionTimers.current.forEach((timer) => window.clearTimeout(timer));
      completionTimers.current.clear();
    }
  }, [activeProjectId]);

  useEffect(() => {
    if (!activeProject) {
      completionStatusRef.current = {};
      initialCompletionCaptured.current = false;
      return;
    }

    if (!initialCompletionCaptured.current) {
      completionStatusRef.current = stageCompletionStatus;
      initialCompletionCaptured.current = true;
      return;
    }

    if (!justCompletedStages.size) {
      completionStatusRef.current = stageCompletionStatus;
      return;
    }

    justCompletedStages.forEach((stageKey) => {
      const existingTimer = completionTimers.current.get(stageKey);
      if (existingTimer) {
        window.clearTimeout(existingTimer);
      }
      setRecentlyCompleted((prev) => {
        if (prev.has(stageKey)) return prev;
        const next = new Set(prev);
        next.add(stageKey);
          const timer = window.setTimeout(() => {
            setRecentlyCompleted((current) => {
              const nextSet = new Set(current);
              nextSet.delete(stageKey);
              return nextSet;
            });
            completionTimers.current.delete(stageKey);
            setExpandedCompleted((prev) => {
              if (!prev.has(stageKey)) {
                return prev;
              }
              const nextExpanded = new Set(prev);
              nextExpanded.delete(stageKey);
              return nextExpanded;
            });
          }, COMPLETION_DISPLAY_MS);
        completionTimers.current.set(stageKey, timer);
        return next;
      });
    });

    completionStatusRef.current = stageCompletionStatus;
  }, [activeProject, stageCompletionStatus, justCompletedStages]);

  useEffect(
    () => () => {
      completionTimers.current.forEach((timer) => window.clearTimeout(timer));
    },
    []
  );

  if (loading && !activeProject) {
    return (
      <div className="text-sm uppercase tracking-[0.08em] text-muted">
        {labels.scanningProjectCache}
      </div>
    );
  }

  return activeProject ? (
    <div className="flex flex-col gap-4 pb-24">
      <div className="divide-y divide-frame2/70 border border-frame2/70 bg-panel/70">
        {filteredStages
          .slice()
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((stage, index) => {
            const fullStage = activeProject.stages.find(
              (entry) => entry.stageKey === stage.stageKey
            );
            const progressItems = fullStage?.items ?? stage.items;
            const isCompleted = progressItems.length
              ? progressItems.every(
                  (item) =>
                    item.quantityRequired > 0 &&
                    item.quantityOwned >= item.quantityRequired
                )
              : true;
            const justCompletedNow = justCompletedStages.has(stage.stageKey);
            const shouldShowCompletionEffect =
              justCompletedNow || recentlyCompleted.has(stage.stageKey);
            const isExpanded =
              !isCompleted ||
              expandedCompleted.has(stage.stageKey) ||
              shouldShowCompletionEffect;
            return (
              <ProjectStagePanel
                key={stage.stageKey}
                stage={stage}
                memberCount={memberCount}
                expeditionMemberCountsBySlug={expeditionMemberCountsBySlug}
                communityCountsByItemId={communityCountsByItemId}
                onAdjust={updateItemQuantity}
                isExpanded={isExpanded}
                showCompletionEffect={shouldShowCompletionEffect}
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
                progressItems={progressItems}
                isFirst={index === 0}
              />
            );
          })}
      </div>
    </div>
  ) : (
    <div className="border border-frame2/70 bg-panel2/40 px-2 py-4 text-[11px] uppercase tracking-[0.12em] text-muted">
      {labels.noSignalProjectData}
    </div>
  );
}
