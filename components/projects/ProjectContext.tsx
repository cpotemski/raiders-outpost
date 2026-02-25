"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useProjectProgress } from "@/hooks/useProjectProgress";
import { useLocale } from "@/components/locale/LocaleProvider";
import { useLocalIdentity } from "@/components/auth/useLocalIdentity";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import type { ProjectProgress } from "@/types/projects";
import { isExpeditionProjectSlug } from "@/lib/expeditions";
import { isUserToggleProject } from "@/lib/project-categories";

type ProjectContextValue = {
  loading: boolean;
  allProjects: ProjectProgress[];
  projects: ProjectProgress[];
  inactiveProjectSlugs: string[];
  projectVisibilityHydrated: boolean;
  selectedProject: ProjectProgress | null;
  selectedSlug: string | null;
  setSelectedSlug: (slug: string) => void;
  toggleProjectActive: (slug: string) => void;
  isProjectActive: (slug: string) => boolean;
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
  const { identity } = useLocalIdentity();
  const {
    loading,
    projects,
    activeExpeditionSlug,
    expeditionReset,
    updateItemQuantity,
    refresh,
  } = useProjectProgress(locale, localeReady);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const inactiveProjectsStorageKey = identity?.token
    ? `arc:projects:inactive:${identity.token}`
    : undefined;
  const [inactiveProjectSlugs, setInactiveProjectSlugs, projectVisibilityHydrated] =
    useLocalStorageState<string[]>(inactiveProjectsStorageKey, [], {
      deserialize: (raw) => {
        try {
          const parsed = JSON.parse(raw);
          return Array.isArray(parsed)
            ? parsed.filter((entry): entry is string => typeof entry === "string")
            : [];
        } catch {
          return [];
        }
      },
      serialize: (value) => JSON.stringify(value),
    });

  const projectsWithExpeditionFilter = useMemo(() => {
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
  const inactiveProjectSlugSet = useMemo(
    () => new Set(inactiveProjectSlugs),
    [inactiveProjectSlugs]
  );
  const visibleProjects = useMemo(
    () =>
      projectsWithExpeditionFilter.filter((project) => {
        if (!isUserToggleProject(project)) {
          return true;
        }
        return !inactiveProjectSlugSet.has(project.slug);
      }),
    [inactiveProjectSlugSet, projectsWithExpeditionFilter]
  );

  const toggleProjectActive = useCallback((slug: string) => {
    setInactiveProjectSlugs((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      return Array.from(next);
    });
  }, [setInactiveProjectSlugs]);

  const isProjectActive = useCallback(
    (slug: string) => !inactiveProjectSlugSet.has(slug),
    [inactiveProjectSlugSet]
  );

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
      inactiveProjectSlugs,
      projectVisibilityHydrated,
      selectedProject,
      selectedSlug,
      setSelectedSlug,
      toggleProjectActive,
      isProjectActive,
      activeExpeditionSlug,
      expeditionReset: expeditionReset ?? null,
      updateItemQuantity,
      refreshProjects: refresh,
    }),
    [
      loading,
      projects,
      visibleProjects,
      inactiveProjectSlugs,
      projectVisibilityHydrated,
      selectedProject,
      selectedSlug,
      toggleProjectActive,
      isProjectActive,
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
