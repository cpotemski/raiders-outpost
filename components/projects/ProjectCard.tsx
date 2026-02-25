import Link from "next/link";
import { ProgressRing } from "@/components/ui/ProgressRing";
import type { ProjectCardData } from "@/components/projects/projectCards";
import { cn } from "@/lib/cn";

export function ProjectCard({
  project,
  href,
  completedCount,
  totalCount,
  isCompleted,
  progressRatio,
  progressPercent,
  toggle,
}: ProjectCardData) {
  const content = (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0 flex-1">
        <h3
          className="text-xs font-semibold uppercase tracking-[0.12em] break-words sm:text-sm text-text"
        >
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
          className={cn("h-6 w-6", isCompleted && "opacity-80")}
          trackColor={
            isCompleted
              ? "rgba(160, 180, 190, 0.2)"
              : "rgba(160, 180, 190, 0.35)"
          }
          progressColor={
            isCompleted
              ? "rgba(160, 180, 190, 0.42)"
              : "rgba(72, 199, 214, 0.75)"
          }
        />
      </div>
    </div>
  );

  return (
    <div
      data-testid={`project-card-${project.slug}`}
      className={cn(
        "arc-panel arc-corners group relative flex flex-col justify-center gap-3 overflow-hidden px-4 py-4 transition",
        href ? "hover:border-accent/60" : "",
        isCompleted
          ? "border-frame2/50 opacity-70 hover:border-frame2/60"
          : "border-frame2/70",
        toggle && !toggle.active && "border-frame2/50 opacity-60"
      )}
    >
      {href ? (
        <Link
          href={href}
          className="block"
          data-testid={`project-card-link-${project.slug}`}
        >
          {content}
        </Link>
      ) : (
        <div>{content}</div>
      )}
      {toggle ? (
        <div className="flex justify-end">
          <button
            type="button"
            aria-pressed={toggle.active}
            data-testid={toggle.testId}
            onClick={toggle.onToggle}
            className={cn(
              "h-8 border px-3 text-[10px] font-semibold uppercase tracking-[0.12em] transition",
              toggle.active
                ? "border-accent/80 text-text"
                : "border-frame2 text-muted hover:border-accent/60"
            )}
          >
            {toggle.active ? toggle.activeLabel : toggle.inactiveLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
}
