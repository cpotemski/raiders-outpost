import { generateUserToken } from "@/lib/server/auth";
import { applyOnboardingBaseline } from "@/lib/server/onboarding";
import { loadArcProjects } from "@/lib/arc-projects";
import { isExpeditionProjectSlug } from "@/lib/expeditions";
import { normalizeLocale } from "@/lib/locale";
import { applyAdminProjectFilters, getAdminSettings } from "@/lib/server/admin-settings";
import {
  getUserByToken,
  updateUserExpedition,
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
  const baseline = Array.isArray(body?.baseline) ? body.baseline : null;
  const activeExpeditionSlug =
    body?.activeExpeditionSlug === null || typeof body?.activeExpeditionSlug === "string"
      ? body.activeExpeditionSlug
      : null;

  if (create) {
    if (!name) {
      return Response.json({ error: "Invalid payload" }, { status: 400 });
    }
    let nextActiveExpeditionSlug: string | null = null;
    if (typeof activeExpeditionSlug === "string" && activeExpeditionSlug) {
      if (!isExpeditionProjectSlug(activeExpeditionSlug)) {
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
      const validExpeditionSlugs = new Set(
        filteredPayload.projects
          .filter((project) => isExpeditionProjectSlug(project.slug))
          .filter((project) => project.stages.some((stage) => stage.items.length > 0))
          .map((project) => project.slug)
      );
      if (!validExpeditionSlugs.has(activeExpeditionSlug)) {
        return Response.json({ error: "Invalid payload" }, { status: 400 });
      }
      nextActiveExpeditionSlug = activeExpeditionSlug;
    }
    const nextToken = token || generateUserToken();
    let user = await upsertUserWithToken(name, nextToken);
    if (user.activeExpeditionSlug !== nextActiveExpeditionSlug) {
      await updateUserExpedition(user.token, nextActiveExpeditionSlug);
      const refreshedUser = await getUserByToken(user.token);
      if (refreshedUser) {
        user = refreshedUser;
      }
    }
    await applyOnboardingBaseline({
      userId: user.id,
      locale,
      baseline,
    });
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
