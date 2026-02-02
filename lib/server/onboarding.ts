import { prisma } from "@/lib/prisma";
import { loadArcProjects } from "@/lib/arc-projects";
import { ensureProjects } from "@/lib/server/projects";
import { normalizeLocale, type AppLocale } from "@/lib/locale";
import { isExpeditionProjectSlug } from "@/lib/expeditions";
import { getAdminSettings } from "@/lib/server/admin-settings";

type OnboardingBaselineEntry = {
  projectSlug: string;
  completedStageSortOrders: number[];
};

type ApplyOnboardingBaselineInput = {
  userId: string;
  locale?: AppLocale | string | null;
  baseline?: OnboardingBaselineEntry[] | null;
  expeditionNext?: string | null;
};

export const applyOnboardingBaseline = async ({
  userId,
  locale,
  baseline,
  expeditionNext,
}: ApplyOnboardingBaselineInput) => {
  const normalizedLocale = normalizeLocale(
    typeof locale === "string" ? locale : locale ?? null
  );
  const selectedStagesByProject = new Map<string, Set<number>>();

  for (const entry of baseline ?? []) {
    if (!entry?.projectSlug || !Array.isArray(entry.completedStageSortOrders)) {
      continue;
    }
    const set = selectedStagesByProject.get(entry.projectSlug) ?? new Set();
    entry.completedStageSortOrders.forEach((stage) => {
      if (Number.isFinite(stage)) {
        set.add(Number(stage));
      }
    });
    if (set.size) {
      selectedStagesByProject.set(entry.projectSlug, set);
    }
  }

  if (!selectedStagesByProject.size && !expeditionNext) {
    return;
  }

  const projectsPayload = await loadArcProjects(normalizedLocale);
  const projectRecords = await ensureProjects(projectsPayload);
  const settings = await getAdminSettings();
  const disabledProjects = new Set(settings.disabledProjectSlugs);
  const disabledItems = new Set(settings.disabledItemIds);
  const projectBySlug = new Map(
    projectRecords.map((project) => [project.slug, project])
  );

  const itemsToUpdate = new Map<string, number>();

  for (const [slug, stages] of selectedStagesByProject.entries()) {
    if (disabledProjects.has(slug)) continue;
    const project = projectBySlug.get(slug);
    if (!project) continue;
    for (const stage of project.stages) {
      if (!stages.has(stage.sortOrder)) continue;
      for (const item of stage.items) {
        if (disabledItems.has(item.itemName)) continue;
        if (item.quantityRequired <= 0) continue;
        itemsToUpdate.set(item.id, item.quantityRequired);
      }
    }
  }

  const validExpeditionNext =
    expeditionNext && isExpeditionProjectSlug(expeditionNext)
      ? projectBySlug.has(expeditionNext)
        ? disabledProjects.has(expeditionNext)
          ? null
          : expeditionNext
        : null
      : null;

  await prisma.$transaction(async (tx) => {
    for (const [projectItemId, quantityRequired] of itemsToUpdate.entries()) {
      await tx.userProjectItem.upsert({
        where: {
          userId_projectItemId: {
            userId,
            projectItemId,
          },
        },
        create: {
          userId,
          projectItemId,
          quantityOwned: quantityRequired,
        },
        update: {
          quantityOwned: quantityRequired,
        },
      });
    }

    if (validExpeditionNext) {
      await tx.user.update({
        where: { id: userId },
        data: { activeExpeditionSlug: validExpeditionNext },
      });
    }
  });
};
