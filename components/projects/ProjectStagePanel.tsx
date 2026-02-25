import { memo, useMemo } from "react";
import { Check } from "lucide-react";
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
  stripBlueprintLabel?: boolean;
  progressItems?: ProjectStageProgress["items"];
  layoutVariant?: "stacked" | "column";
  itemGridVariant?: "default" | "adaptiveColumns" | "twoRows";
};

function ProjectStagePanelComponent({
  stage,
  onAdjust,
  stripBlueprintLabel,
  progressItems,
  layoutVariant = "stacked",
  itemGridVariant = "default",
}: ProjectStagePanelProps) {
  const labels = useLabels();
  const { completedCount, totalCount, isCompleted, progressRatio } = useMemo(
    () => getProgressStats(progressItems ?? stage.items),
    [progressItems, stage.items]
  );
  const progressPercent = Math.round(progressRatio * 100);
  const isStackedLayout = layoutVariant === "stacked";
  const itemGridClassName = isStackedLayout
    ? "grid gap-1 [grid-template-columns:repeat(auto-fill,minmax(96px,1fr))] sm:[grid-template-columns:repeat(auto-fill,minmax(112px,1fr))] lg:[grid-template-columns:repeat(auto-fill,minmax(120px,1fr))]"
    : itemGridVariant === "twoRows"
      ? "grid grid-flow-col auto-cols-[118px] grid-rows-2 justify-start gap-1.5 overflow-x-auto pb-1 pr-1"
      : "grid justify-start gap-2 [grid-template-columns:repeat(auto-fit,minmax(104px,120px))]";

  return (
    <div
      className={cn(
        isStackedLayout
          ? "relative border-l border-transparent px-3 py-3 sm:px-4"
          : "relative h-full border border-frame2/70 bg-panel2/35 px-2.5 py-2.5 sm:px-2 sm:py-3"
      )}
      data-stage-key={stage.stageKey}
      data-stage-expanded="true"
      data-stage-completed={isCompleted ? "true" : "false"}
      data-testid={`project-stage-${stage.stageKey}`}
    >
      <div className="relative z-0">
        {isStackedLayout ? (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-text">
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
                className="inline-flex min-w-[48px] justify-end text-[10px] font-semibold uppercase tracking-[0.12em] text-muted"
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
            </div>
          </div>
        ) : null}
        <div className="relative">
          <div
            className={cn(
              isStackedLayout
                ? "relative z-10 mt-3 border-t border-frame2/70 pt-4"
                : "relative z-10 opacity-100"
            )}
            data-stage-content="true"
            data-testid={`project-stage-content-${stage.stageKey}`}
          >
            <div>
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
        </div>
      </div>
    </div>
  );
}

export const ProjectStagePanel = memo(ProjectStagePanelComponent);
