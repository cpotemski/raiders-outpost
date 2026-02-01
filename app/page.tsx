"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useProjectContext } from "@/components/projects/ProjectContext";
import { useLabels } from "@/components/locale/useLabels";

export default function StartPage() {
  const { projects, loading } = useProjectContext();
  const labels = useLabels();

  const projectCards = useMemo(() => {
    const hideoutSlugs = new Set([
      "equipment_bench",
      "explosives_bench",
      "med_station",
      "refiner",
      "scrappy",
      "stash",
      "utility_bench",
      "weapon_bench",
      "workbench",
    ]);
    const ordered = projects.slice().sort((a, b) => {
      const priority = (project: typeof a) => {
        if (hideoutSlugs.has(project.slug)) return 2;
        if (project.kind === "blueprints") return 0;
        if (project.kind === "project") return 1;
        return 2;
      };
      const priorityDiff = priority(a) - priority(b);
      if (priorityDiff !== 0) return priorityDiff;
      return a.name.localeCompare(b.name);
    });

    return ordered.map((project) => {
      const items = project.stages.flatMap((stage) => stage.items);
      const completedCount = items.filter(
        (item) =>
          item.quantityRequired > 0 && item.quantityOwned >= item.quantityRequired
      ).length;
      const totalCount = items.length;
      const isCompleted =
        totalCount === 0 ||
        completedCount === totalCount ||
        items.every(
          (item) =>
            item.quantityRequired > 0 &&
            item.quantityOwned >= item.quantityRequired
        );
      const progressRatio = totalCount ? completedCount / totalCount : 1;
      const progressPercent = Math.round(progressRatio * 100);
      const ringRadius = 8;
      const ringStroke = 2;
      const ringCircumference = 2 * Math.PI * ringRadius;
      const ringDash = progressRatio * ringCircumference;

      return {
        project,
        completedCount,
        totalCount,
        isCompleted,
        progressPercent,
        ringRadius,
        ringStroke,
        ringCircumference,
        ringDash,
      };
    });
  }, [projects]);

  const pendingProjects = projectCards.filter((entry) => !entry.isCompleted);
  const completedProjects = projectCards.filter((entry) => entry.isCompleted);

  return (
    <div className="flex flex-col gap-4">
      <div className="arc-panel arc-corners overflow-hidden">
        <div className="arc-panel-header">
          <div>
            <p className="hud-label text-sm font-semibold tracking-[0.14em]">
              {labels.projectSelection}
            </p>
          </div>
        </div>
        <div className="border-t border-frame2 bg-panel/70 px-4 py-4 sm:px-6">
          {loading && !projects.length ? (
            <div className="border border-frame2/70 bg-panel2/40 px-3 py-3 text-[11px] uppercase tracking-[0.12em] text-muted">
              {labels.scanningProjectCache}
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              <div>
                <div className="flex items-center justify-between pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
                  <span>{labels.activeProject}</span>
                  <span aria-label={`${labels.activeProject}: ${pendingProjects.length}`}>
                    {pendingProjects.length}
                  </span>
                </div>
                <div
                  className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
                  data-testid="project-list"
                >
                  {pendingProjects.length ? (
                    pendingProjects.map(
                      ({
                        project,
                        completedCount,
                        totalCount,
                        progressPercent,
                        ringRadius,
                        ringStroke,
                        ringCircumference,
                        ringDash,
                      }) => (
                        <Link
                          key={project.slug}
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
                              <svg
                                aria-hidden="true"
                                data-project-progress={progressPercent}
                                viewBox="0 0 24 24"
                                className="h-6 w-6"
                              >
                                <circle
                                  cx="12"
                                  cy="12"
                                  r={ringRadius}
                                  fill="none"
                                  stroke="rgba(160, 180, 190, 0.35)"
                                  strokeWidth={ringStroke}
                                />
                                <circle
                                  cx="12"
                                  cy="12"
                                  r={ringRadius}
                                  fill="none"
                                  stroke="rgba(72, 199, 214, 0.75)"
                                  strokeWidth={ringStroke}
                                  strokeLinecap="square"
                                  strokeDasharray={`${ringDash} ${ringCircumference}`}
                                  transform="rotate(-90 12 12)"
                                />
                              </svg>
                            </div>
                          </div>
                        </Link>
                      )
                    )
                  ) : (
                    <div className="col-span-full border border-frame2/70 bg-panel2/40 px-3 py-3 text-[11px] uppercase tracking-[0.12em] text-muted">
                      {labels.noSignalPendingQueue}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
                  <span>{labels.archived}</span>
                  <span aria-label={`${labels.archived}: ${completedProjects.length}`}>
                    {completedProjects.length}
                  </span>
                </div>
                <div
                  className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
                  data-testid="project-list-completed"
                >
                  {completedProjects.length ? (
                    completedProjects.map(
                      ({
                        project,
                        completedCount,
                        totalCount,
                        progressPercent,
                        ringRadius,
                        ringStroke,
                        ringCircumference,
                        ringDash,
                      }) => (
                        <Link
                          key={project.slug}
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
                              <svg
                                aria-hidden="true"
                                data-project-progress={progressPercent}
                                viewBox="0 0 24 24"
                                className="h-6 w-6"
                              >
                                <circle
                                  cx="12"
                                  cy="12"
                                  r={ringRadius}
                                  fill="none"
                                  stroke="rgba(160, 180, 190, 0.35)"
                                  strokeWidth={ringStroke}
                                />
                                <circle
                                  cx="12"
                                  cy="12"
                                  r={ringRadius}
                                  fill="none"
                                  stroke="rgba(72, 199, 214, 0.75)"
                                  strokeWidth={ringStroke}
                                  strokeLinecap="square"
                                  strokeDasharray={`${ringDash} ${ringCircumference}`}
                                  transform="rotate(-90 12 12)"
                                />
                              </svg>
                            </div>
                          </div>
                        </Link>
                      )
                    )
                  ) : (
                    <div className="col-span-full border border-frame2/70 bg-panel2/40 px-3 py-3 text-[11px] uppercase tracking-[0.12em] text-muted">
                      {labels.noArchivedSignal}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
