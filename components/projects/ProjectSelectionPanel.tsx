"use client";

import { useMemo, type ReactNode } from "react";
import type { ProjectProgress } from "@/types/projects";
import { useLabels } from "@/components/locale/useLabels";
import {
  type ProjectCardData,
  getProjectCards,
} from "@/components/projects/projectCards";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { Panel } from "@/components/ui/Panel";
import { EmptyState } from "@/components/ui/EmptyState";

type ProjectSelectionPanelProps = {
  title: string;
  projects: ProjectProgress[];
  loading: boolean;
  testIdPrefix: string;
  controls?: ReactNode;
  getHref?: (project: ProjectProgress) => string;
  cards?: ProjectCardData[];
};

export function ProjectSelectionPanel({
  title,
  projects,
  loading,
  testIdPrefix,
  controls,
  getHref,
  cards,
}: ProjectSelectionPanelProps) {
  const labels = useLabels();
  const projectCards = useMemo(
    () => cards ?? getProjectCards(projects, getHref),
    [cards, getHref, projects]
  );

  return (
    <Panel className="overflow-hidden">
      <div className="arc-panel-header">
        <div>
          <p className="hud-label text-sm font-semibold tracking-[0.14em]">
            {title}
          </p>
        </div>
      </div>
      <div className="border-t border-frame2 bg-panel/70 px-2 py-4">
        {controls}
        {loading && !projects.length ? (
          <EmptyState>
            {labels.scanningProjectCache}
          </EmptyState>
        ) : (
          <div
            className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
            data-testid={`${testIdPrefix}-list`}
          >
            {projectCards.length ? (
              projectCards.map((card) => (
                <ProjectCard key={card.project.slug} {...card} />
              ))
            ) : (
              <EmptyState className="col-span-full">
                {labels.noProjectData}
              </EmptyState>
            )}
          </div>
        )}
      </div>
    </Panel>
  );
}
