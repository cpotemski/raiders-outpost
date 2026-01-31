"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useProjectProgress } from "@/hooks/useProjectProgress";
import type { ProjectProgress } from "@/types/projects";

type ProjectContextValue = {
  loading: boolean;
  projects: ProjectProgress[];
  selectedProject: ProjectProgress | null;
  selectedSlug: string | null;
  setSelectedSlug: (slug: string) => void;
  memberCount: number;
  communityCountsByItemId: Record<string, number>;
  updateItemQuantity: (projectItemId: string, nextQuantity: number) => void;
};

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const {
    loading,
    projects,
    memberCount,
    communityCountsByItemId,
    updateItemQuantity,
  } = useProjectProgress();
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  useEffect(() => {
    if (!projects.length) return;
    setSelectedSlug((prev) => {
      if (prev) return prev;
      const blueprint = projects.find((project) => project.kind === "blueprints");
      return blueprint?.slug ?? projects[0]?.slug ?? null;
    });
  }, [projects]);

  const selectedProject = useMemo(() => {
    return projects.find((project) => project.slug === selectedSlug) ?? null;
  }, [projects, selectedSlug]);

  const value = useMemo<ProjectContextValue>(
    () => ({
      loading,
      projects,
      selectedProject,
      selectedSlug,
      setSelectedSlug,
      memberCount,
      communityCountsByItemId,
      updateItemQuantity,
    }),
    [
      loading,
      projects,
      selectedProject,
      selectedSlug,
      memberCount,
      communityCountsByItemId,
      updateItemQuantity,
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
