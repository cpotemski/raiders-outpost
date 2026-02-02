import { loadArcProjects } from "@/lib/arc-projects";
import { isExpeditionProjectSlug } from "@/lib/expeditions";
import { normalizeLocale } from "@/lib/locale";
import { applyAdminProjectFilters, getAdminSettings } from "@/lib/server/admin-settings";
import { getTokenFromRequest } from "@/lib/server/requests";
import { getUserExpeditionByToken, updateUserExpedition } from "@/lib/server/users";

export const runtime = "nodejs";

const getExpeditionSlugs = async (locale: string) => {
  const [payload, settings] = await Promise.all([
    loadArcProjects(normalizeLocale(locale)),
    getAdminSettings(),
  ]);
  const filtered = applyAdminProjectFilters(payload, settings);
  return new Set(
    filtered.projects
      .filter((project) => isExpeditionProjectSlug(project.slug))
      .map((project) => project.slug)
  );
};

export const GET = async (request: Request) => {
  const token = getTokenFromRequest(request);
  if (!token) {
    return Response.json({ error: "Missing token" }, { status: 401 });
  }

  const user = await getUserExpeditionByToken(token);
  if (!user) {
    return Response.json({ error: "Unknown token" }, { status: 404 });
  }

  return Response.json({
    activeExpeditionSlug: user.activeExpeditionSlug ?? null,
  });
};

export const PUT = async (request: Request) => {
  const token = getTokenFromRequest(request);
  if (!token) {
    return Response.json({ error: "Missing token" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const rawSlug =
    body?.expeditionSlug === null || typeof body?.expeditionSlug === "string"
      ? body.expeditionSlug
      : undefined;

  if (rawSlug === undefined) {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }

  const trimmedSlug = typeof rawSlug === "string" ? rawSlug.trim() : null;
  const nextSlug = trimmedSlug || null;

  if (nextSlug && !isExpeditionProjectSlug(nextSlug)) {
    return Response.json({ error: "Invalid expedition" }, { status: 400 });
  }

  if (nextSlug) {
    const url = new URL(request.url);
    const locale = url.searchParams.get("locale") ?? "en";
    const expeditionSlugs = await getExpeditionSlugs(locale);
    if (!expeditionSlugs.has(nextSlug)) {
      return Response.json({ error: "Unknown expedition" }, { status: 400 });
    }
  }

  const user = await updateUserExpedition(token, nextSlug);
  return Response.json({
    activeExpeditionSlug: user.activeExpeditionSlug ?? null,
  });
};
