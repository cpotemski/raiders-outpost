"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useProjectContext } from "@/components/projects/ProjectContext";
import { ProjectStagePanel } from "@/components/projects/ProjectStagePanel";
import type { ProjectProgress } from "@/types/projects";
import { useLabels } from "@/components/locale/useLabels";
import { EmptyState } from "@/components/ui/EmptyState";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";

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
    updateItemQuantity,
  } = useProjectContext();
  const activeProject = project ?? selectedProject;
  const [completedExpansionOverrides, setCompletedExpansionOverrides] =
    useState<Record<string, boolean>>(
      () => ({})
    );
  const [visitedProjects, setVisitedProjects, visitedProjectsHydrated] =
    useLocalStorageState<string[]>("arc:projects:visited-stage-layout", []);
  const [initialLayoutResolved, setInitialLayoutResolved] = useState(false);
  const [recentlyCompleted, setRecentlyCompleted] = useState<Set<string>>(
    () => new Set()
  );
  const completionTimers = useRef<Map<string, number>>(new Map());
  const completionStatusRef = useRef<Record<string, boolean>>({});
  const initialCompletionCaptured = useRef(false);
  const activeProjectIdRef = useRef(activeProject?.slug ?? null);
  const currentProjectVisitedRef = useRef<string | null>(
    activeProject?.slug ?? null
  );
  const COMPLETION_DISPLAY_MS = 1200;

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

  const activeProjectId = activeProject?.slug ?? null;
  const shouldAutoCollapseCompleted =
    activeProjectId !== null &&
    visitedProjectsHydrated &&
    visitedProjects.includes(activeProjectId);

  const markProjectAsVisited = useCallback(
    (projectSlug: string | null) => {
      if (!projectSlug) return;
      setVisitedProjects((prev) => {
        if (prev.includes(projectSlug)) {
          return prev;
        }
        return [...prev, projectSlug];
      });
    },
    [setVisitedProjects]
  );

  useEffect(() => {
    if (visitedProjectsHydrated) {
      setInitialLayoutResolved(true);
    }
  }, [visitedProjectsHydrated]);

  useEffect(() => {
    if (activeProjectIdRef.current !== activeProjectId) {
      markProjectAsVisited(activeProjectIdRef.current);
      completionStatusRef.current = {};
      initialCompletionCaptured.current = false;
      activeProjectIdRef.current = activeProjectId;
      currentProjectVisitedRef.current = activeProjectId;
      setRecentlyCompleted(new Set());
      setCompletedExpansionOverrides({});
      setInitialLayoutResolved(false);
      completionTimers.current.forEach((timer) => window.clearTimeout(timer));
      completionTimers.current.clear();
    }
  }, [activeProjectId, markProjectAsVisited]);

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

    const prevStatus = completionStatusRef.current;
    const newlyCompleted = new Set<string>();
    Object.entries(stageCompletionStatus).forEach(([stageKey, isCompleted]) => {
      const wasCompleted = prevStatus[stageKey];
      if (!wasCompleted && isCompleted) {
        newlyCompleted.add(stageKey);
      }
    });
    if (!newlyCompleted.size) {
      completionStatusRef.current = stageCompletionStatus;
      return;
    }

    newlyCompleted.forEach((stageKey) => {
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
          setCompletedExpansionOverrides((prev) => {
            if (prev[stageKey] === false) {
              return prev;
            }
            return { ...prev, [stageKey]: false };
          });
        }, COMPLETION_DISPLAY_MS);
        completionTimers.current.set(stageKey, timer);
        return next;
      });
    });

    completionStatusRef.current = stageCompletionStatus;
  }, [activeProject, stageCompletionStatus]);

  useEffect(
    () => () => {
      completionTimers.current.forEach((timer) => window.clearTimeout(timer));
      markProjectAsVisited(currentProjectVisitedRef.current);
    },
    [markProjectAsVisited]
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
                    item.quantityRequired <= 0 ||
                    item.quantityOwned >= item.quantityRequired
                )
              : true;
            const shouldShowCompletionEffect = recentlyCompleted.has(
              stage.stageKey
            );
            const expansionOverride =
              completedExpansionOverrides[stage.stageKey];
            const isExpanded = !isCompleted
              ? true
              : shouldShowCompletionEffect
                ? true
                : expansionOverride !== undefined
                  ? expansionOverride
                  : !shouldAutoCollapseCompleted;
            const disableCollapseAnimation =
              !initialLayoutResolved &&
              isCompleted &&
              !shouldShowCompletionEffect &&
              expansionOverride === undefined &&
              shouldAutoCollapseCompleted;
            return (
              <ProjectStagePanel
                key={stage.stageKey}
                stage={stage}
                onAdjust={updateItemQuantity}
                isExpanded={isExpanded}
                showCompletionEffect={shouldShowCompletionEffect}
                disableCollapseAnimation={disableCollapseAnimation}
                onToggleExpanded={() => {
                  setCompletedExpansionOverrides((prev) => {
                    const current =
                      prev[stage.stageKey] !== undefined
                        ? prev[stage.stageKey]
                        : !shouldAutoCollapseCompleted;
                    return {
                      ...prev,
                      [stage.stageKey]: !current,
                    };
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
    <EmptyState className="px-2">
      {labels.noSignalProjectData}
    </EmptyState>
  );
}
