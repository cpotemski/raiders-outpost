import { useMemo } from "react";
import { cn } from "@/lib/cn";
import type { ProjectStageProgress } from "@/types/projects";
import { ProjectItemTile } from "@/components/projects/ProjectItemTile";

type ProjectStagePanelProps = {
  stage: ProjectStageProgress;
  memberCount: number;
  communityCountsByItemId: Record<string, number>;
  onAdjust: (projectItemId: string, nextQuantity: number) => void;
  isExpanded: boolean;
  onToggleExpanded: () => void;
};

export function ProjectStagePanel({
  stage,
  memberCount,
  communityCountsByItemId,
  onAdjust,
  isExpanded,
  onToggleExpanded,
}: ProjectStagePanelProps) {
  const isCompleted = useMemo(() => {
    if (!stage.items.length) return true;
    return stage.items.every(
      (item) =>
        item.quantityRequired > 0 && item.quantityOwned >= item.quantityRequired
    );
  }, [stage.items]);
  const completedCount = stage.items.filter(
    (item) =>
      item.quantityRequired > 0 && item.quantityOwned >= item.quantityRequired
  ).length;
  const totalCount = stage.items.length;
  const progressRatio = totalCount ? completedCount / totalCount : 1;
  const progressPercent = Math.round(progressRatio * 100);
  const ringRadius = 6;
  const ringStroke = 2;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringDash = progressRatio * ringCircumference;

  return (
    <div className="arc-panel arc-corners overflow-hidden">
      <div className="arc-panel-header">
        <div>
          <p className="hud-label">Stage</p>
          <h3 className="text-sm font-semibold uppercase tracking-[0.12em]">
            {stage.name}
          </h3>
        </div>
        <div className="flex items-center gap-2">
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
              {isExpanded ? "Hide" : "Show"}
            </button>
          ) : null}
        </div>
      </div>
      {isExpanded ? (
        <div className="border-t border-frame2 bg-panel/80 px-3 py-4 sm:px-4">
          {stage.items.length ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
              {stage.items.map((item) => (
                <ProjectItemTile
                  key={item.itemId}
                  item={item}
                  memberCount={memberCount}
                  communityCount={
                    communityCountsByItemId[item.projectItemId] ?? 0
                  }
                  onAdjust={onAdjust}
                />
              ))}
            </div>
          ) : (
            <div className="border border-frame2/70 bg-panel2/40 px-3 py-3 text-[11px] uppercase tracking-[0.12em] text-muted">
              Data not found. Scanning...
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
