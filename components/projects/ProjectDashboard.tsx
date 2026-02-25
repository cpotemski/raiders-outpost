"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useProjectContext } from "@/components/projects/ProjectContext";
import { ProjectStagePanel } from "@/components/projects/ProjectStagePanel";
import {
  ProjectStageStepMarker,
  ProjectStageStepper,
} from "@/components/projects/ProjectStageStepper";
import type { ProjectProgress } from "@/types/projects";
import { useLabels } from "@/components/locale/useLabels";
import { EmptyState } from "@/components/ui/EmptyState";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import { cn } from "@/lib/cn";

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
  const VISITED_LAYOUT_STORAGE_KEY = "arc:projects:visited-stage-layout";
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
    useLocalStorageState<string[]>(VISITED_LAYOUT_STORAGE_KEY, []);
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
    if (!neededOnly && !q) {
      return activeProject.stages;
    }
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

  const sortedStages = useMemo(
    () => filteredStages.slice().sort((a, b) => a.sortOrder - b.sortOrder),
    [filteredStages]
  );

  const stageItemsByKey = useMemo(() => {
    if (!activeProject) {
      return new Map<string, ProjectProgress["stages"][number]["items"]>();
    }
    return new Map(
      activeProject.stages.map((stage) => [stage.stageKey, stage.items])
    );
  }, [activeProject]);

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
  const stageToggleDisabledStatus = useMemo(() => {
    if (!activeProject) return {};
    return activeProject.stages.reduce((acc, stage) => {
      const hasAdjustableItem = stage.items.some(
        (item) => Boolean(item.projectItemId) && item.quantityRequired > 0
      );
      acc[stage.stageKey] = !hasAdjustableItem;
      return acc;
    }, {} as Record<string, boolean>);
  }, [activeProject]);

  const activeProjectId = activeProject?.slug ?? null;
  const useMultiStageRailLayout = activeProject?.kind !== "blueprints";
  const hasCompletedStages = Object.values(stageCompletionStatus).some(Boolean);
  const shouldAutoCollapseCompleted =
    activeProjectId !== null &&
    (hasCompletedStages ||
      (visitedProjectsHydrated && visitedProjects.includes(activeProjectId)));

  const markProjectAsVisited = useCallback(
    (projectSlug: string | null) => {
      if (!projectSlug) return;
      setVisitedProjects((prev) => {
        if (prev.includes(projectSlug)) {
          return prev;
        }
        return [...prev, projectSlug];
      });
      if (typeof window !== "undefined") {
        const stored = window.localStorage.getItem(VISITED_LAYOUT_STORAGE_KEY);
        const parsed = stored ? (JSON.parse(stored) as string[]) : [];
        if (!parsed.includes(projectSlug)) {
          window.localStorage.setItem(
            VISITED_LAYOUT_STORAGE_KEY,
            JSON.stringify([...parsed, projectSlug])
          );
        }
      }
    },
    [setVisitedProjects, VISITED_LAYOUT_STORAGE_KEY]
  );

  const handleToggleCompletedStage = useCallback(
    (stageKey: string) => {
      markProjectAsVisited(activeProjectId);
      setCompletedExpansionOverrides((prev) => {
        const current =
          prev[stageKey] !== undefined
            ? prev[stageKey]
            : !shouldAutoCollapseCompleted;
        return {
          ...prev,
          [stageKey]: !current,
        };
      });
    },
    [activeProjectId, markProjectAsVisited, shouldAutoCollapseCompleted]
  );
  const handleToggleStageCompletion = useCallback(
    (stageKey: string) => {
      const stageItems = stageItemsByKey.get(stageKey);
      if (!stageItems?.length) return;

      const isCompleted = Boolean(stageCompletionStatus[stageKey]);
      stageItems.forEach((item) => {
        if (!item.projectItemId || item.quantityRequired <= 0) {
          return;
        }
        const nextQuantity = isCompleted ? 0 : item.quantityRequired;
        if (item.quantityOwned === nextQuantity) {
          return;
        }
        updateItemQuantity(item.projectItemId, nextQuantity);
      });
    },
    [stageCompletionStatus, stageItemsByKey, updateItemQuantity]
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
          markProjectAsVisited(activeProjectId);
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
  }, [activeProject, stageCompletionStatus, markProjectAsVisited, activeProjectId]);

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
    <div className="flex flex-col gap-4">
      {useMultiStageRailLayout ? (
        <div className="border border-frame2/70 bg-panel/70">
          <div className="hidden border-b border-frame2/70 lg:block">
            <ProjectStageStepper
              stages={sortedStages.map((stage) => ({
                stageKey: stage.stageKey,
                name: stage.name,
              }))}
              completionStatus={stageCompletionStatus}
              onToggleStageCompletion={handleToggleStageCompletion}
              disableToggleStatus={stageToggleDisabledStatus}
            />
          </div>
          <div className="hidden overflow-x-auto p-2.5 lg:block" data-testid="project-stage-columns">
            <div
              className="grid min-w-max gap-2"
              style={{
                gridTemplateColumns: `repeat(${Math.max(sortedStages.length, 1)}, minmax(220px, 1fr))`,
              }}
            >
              {sortedStages.map((stage) => {
                const progressItems = stageItemsByKey.get(stage.stageKey) ?? stage.items;
                const shouldShowCompletionEffect = recentlyCompleted.has(stage.stageKey);
                return (
                  <ProjectStagePanel
                    key={stage.stageKey}
                    stage={stage}
                    onAdjust={updateItemQuantity}
                    isExpanded
                    showCompletionEffect={shouldShowCompletionEffect}
                    onToggleExpanded={handleToggleCompletedStage}
                    stripBlueprintLabel={activeProject.kind === "blueprints"}
                    progressItems={progressItems}
                    layoutVariant="column"
                    showCompletedToggle={false}
                    itemGridVariant="adaptiveColumns"
                  />
                );
              })}
            </div>
          </div>
          <div className="relative lg:hidden" data-testid="project-stage-vertical-layout">
            <div className="space-y-3 px-2 py-3">
              {sortedStages.map((stage, index) => {
                const progressItems = stageItemsByKey.get(stage.stageKey) ?? stage.items;
                const shouldShowCompletionEffect = recentlyCompleted.has(stage.stageKey);
                const isCompleted = Boolean(stageCompletionStatus[stage.stageKey]);
                const previousCompleted =
                  index > 0
                    ? Boolean(stageCompletionStatus[sortedStages[index - 1]?.stageKey])
                    : false;
                return (
                  <div key={stage.stageKey} className="grid grid-cols-[20px_minmax(0,1fr)] gap-2">
                    <div className="relative flex items-center justify-center">
                      {index > 0 ? (
                        <span
                          className={cn(
                            "pointer-events-none absolute left-1/2 -translate-x-1/2 top-[-6px] bottom-[calc(50%+10px)] w-px",
                            previousCompleted ? "bg-accent/60" : "bg-frame2/80"
                          )}
                          aria-hidden="true"
                          data-testid="project-stage-step-line-vertical"
                        />
                      ) : null}
                      {index < sortedStages.length - 1 ? (
                        <span
                          className={cn(
                            "pointer-events-none absolute left-1/2 -translate-x-1/2 top-[calc(50%+10px)] bottom-[-6px] w-px",
                            isCompleted ? "bg-accent/60" : "bg-frame2/80"
                          )}
                          aria-hidden="true"
                          data-testid="project-stage-step-line-vertical"
                        />
                      ) : null}
                      <ProjectStageStepMarker
                        stageKey={stage.stageKey}
                        completed={isCompleted}
                        onClick={handleToggleStageCompletion}
                        disabled={Boolean(stageToggleDisabledStatus[stage.stageKey])}
                      />
                    </div>
                    <ProjectStagePanel
                      stage={stage}
                      onAdjust={updateItemQuantity}
                      isExpanded
                      showCompletionEffect={shouldShowCompletionEffect}
                      onToggleExpanded={handleToggleCompletedStage}
                      stripBlueprintLabel={activeProject.kind === "blueprints"}
                      progressItems={progressItems}
                      layoutVariant="column"
                      showCompletedToggle={false}
                      itemGridVariant="twoRows"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="divide-y divide-frame2/70 border border-frame2/70 bg-panel/70">
          {sortedStages.map((stage) => {
              const progressItems = stageItemsByKey.get(stage.stageKey) ?? stage.items;
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
                  onToggleExpanded={handleToggleCompletedStage}
                  stripBlueprintLabel={activeProject.kind === "blueprints"}
                  progressItems={progressItems}
                />
              );
            })}
        </div>
      )}
    </div>
  ) : (
    <EmptyState className="px-2">
      {labels.noProjectData}
    </EmptyState>
  );
}
