import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent } from "react";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/cn";
import type { ProjectStageProgress } from "@/types/projects";
import { ProjectItemTile } from "@/components/projects/ProjectItemTile";
import { useLabels } from "@/components/locale/useLabels";
import { getProgressStats } from "@/lib/progress";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { EmptyState } from "@/components/ui/EmptyState";

type ProjectStagePanelProps = {
  stage: ProjectStageProgress;
  onAdjust: (projectItemId: string, nextQuantity: number) => void;
  isExpanded: boolean;
  onToggleExpanded: (stageKey: string) => void;
  stripBlueprintLabel?: boolean;
  progressItems?: ProjectStageProgress["items"];
  showCompletionEffect?: boolean;
  disableCollapseAnimation?: boolean;
  layoutVariant?: "stacked" | "column";
  showCompletedToggle?: boolean;
  itemGridVariant?: "default" | "adaptiveColumns" | "twoRows";
};

function ProjectStagePanelComponent({
  stage,
  onAdjust,
  isExpanded,
  onToggleExpanded,
  stripBlueprintLabel,
  progressItems,
  showCompletionEffect = false,
  disableCollapseAnimation = false,
  layoutVariant = "stacked",
  showCompletedToggle = true,
  itemGridVariant = "default",
}: ProjectStagePanelProps) {
  const labels = useLabels();
  const [contentMounted, setContentMounted] = useState(isExpanded);
  const [isCollapsing, setIsCollapsing] = useState(false);
  const collapseTimerRef = useRef<number | null>(null);
  const COLLAPSE_DURATION_MS = 320;
  const { completedCount, totalCount, isCompleted, progressRatio } = useMemo(
    () => getProgressStats(progressItems ?? stage.items),
    [progressItems, stage.items]
  );
  const progressPercent = Math.round(progressRatio * 100);
  const isStackedLayout = layoutVariant === "stacked";
  const isCollapsedCompleted =
    isStackedLayout && isCompleted && !isExpanded && !showCompletionEffect;
  const itemGridClassName = isStackedLayout
    ? "grid gap-1 [grid-template-columns:repeat(auto-fill,minmax(96px,1fr))] sm:[grid-template-columns:repeat(auto-fill,minmax(112px,1fr))] lg:[grid-template-columns:repeat(auto-fill,minmax(120px,1fr))]"
    : itemGridVariant === "twoRows"
      ? "grid grid-flow-col auto-cols-[118px] grid-rows-2 justify-start gap-1.5 overflow-x-auto pb-1 pr-1"
      : "grid justify-start gap-2 [grid-template-columns:repeat(auto-fit,minmax(104px,120px))]";

  const handleTogglePointerUp = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      if (event.pointerType === "touch") {
        event.currentTarget.blur();
      }
    },
    []
  );

  useEffect(() => {
    if (collapseTimerRef.current) {
      window.clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = null;
    }

    if (isExpanded) {
      setContentMounted(true);
      setIsCollapsing(false);
      return;
    }

    if (!contentMounted) {
      setIsCollapsing(false);
      return;
    }

    if (disableCollapseAnimation) {
      setContentMounted(false);
      setIsCollapsing(false);
      return;
    }

    setIsCollapsing(true);
    collapseTimerRef.current = window.setTimeout(() => {
      setContentMounted(false);
      setIsCollapsing(false);
      collapseTimerRef.current = null;
    }, COLLAPSE_DURATION_MS);
  }, [contentMounted, disableCollapseAnimation, isExpanded]);

  useEffect(
    () => () => {
      if (collapseTimerRef.current) {
        window.clearTimeout(collapseTimerRef.current);
      }
    },
    []
  );

  return (
    <div
      className={cn(
        isStackedLayout
          ? "relative border-l border-transparent px-3 py-3 transition-colors duration-200 sm:px-4"
          : "relative h-full border border-frame2/70 bg-panel2/35 px-2.5 py-2.5 sm:px-2 sm:py-3",
        isCollapsedCompleted ? "bg-panel2/35 border-l-frame2 opacity-90" : "opacity-100",
        showCompletionEffect
          ? "bg-panel/85 shadow-[0_0_24px_rgba(72,199,214,0.18)]"
          : ""
      )}
      data-stage-key={stage.stageKey}
      data-stage-expanded={isExpanded ? "true" : "false"}
      data-stage-completed={isCompleted ? "true" : "false"}
      data-stage-highlight={showCompletionEffect ? "true" : undefined}
      data-testid={`project-stage-${stage.stageKey}`}
    >
      <div className="relative z-0">
        {isStackedLayout ? (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h3
                className={cn(
                  "text-sm font-semibold uppercase tracking-[0.12em]",
                  isCollapsedCompleted ? "text-muted" : "text-text"
                )}
              >
                {stage.name}
              </h3>
              {isCompleted ? (
                <Check
                  className="h-3.5 w-3.5 text-accent"
                  aria-hidden="true"
                  data-testid={`project-stage-complete-mark-${stage.stageKey}`}
                />
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "inline-flex min-w-[48px] justify-end text-[10px] font-semibold uppercase tracking-[0.12em]",
                  isCollapsedCompleted ? "text-muted/85" : "text-muted"
                )}
                data-stage-count={`${completedCount}/${totalCount}`}
              >
                {completedCount} / {totalCount}
              </span>
              <ProgressRing
                radius={6}
                strokeWidth={2}
                progress={progressRatio}
                data-stage-progress={progressPercent}
                className="h-4 w-4"
              />
              {isCompleted && showCompletedToggle ? (
                <button
                  type="button"
                  onClick={() => onToggleExpanded(stage.stageKey)}
                  onPointerUp={handleTogglePointerUp}
                  aria-label={isExpanded ? labels.hide : labels.show}
                  title={isExpanded ? labels.hide : labels.show}
                  className={cn(
                    "inline-flex h-7 w-7 items-center justify-center border transition-colors",
                    isExpanded
                      ? "border-accent/70 text-text"
                      : "border-frame2 text-muted hover:border-accent/60"
                  )}
                  data-testid={`project-stage-toggle-${stage.stageKey}`}
                >
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
        <div className="relative">
          {contentMounted ? (
            <div
              className={cn(
                isStackedLayout
                  ? "relative z-10 overflow-hidden transition-all duration-300 ease-out"
                  : "relative z-10",
                isStackedLayout
                  ? isExpanded && !isCollapsing
                    ? "mt-3 max-h-[2400px] border-t border-frame2/70 pt-4 opacity-100"
                    : "mt-0 max-h-0 border-t border-transparent pt-0 opacity-0"
                  : "opacity-100"
              )}
              data-stage-content={
                !isStackedLayout || (isExpanded && !isCollapsing) ? "true" : "false"
              }
              data-testid={`project-stage-content-${stage.stageKey}`}
            >
              <div
                className={cn(
                  "overflow-hidden transition-opacity duration-200",
                  !isStackedLayout || (isExpanded && !isCollapsing) ? "opacity-100" : "opacity-0"
                )}
              >
                {stage.items.length ? (
                  <div className={itemGridClassName}>
                    {stage.items.map((item) => (
                      <ProjectItemTile
                        key={item.itemId}
                        item={item}
                        onAdjust={onAdjust}
                        stripBlueprintLabel={stripBlueprintLabel}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState>
                    {labels.dataNotFoundScanning}
                  </EmptyState>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export const ProjectStagePanel = memo(ProjectStagePanelComponent);
