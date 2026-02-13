"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useProjectProgress } from "@/hooks/useProjectProgress";
import { useLocale } from "@/components/locale/LocaleProvider";
import type { ProjectProgress } from "@/types/projects";
import { isExpeditionProjectSlug } from "@/lib/expeditions";

type ProjectContextValue = {
  loading: boolean;
  allProjects: ProjectProgress[];
  projects: ProjectProgress[];
  selectedProject: ProjectProgress | null;
  selectedSlug: string | null;
  setSelectedSlug: (slug: string) => void;
  activeExpeditionSlug: string | null;
  expeditionReset: {
    cycleId: string;
    noticeStartIso: string;
    noticeEndIso: string;
    noticeActive: boolean;
    dismissed: boolean;
    completed: boolean;
    showNotice: boolean;
  } | null;
  updateItemQuantity: (projectItemId: string, nextQuantity: number) => void;
  refreshProjects: () => void;
};

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const { locale, ready: localeReady } = useLocale();
  const {
    loading,
    projects,
    activeExpeditionSlug,
    expeditionReset,
    updateItemQuantity,
    refresh,
  } = useProjectProgress(locale, localeReady);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  const visibleProjects = useMemo(() => {
    if (!activeExpeditionSlug) {
      return projects.filter(
        (project) => !isExpeditionProjectSlug(project.slug)
      );
    }
    return projects.filter((project) => {
      if (!isExpeditionProjectSlug(project.slug)) return true;
      return project.slug === activeExpeditionSlug;
    });
  }, [activeExpeditionSlug, projects]);

  useEffect(() => {
    if (!visibleProjects.length) return;
    setSelectedSlug((prev) => {
      if (prev && visibleProjects.some((project) => project.slug === prev)) {
        return prev;
      }
      const blueprint = visibleProjects.find(
        (project) => project.kind === "blueprints"
      );
      return blueprint?.slug ?? visibleProjects[0]?.slug ?? null;
    });
  }, [visibleProjects]);

  const selectedProject = useMemo(() => {
    return visibleProjects.find((project) => project.slug === selectedSlug) ?? null;
  }, [selectedSlug, visibleProjects]);

  const value = useMemo<ProjectContextValue>(
    () => ({
      loading,
      allProjects: projects,
      projects: visibleProjects,
      selectedProject,
      selectedSlug,
      setSelectedSlug,
      activeExpeditionSlug,
      expeditionReset: expeditionReset ?? null,
      updateItemQuantity,
      refreshProjects: refresh,
    }),
    [
      loading,
      projects,
      visibleProjects,
      selectedProject,
      selectedSlug,
      activeExpeditionSlug,
      expeditionReset,
      updateItemQuantity,
      refresh,
    ]
  );

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}

export const useProjectContext = () => {
  const ctx = useContext(ProjectContext);
  if (!ctx) {
    throw new Error("useProjectContext must be used within ProjectProvider");
  }
  return ctx;
};
