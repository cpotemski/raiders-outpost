import { prisma } from "@/lib/prisma";
import { loadArcProjects } from "@/lib/arc-projects";
import { normalizeLocale } from "@/lib/locale";
import { applyAdminProjectFilters, getAdminSettings } from "@/lib/server/admin-settings";
import { ensureProjects } from "@/lib/server/projects";
import { getTokenFromRequest } from "@/lib/server/requests";
import { getNextExpeditionSlug, isExpeditionProjectSlug } from "@/lib/expeditions";
import { EXPEDITION_RESET_CYCLE_ID } from "@/lib/expedition-reset";

export const runtime = "nodejs";

type ResetRequestBody = {
  mode?: "dismiss" | "reset";
  startNextExpedition?: boolean;
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
    },
  });

  if (!user) {
    return Response.json({ error: "Unknown token" }, { status: 404 });
  }

  if (mode === "dismiss") {
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        expeditionResetDismissedCycle: EXPEDITION_RESET_CYCLE_ID,
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
        updated.expeditionResetDismissedCycle === EXPEDITION_RESET_CYCLE_ID,
      completed:
        updated.expeditionResetCompletedCycle === EXPEDITION_RESET_CYCLE_ID,
    });
  }

  const locale = normalizeLocale(body?.locale ?? null);
  const [projectsPayload, settings] = await Promise.all([
    loadArcProjects(locale),
    getAdminSettings(),
  ]);

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

  const startNextExpedition = body?.startNextExpedition === true;
  const nextExpeditionSlug = startNextExpedition
    ? getNextExpeditionSlug(user.activeExpeditionSlug ?? null, expeditionSlugs)
    : null;

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
        expeditionResetCompletedCycle: EXPEDITION_RESET_CYCLE_ID,
        expeditionResetDismissedCycle: EXPEDITION_RESET_CYCLE_ID,
      },
    });
  });

  return Response.json({
    activeExpeditionSlug: nextExpeditionSlug,
    completed: true,
  });
};
