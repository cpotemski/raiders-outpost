import {
  getProjectProgress,
  updateProjectItems,
  updateUserInactiveProjectSlugs,
} from "@/lib/server/projects";
import { getTokenFromRequest } from "@/lib/server/requests";
import { getUserIdByToken } from "@/lib/server/users";
import { normalizeLocale } from "@/lib/locale";

export const runtime = "nodejs";

export const GET = async (request: Request) => {
  const token = getTokenFromRequest(request);
  if (!token) {
    return Response.json({ error: "Missing token" }, { status: 401 });
  }

  const user = await getUserIdByToken(token);

  if (!user) {
    return Response.json({ error: "Unknown token" }, { status: 404 });
  }

  const url = new URL(request.url);
  const locale = normalizeLocale(url.searchParams.get("locale"));
  const payload = await getProjectProgress(user.id, locale);

  return Response.json(payload);
};

export const PATCH = async (request: Request) => {
  const token = getTokenFromRequest(request);
  if (!token) {
    return Response.json({ error: "Missing token" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const updates = Array.isArray(body?.updates)
    ? body.updates
        .map((entry: unknown) => {
          if (!entry || typeof entry !== "object") return null;
          const record = entry as {
            projectItemId?: unknown;
            quantityOwned?: unknown;
          };
          if (typeof record.projectItemId !== "string") return null;
          if (typeof record.quantityOwned !== "number") return null;
          return {
            projectItemId: record.projectItemId,
            quantityOwned: Math.floor(record.quantityOwned),
          };
        })
        .filter(
          (
            entry: { projectItemId: string; quantityOwned: number } | null
          ): entry is { projectItemId: string; quantityOwned: number } =>
            Boolean(entry)
        )
    : null;
  const inactiveProjectSlugs = Array.isArray(body?.inactiveProjectSlugs)
    ? body.inactiveProjectSlugs
        .filter((entry: unknown): entry is string => typeof entry === "string")
        .map((entry: string) => entry.trim())
        .filter(Boolean)
    : null;

  if (!updates?.length && !inactiveProjectSlugs) {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }

  const user = await getUserIdByToken(token);

  if (!user) {
    return Response.json({ error: "Unknown token" }, { status: 404 });
  }

  const url = new URL(request.url);
  const locale = normalizeLocale(url.searchParams.get("locale"));
  const [updatesPayload, inactiveSlugsPayload] = await Promise.all([
    updates?.length ? updateProjectItems(user.id, updates) : Promise.resolve([]),
    inactiveProjectSlugs
      ? updateUserInactiveProjectSlugs(user.id, inactiveProjectSlugs, locale)
      : Promise.resolve(null),
  ]);

  return Response.json({
    updates: updatesPayload,
    inactiveProjectSlugs: inactiveSlugsPayload,
  });
};
