"use client";

import { useProjectContext } from "@/components/projects/ProjectContext";
import { useLabels } from "@/components/locale/useLabels";
import { filterProjectsByCategory } from "@/lib/project-categories";
import { ProjectSelectionPanel } from "@/components/projects/ProjectSelectionPanel";

export default function HideoutPage() {
  const { projects, loading } = useProjectContext();
  const labels = useLabels();
  const hideoutProjects = filterProjectsByCategory(projects, "hideout");

  return (
    <div className="flex flex-col gap-4">
      <ProjectSelectionPanel
        title={labels.navHideout}
        projects={hideoutProjects}
        loading={loading}
        testIdPrefix="hideout"
        getHref={(project) => `/projects/${project.slug}?from=hideout`}
      />
    </div>
  );
}
