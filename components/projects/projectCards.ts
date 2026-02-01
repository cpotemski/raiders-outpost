import type { ProjectProgress } from "@/types/projects";
import { getProgressStats } from "@/lib/progress";

const HIDEOUT_SLUGS = new Set([
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

export type ProjectCardData = {
  project: ProjectProgress;
  completedCount: number;
  totalCount: number;
  isCompleted: boolean;
  progressRatio: number;
  progressPercent: number;
};

const getPriority = (project: ProjectProgress) => {
  if (HIDEOUT_SLUGS.has(project.slug)) return 2;
  if (project.kind === "blueprints") return 0;
  if (project.kind === "project") return 1;
  return 2;
};

export const getProjectCards = (projects: ProjectProgress[]) => {
  const ordered = projects.slice().sort((a, b) => {
    const priorityDiff = getPriority(a) - getPriority(b);
    if (priorityDiff !== 0) return priorityDiff;
    return a.name.localeCompare(b.name);
  });

  return ordered.map((project) => {
    const items = project.stages.flatMap((stage) => stage.items);
    const { completedCount, totalCount, isCompleted, progressRatio } =
      getProgressStats(items);

    return {
      project,
      completedCount,
      totalCount,
      isCompleted,
      progressRatio,
      progressPercent: Math.round(progressRatio * 100),
    } satisfies ProjectCardData;
  });
};

export const splitProjectCards = (cards: ProjectCardData[]) => ({
  pending: cards.filter((entry) => !entry.isCompleted),
  completed: cards.filter((entry) => entry.isCompleted),
});
