import { prisma } from "@/lib/prisma";
import { loadArcProjects } from "@/lib/arc-projects";
import { normalizeLocale } from "@/lib/locale";
import { applyAdminProjectFilters, getAdminSettings } from "@/lib/server/admin-settings";
import { ensureProjects } from "@/lib/server/projects";
import { getTokenFromRequest } from "@/lib/server/requests";
import {
  getAvailableExpeditionSlug,
  isExpeditionProjectSlug,
  sanitizeCompletedExpeditionSlugs,
} from "@/lib/expeditions";
import { getExpeditionResetWindow } from "@/lib/expedition-reset";

export const runtime = "nodejs";

type ResetRequestBody = {
  mode?: "dismiss" | "reset";
  locale?: string;
};

export const POST = async (request: Request) => {
  const token = getTokenFromRequest(request);
  if (!token) {
    return Response.json({ error: "Missing token" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as ResetRequestBody | null;
  const mode = body?.mode;

  if (mode !== "dismiss" && mode !== "reset") {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { token },
    select: {
      id: true,
      activeExpeditionSlug: true,
      completedExpeditionSlugs: true,
      inactiveProjectSlugs: true,
    },
  });

  if (!user) {
    return Response.json({ error: "Unknown token" }, { status: 404 });
  }

  const locale = normalizeLocale(body?.locale ?? null);
  const [projectsPayload, settings] = await Promise.all([
    loadArcProjects(locale),
    getAdminSettings(),
  ]);
  const expeditionReset = getExpeditionResetWindow(projectsPayload.projects);

  if (mode === "dismiss" && !expeditionReset) {
    return Response.json({ error: "No active expedition reset cycle" }, { status: 409 });
  }

  if (mode === "dismiss") {
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        expeditionResetDismissedCycle: expeditionReset!.cycleId,
      },
      select: {
        activeExpeditionSlug: true,
        expeditionResetDismissedCycle: true,
        expeditionResetCompletedCycle: true,
      },
    });

    return Response.json({
      activeExpeditionSlug: updated.activeExpeditionSlug ?? null,
      dismissed:
        updated.expeditionResetDismissedCycle === expeditionReset!.cycleId,
      completed:
        updated.expeditionResetCompletedCycle === expeditionReset!.cycleId,
    });
  }

  await ensureProjects(projectsPayload);

  const filteredPayload = applyAdminProjectFilters(projectsPayload, settings);
  const resetProjectSlugs = filteredPayload.projects
    .filter(
      (project) => project.kind === "workshop" || project.kind === "blueprints"
    )
    .map((project) => project.slug);

  const expeditionSlugs = filteredPayload.projects
    .filter((project) => isExpeditionProjectSlug(project.slug))
    .map((project) => project.slug);

  const completedSet = new Set(
    sanitizeCompletedExpeditionSlugs(
      user.completedExpeditionSlugs ?? [],
      expeditionSlugs
    )
  );
  if (
    user.activeExpeditionSlug &&
    expeditionSlugs.includes(user.activeExpeditionSlug)
  ) {
    completedSet.add(user.activeExpeditionSlug);
  }
  const nextCompletedExpeditionSlugs = sanitizeCompletedExpeditionSlugs(
    Array.from(completedSet),
    expeditionSlugs
  );
  const nextExpeditionSlug = getAvailableExpeditionSlug(
    nextCompletedExpeditionSlugs,
    expeditionSlugs
  );
  const nextInactiveProjectSlugs = new Set(user.inactiveProjectSlugs ?? []);
  if (nextExpeditionSlug) {
    nextInactiveProjectSlugs.delete(nextExpeditionSlug);
  }

  const projectItems = await prisma.projectItem.findMany({
    where: {
      stage: {
        project: {
          slug: { in: resetProjectSlugs },
        },
      },
    },
    select: { id: true },
  });

  await prisma.$transaction(async (tx) => {
    const projectItemIds = projectItems.map((item) => item.id);
    if (projectItemIds.length) {
      await tx.userProjectItem.deleteMany({
        where: {
          userId: user.id,
          projectItemId: {
            in: projectItemIds,
          },
        },
      });
    }

    await tx.user.update({
      where: { id: user.id },
      data: {
        activeExpeditionSlug: nextExpeditionSlug,
        completedExpeditionSlugs: nextCompletedExpeditionSlugs,
        inactiveProjectSlugs: Array.from(nextInactiveProjectSlugs).sort((a, b) =>
          a.localeCompare(b)
        ),
        ...(expeditionReset
          ? {
              expeditionResetCompletedCycle: expeditionReset.cycleId,
              expeditionResetDismissedCycle: expeditionReset.cycleId,
            }
          : {}),
      },
    });
  });

  return Response.json({
    activeExpeditionSlug: nextExpeditionSlug,
    completed: true,
  });
};
