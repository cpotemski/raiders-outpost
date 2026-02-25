import { loadArcItems } from "@/lib/arc-items";
import { loadArcProjects } from "@/lib/arc-projects";
import { normalizeLocale } from "@/lib/locale";
import { ensureAdminAccess } from "@/lib/server/admin-auth";
import {
  getAdminSettings,
  updateAdminSettings,
} from "@/lib/server/admin-settings";

export const runtime = "nodejs";

export const GET = async (request: Request) => {
  const access = ensureAdminAccess(request);
  if (!access.allowed) {
    return access.response;
  }

  const url = new URL(request.url);
  const locale = normalizeLocale(url.searchParams.get("locale"));

  const [settings, projectsPayload, itemsPayload] = await Promise.all([
    getAdminSettings(),
    loadArcProjects(locale),
    loadArcItems(locale),
  ]);

  const disabledProjects = new Set(settings.disabledProjectSlugs);
  const disabledItems = new Set(settings.disabledItemIds);

  const projects = projectsPayload.projects.map((project) => ({
    slug: project.slug,
    name: project.name,
    kind: project.kind,
    inactive: disabledProjects.has(project.slug),
  }));

  const items = itemsPayload.items
    .map((item) => {
      const id = item.id ?? item.imageFile ?? "";
      if (!id) return null;
      return {
        id,
        name: item.name,
        itemType: item.itemType,
        rarity: item.rarity,
        imageFile: item.imageFile ?? null,
        inactive: disabledItems.has(id),
        easy: settings.easyItemIds.includes(id),
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  return Response.json({
    disabledProjectSlugs: settings.disabledProjectSlugs,
    disabledItemIds: settings.disabledItemIds,
    easyItemIds: settings.easyItemIds,
    projects,
    items,
  });
};

export const PATCH = async (request: Request) => {
  const access = ensureAdminAccess(request);
  if (!access.allowed) {
    return access.response;
  }

  const body = await request.json().catch(() => null);
  const disabledProjectSlugs = Array.isArray(body?.disabledProjectSlugs)
    ? body.disabledProjectSlugs.filter((value: unknown) => typeof value === "string")
    : undefined;
  const disabledItemIds = Array.isArray(body?.disabledItemIds)
    ? body.disabledItemIds.filter((value: unknown) => typeof value === "string")
    : undefined;
  const easyItemIds = Array.isArray(body?.easyItemIds)
    ? body.easyItemIds.filter((value: unknown) => typeof value === "string")
    : undefined;

  const settings = await updateAdminSettings({
    disabledProjectSlugs,
    disabledItemIds,
    easyItemIds,
  });

  return Response.json(settings);
};
