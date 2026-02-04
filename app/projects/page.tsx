"use client";

import { useMemo } from "react";
import { useProjectContext } from "@/components/projects/ProjectContext";
import { useLabels } from "@/components/locale/useLabels";
import { ProjectCardSection } from "@/components/projects/ProjectCardSection";
import {
  getProjectCards,
  splitProjectCards,
} from "@/components/projects/projectCards";

export default function ProjectsPage() {
  const { projects, loading } = useProjectContext();
  const labels = useLabels();

  const projectCards = useMemo(() => getProjectCards(projects), [projects]);
  const { pending: pendingProjects, completed: completedProjects } =
    useMemo(() => splitProjectCards(projectCards), [projectCards]);

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
              <ProjectCardSection
                title={labels.activeProject}
                countLabel={`${labels.activeProject}: ${pendingProjects.length}`}
                cards={pendingProjects}
                emptyLabel={labels.noSignalPendingQueue}
                testId="project-list"
              />
              <ProjectCardSection
                title={labels.archived}
                countLabel={`${labels.archived}: ${completedProjects.length}`}
                cards={completedProjects}
                emptyLabel={labels.noArchivedSignal}
                testId="project-list-completed"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
