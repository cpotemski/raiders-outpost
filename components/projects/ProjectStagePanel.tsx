import { useMemo } from "react";
import { cn } from "@/lib/cn";
import type { ProjectStageProgress } from "@/types/projects";
import { ProjectItemTile } from "@/components/projects/ProjectItemTile";
import { useLabels } from "@/components/locale/useLabels";

type ProjectStagePanelProps = {
  stage: ProjectStageProgress;
  memberCount: number;
  expeditionMemberCountsBySlug: Record<string, number>;
  communityCountsByItemId: Record<string, number>;
  onAdjust: (projectItemId: string, nextQuantity: number) => void;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  stripBlueprintLabel?: boolean;
  progressCompletedCount?: number;
  progressTotalCount?: number;
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
  progressCompletedCount,
  progressTotalCount,
}: ProjectStagePanelProps) {
  const labels = useLabels();
  const isCompleted = useMemo(() => {
    if (!stage.items.length) return true;
    return stage.items.every(
      (item) =>
        item.quantityRequired > 0 && item.quantityOwned >= item.quantityRequired
    );
  }, [stage.items]);
  const completedCount =
    progressCompletedCount ??
    stage.items.filter(
      (item) =>
        item.quantityRequired > 0 && item.quantityOwned >= item.quantityRequired
    ).length;
  const totalCount = progressTotalCount ?? stage.items.length;
  const progressRatio = totalCount ? completedCount / totalCount : 1;
  const progressPercent = Math.round(progressRatio * 100);
  const ringRadius = 6;
  const ringStroke = 2;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringDash = progressRatio * ringCircumference;

  return (
    <div
      className="arc-panel arc-corners overflow-hidden"
      data-stage-key={stage.stageKey}
    >
      <div className="arc-panel-header">
        <div>
          <p className="hud-label">{labels.stageLabel}</p>
          <h3 className="text-sm font-semibold uppercase tracking-[0.12em]">
            {stage.name}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted"
            data-stage-count={`${completedCount}/${totalCount}`}
          >
            {completedCount} / {totalCount}
          </span>
          <svg
            aria-hidden="true"
            data-stage-progress={progressPercent}
            viewBox="0 0 16 16"
            className="h-4 w-4"
          >
            <circle
              cx="8"
              cy="8"
              r={ringRadius}
              fill="none"
              stroke="rgba(160, 180, 190, 0.35)"
              strokeWidth={ringStroke}
            />
            <circle
              cx="8"
              cy="8"
              r={ringRadius}
              fill="none"
              stroke="rgba(72, 199, 214, 0.75)"
              strokeWidth={ringStroke}
              strokeLinecap="square"
              strokeDasharray={`${ringDash} ${ringCircumference}`}
              transform="rotate(-90 8 8)"
            />
          </svg>
          {isCompleted ? (
            <button
              type="button"
              onClick={onToggleExpanded}
              className={cn(
                "h-7 border px-2 text-[10px] font-semibold uppercase tracking-[0.12em]",
                isExpanded
                  ? "border-accent/70 text-text"
                  : "border-frame2 text-muted hover:border-accent/60"
              )}
            >
              {isExpanded ? labels.hide : labels.show}
            </button>
          ) : null}
        </div>
      </div>
      {isExpanded ? (
        <div className="border-t border-frame2 bg-panel/80 px-3 py-4 sm:px-4">
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
  );
}
