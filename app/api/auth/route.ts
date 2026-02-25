import { generateUserToken } from "@/lib/server/auth";
import { loadArcProjects } from "@/lib/arc-projects";
import {
  getAvailableExpeditionSlug,
  isExpeditionProjectSlug,
  sanitizeCompletedExpeditionSlugs,
} from "@/lib/expeditions";
import { normalizeLocale } from "@/lib/locale";
import { applyAdminProjectFilters, getAdminSettings } from "@/lib/server/admin-settings";
import { updateUserInactiveProjectSlugs } from "@/lib/server/projects";
import {
  getUserByToken,
  updateUserExpeditionProgress,
  updateUserName,
  upsertUserWithToken,
} from "@/lib/server/users";

export const runtime = "nodejs";

export const POST = async (request: Request) => {
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const token = typeof body?.token === "string" ? body.token.trim() : "";
  const create = body?.create === true;
  const locale = body?.locale;
  const inactiveProjectSlugs = Array.isArray(body?.inactiveProjectSlugs)
    ? body.inactiveProjectSlugs
        .filter((entry: unknown): entry is string => typeof entry === "string")
        .map((entry: string) => entry.trim())
        .filter(Boolean)
    : null;
  const completedExpeditionSlugs = Array.isArray(body?.completedExpeditionSlugs)
    ? body.completedExpeditionSlugs
        .filter((entry: unknown): entry is string => typeof entry === "string")
        .map((entry: string) => entry.trim())
        .filter(Boolean)
    : null;

  if (create) {
    if (!name) {
      return Response.json({ error: "Invalid payload" }, { status: 400 });
    }
    const normalizedLocale = normalizeLocale(
      typeof locale === "string" ? locale : null
    );
    const [payload, settings] = await Promise.all([
      loadArcProjects(normalizedLocale),
      getAdminSettings(),
    ]);
    const filteredPayload = applyAdminProjectFilters(payload, settings);
    const expeditionSlugs = filteredPayload.projects
      .filter((project) => isExpeditionProjectSlug(project.slug))
      .filter((project) => project.stages.some((stage) => stage.items.length > 0))
      .map((project) => project.slug);

    let nextCompletedExpeditionSlugs = sanitizeCompletedExpeditionSlugs(
      completedExpeditionSlugs ?? [],
      expeditionSlugs
    );
    let nextActiveExpeditionSlug: string | null =
      completedExpeditionSlugs !== null
        ? getAvailableExpeditionSlug(nextCompletedExpeditionSlugs, expeditionSlugs)
        : null;

    const nextToken = token || generateUserToken();
    let user = await upsertUserWithToken(name, nextToken);
    user = await updateUserExpeditionProgress(user.token, {
      activeExpeditionSlug: nextActiveExpeditionSlug,
      completedExpeditionSlugs: nextCompletedExpeditionSlugs,
    });
    if (!user) {
      const refreshedUser = await getUserByToken(nextToken);
      if (refreshedUser) user = refreshedUser;
    }
    await (inactiveProjectSlugs
      ? updateUserInactiveProjectSlugs(
          user.id,
          inactiveProjectSlugs,
          normalizeLocale(typeof locale === "string" ? locale : null)
        )
      : Promise.resolve(null));
    return Response.json({ user });
  }

  if (!token) {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }

  let user = await getUserByToken(token);

  if (!user) {
    return Response.json({ error: "Unknown token" }, { status: 404 });
  }

  if (name && name !== user.name) {
    user = await updateUserName(token, name);
  }

  return Response.json({ user });
};
