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
    .filter((project) => isExpeditionProjectSlug(project.slug))
    .filter((project) => project.stages.some((stage) => stage.items.length > 0))
    .map((project) => ({
      slug: project.slug,
      name: project.name,
    }));

  return Response.json({ projects });
};
