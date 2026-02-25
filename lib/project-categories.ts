import type { ProjectProgress } from "@/types/projects";
import { isExpeditionProjectSlug } from "@/lib/expeditions";

export type ProjectDisplayCategory = "blueprints" | "hideout" | "projects";

export const getProjectDisplayCategory = (
  project: Pick<ProjectProgress, "kind" | "slug">
): ProjectDisplayCategory | null => {
  if (project.kind === "blueprints") {
    return "blueprints";
  }
  if (project.kind === "workshop") {
    return "hideout";
  }
  if (project.kind === "project" && !isExpeditionProjectSlug(project.slug)) {
    return "projects";
  }
  return null;
};

export const filterProjectsByCategory = <
  T extends Pick<ProjectProgress, "kind" | "slug">
>(
  projects: T[],
  category: ProjectDisplayCategory
) =>
  projects.filter(
    (project) => getProjectDisplayCategory(project) === category
  );

export const isUserToggleProject = (
  project: Pick<ProjectProgress, "kind" | "slug">
) => getProjectDisplayCategory(project) === "projects";
