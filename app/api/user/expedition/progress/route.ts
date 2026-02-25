import { loadArcProjects } from "@/lib/arc-projects";
import {
  getAvailableExpeditionSlug,
  isExpeditionProjectSlug,
  sanitizeCompletedExpeditionSlugs,
} from "@/lib/expeditions";
import { normalizeLocale } from "@/lib/locale";
import {
  applyAdminProjectFilters,
  getAdminSettings,
} from "@/lib/server/admin-settings";
import { getTokenFromRequest } from "@/lib/server/requests";
import {
  getUserByToken,
  updateUserExpeditionProgress,
} from "@/lib/server/users";

export const runtime = "nodejs";

const getExpeditionSlugs = async (locale: string) => {
  const [payload, settings] = await Promise.all([
    loadArcProjects(normalizeLocale(locale)),
    getAdminSettings(),
  ]);
  const filtered = applyAdminProjectFilters(payload, settings);
  return filtered.projects
    .filter((project) => isExpeditionProjectSlug(project.slug))
    .filter((project) => project.stages.some((stage) => stage.items.length > 0))
    .map((project) => project.slug);
};

export const GET = async (request: Request) => {
  const token = getTokenFromRequest(request);
  if (!token) {
    return Response.json({ error: "Missing token" }, { status: 401 });
  }

  const user = await getUserByToken(token);
  if (!user) {
    return Response.json({ error: "Unknown token" }, { status: 404 });
  }

  return Response.json({
    activeExpeditionSlug: user.activeExpeditionSlug ?? null,
    completedExpeditionSlugs: user.completedExpeditionSlugs ?? [],
  });
};

export const PUT = async (request: Request) => {
  const token = getTokenFromRequest(request);
  if (!token) {
    return Response.json({ error: "Missing token" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const completedExpeditionSlugs = Array.isArray(body?.completedExpeditionSlugs)
    ? body.completedExpeditionSlugs
        .filter((entry: unknown): entry is string => typeof entry === "string")
        .map((entry: string) => entry.trim())
        .filter(Boolean)
    : null;

  if (!completedExpeditionSlugs) {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }

  const url = new URL(request.url);
  const locale = url.searchParams.get("locale") ?? "de";
  const expeditionSlugs = await getExpeditionSlugs(locale);
  const nextCompletedExpeditionSlugs = sanitizeCompletedExpeditionSlugs(
    completedExpeditionSlugs,
    expeditionSlugs
  );
  const nextActiveExpeditionSlug = getAvailableExpeditionSlug(
    nextCompletedExpeditionSlugs,
    expeditionSlugs
  );

  const updated = await updateUserExpeditionProgress(token, {
    activeExpeditionSlug: nextActiveExpeditionSlug,
    completedExpeditionSlugs: nextCompletedExpeditionSlugs,
  });

  return Response.json({
    activeExpeditionSlug: updated.activeExpeditionSlug ?? null,
    completedExpeditionSlugs: updated.completedExpeditionSlugs ?? [],
  });
};
