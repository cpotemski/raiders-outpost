import Link from "next/link";
import { ProgressRing } from "@/components/ui/ProgressRing";
import type { ProjectCardData } from "@/components/projects/projectCards";

export function ProjectCard({
  project,
  completedCount,
  totalCount,
  progressRatio,
  progressPercent,
}: ProjectCardData) {
  return (
    <Link
      href={`/projects/${project.slug}`}
      data-testid={`project-card-${project.slug}`}
      className="arc-panel arc-corners group relative flex flex-col justify-center gap-3 overflow-hidden border-frame2/70 px-4 py-4 transition hover:border-accent/60"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-xs font-semibold uppercase tracking-[0.12em] break-words sm:text-sm">
            {project.name}
          </h3>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className="min-w-[48px] text-right text-[10px] font-semibold uppercase tracking-[0.12em] text-muted"
            data-project-count={`${completedCount}/${totalCount}`}
          >
            {completedCount} / {totalCount}
          </span>
          <ProgressRing
            radius={8}
            strokeWidth={2}
            size={24}
            progress={progressRatio}
            data-project-progress={progressPercent}
            className="h-6 w-6"
          />
        </div>
      </div>
    </Link>
  );
}
