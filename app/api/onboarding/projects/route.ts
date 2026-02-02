import { loadArcProjects } from "@/lib/arc-projects";
import { normalizeLocale } from "@/lib/locale";
import { isExpeditionProjectSlug } from "@/lib/expeditions";
import { applyAdminProjectFilters, getAdminSettings } from "@/lib/server/admin-settings";

export const runtime = "nodejs";

export const GET = async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const locale = normalizeLocale(searchParams.get("locale"));
  const [payload, settings] = await Promise.all([
    loadArcProjects(locale),
    getAdminSettings(),
  ]);
  const filteredPayload = applyAdminProjectFilters(payload, settings);

  const projects = filteredPayload.projects
    .filter((project) => project.kind !== "blueprints")
    .map((project) => {
      const stages = project.stages
        .map((stage) => ({
          stageKey: stage.stageKey,
          name: stage.name,
          sortOrder: stage.sortOrder,
          itemCount: stage.items.length,
        }))
        .filter((stage) => stage.itemCount > 0);

      return {
        slug: project.slug,
        name: project.name,
        kind: project.kind,
        isExpedition: isExpeditionProjectSlug(project.slug),
        stages,
      };
    })
    .filter((project) => project.stages.length > 0);

  return Response.json({ projects });
};
