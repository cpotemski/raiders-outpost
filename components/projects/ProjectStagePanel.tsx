import { useCallback, useMemo } from "react";
import type { PointerEvent } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/cn";
import type { ProjectStageProgress } from "@/types/projects";
import { ProjectItemTile } from "@/components/projects/ProjectItemTile";
import { useLabels } from "@/components/locale/useLabels";
import { getProgressStats } from "@/lib/progress";
import { ProgressRing } from "@/components/ui/ProgressRing";

type ProjectStagePanelProps = {
  stage: ProjectStageProgress;
  memberCount: number;
  expeditionMemberCountsBySlug: Record<string, number>;
  communityCountsByItemId: Record<string, number>;
  onAdjust: (projectItemId: string, nextQuantity: number) => void;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  stripBlueprintLabel?: boolean;
  progressItems?: ProjectStageProgress["items"];
  showCompletionEffect?: boolean;
  isFirst?: boolean;
};

export function ProjectStagePanel({
  stage,
  memberCount,
  expeditionMemberCountsBySlug,
  communityCountsByItemId,
  onAdjust,
  isExpanded,
  onToggleExpanded,
  stripBlueprintLabel,
  progressItems,
  showCompletionEffect = false,
  isFirst = false,
}: ProjectStagePanelProps) {
  const labels = useLabels();
  const { completedCount, totalCount, isCompleted, progressRatio } = useMemo(
    () => getProgressStats(progressItems ?? stage.items),
    [progressItems, stage.items]
  );
  const progressPercent = Math.round(progressRatio * 100);
  const handleTogglePointerUp = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      if (event.pointerType === "touch") {
        event.currentTarget.blur();
      }
    },
    []
  );

  return (
    <div
      className={cn(
        "relative px-3 py-4 sm:px-4",
        isFirst ? "pt-4" : "pt-5",
        showCompletionEffect
          ? "bg-panel/85 shadow-[0_0_24px_rgba(72,199,214,0.18)]"
          : "bg-transparent"
      )}
      data-stage-key={stage.stageKey}
      data-stage-highlight={showCompletionEffect ? "true" : undefined}
    >
      <div className="relative z-0">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em]">
              {stage.name}
            </h3>
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
            {isCompleted ? (
              <button
                type="button"
                onClick={onToggleExpanded}
                onPointerUp={handleTogglePointerUp}
                aria-label={isExpanded ? labels.hide : labels.show}
                title={isExpanded ? labels.hide : labels.show}
                className={cn(
                  "inline-flex h-7 w-7 items-center justify-center border",
                  isExpanded
                    ? "border-accent/70 text-text"
                    : "border-frame2 text-muted hover:border-accent/60"
                )}
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
        <div className="relative">
          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-0 z-20 flex items-center justify-center transition-opacity duration-200",
              showCompletionEffect
                ? "opacity-100 bg-[rgba(0,0,0,0.45)] backdrop-blur-sm"
                : "opacity-0 bg-transparent"
            )}
            data-stage-overlay={showCompletionEffect ? "true" : undefined}
          >
            <span className="rounded-full border border-accent/60 bg-[rgba(0,0,0,0.85)] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-accent shadow-[0_0_24px_rgba(72,199,214,0.35)]">
              {labels.stageComplete}
            </span>
          </div>
          {isExpanded ? (
            <div className="relative z-10 mt-3 border-t border-frame2/70 pt-4">
              {stage.items.length ? (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-8 lg:gap-1.5 xl:grid-cols-9 2xl:grid-cols-10">
                  {stage.items.map((item) => (
                    <ProjectItemTile
                      key={item.itemId}
                      item={item}
                      memberCount={memberCount}
                      expeditionMemberCountsBySlug={expeditionMemberCountsBySlug}
                      communityCount={
                        communityCountsByItemId[item.projectItemId] ?? 0
                      }
                      onAdjust={onAdjust}
                      stripBlueprintLabel={stripBlueprintLabel}
                    />
                  ))}
                </div>
              ) : (
                <div className="border border-frame2/70 bg-panel2/40 px-3 py-3 text-[11px] uppercase tracking-[0.12em] text-muted">
                  {labels.dataNotFoundScanning}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
