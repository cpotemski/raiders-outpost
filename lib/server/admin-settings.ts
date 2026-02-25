import type { ArcItemPayload } from "@/lib/arc-items";
import type { ArcProjectPayload } from "@/lib/arc-projects";
import { prisma } from "@/lib/prisma";

const SETTINGS_ID = "global";

const normalizeList = (values?: string[] | null) => {
  if (!values) return [];
  const unique = new Set(
    values
      .map((value) => value.trim())
      .filter((value) => value.length > 0)
  );
  return Array.from(unique).sort((a, b) => a.localeCompare(b));
};

type AdminSettingsPayload = {
  disabledProjectSlugs: string[];
  disabledItemIds: string[];
  easyItemIds: string[];
};

export const getAdminSettings = async () => {
  let settings: { disabledProjectSlugs: string[]; disabledItemIds: string[] } | null =
    null;
  let easyItems: { itemId: string }[] = [];

  try {
    [settings, easyItems] = await Promise.all([
      prisma.adminSettings.findUnique({
        where: { id: SETTINGS_ID },
        select: {
          disabledProjectSlugs: true,
          disabledItemIds: true,
        },
      }),
      prisma.easyItemFilter.findMany({
        select: { itemId: true },
      }),
    ]);
  } catch (err) {
    const error = err as { code?: string; message?: string };
    if (error?.code !== "P2021") {
      throw err;
    }
  }

  return {
    disabledProjectSlugs: normalizeList(settings?.disabledProjectSlugs ?? []),
    disabledItemIds: normalizeList(settings?.disabledItemIds ?? []),
    easyItemIds: normalizeList(easyItems.map((entry) => entry.itemId)),
  } satisfies AdminSettingsPayload;
};

export const updateAdminSettings = async (input: {
  disabledProjectSlugs?: string[] | null;
  disabledItemIds?: string[] | null;
  easyItemIds?: string[] | null;
}) => {
  const nextDisabledProjectSlugs = Array.isArray(input.disabledProjectSlugs)
    ? normalizeList(input.disabledProjectSlugs)
    : undefined;
  const nextDisabledItemIds = Array.isArray(input.disabledItemIds)
    ? normalizeList(input.disabledItemIds)
    : undefined;
  const nextEasyItemIds = Array.isArray(input.easyItemIds)
    ? normalizeList(input.easyItemIds)
    : undefined;

  const current = await getAdminSettings();

  const disabledProjectSlugs =
    nextDisabledProjectSlugs ?? current.disabledProjectSlugs;
  const disabledItemIds = nextDisabledItemIds ?? current.disabledItemIds;
  let easyItemIds = nextEasyItemIds ?? current.easyItemIds;

  const settings = await prisma.$transaction(async (tx) => {
    const updatedSettings = await tx.adminSettings.upsert({
      where: { id: SETTINGS_ID },
      update: { disabledProjectSlugs, disabledItemIds },
      create: {
        id: SETTINGS_ID,
        disabledProjectSlugs,
        disabledItemIds,
      },
      select: {
        disabledProjectSlugs: true,
        disabledItemIds: true,
      },
    });

    if (nextEasyItemIds !== undefined) {
      try {
        await tx.easyItemFilter.deleteMany({});
        if (nextEasyItemIds.length) {
          await tx.easyItemFilter.createMany({
            data: nextEasyItemIds.map((itemId) => ({ itemId })),
          });
        }
      } catch (err) {
        const error = err as { code?: string };
        if (error.code !== "P2021") {
          throw err;
        }
        easyItemIds = current.easyItemIds;
      }
    }

    return updatedSettings;
  });

  return {
    disabledProjectSlugs: normalizeList(settings.disabledProjectSlugs ?? []),
    disabledItemIds: normalizeList(settings.disabledItemIds ?? []),
    easyItemIds,
  };
};

export const applyAdminProjectFilters = (
  payload: ArcProjectPayload,
  settings: Awaited<ReturnType<typeof getAdminSettings>>
) => {
  const disabledProjects = new Set(settings.disabledProjectSlugs);
  const disabledItems = new Set(settings.disabledItemIds);

  const projects = payload.projects
    .filter((project) => !disabledProjects.has(project.slug))
    .map((project) => {
      const stages = project.stages
        .map((stage) => ({
          ...stage,
          items: stage.items.filter(
            (item) => !disabledItems.has(item.itemId)
          ),
        }))
        .filter((stage) => stage.items.length > 0);

      if (!stages.length) {
        return null;
      }

      return {
        ...project,
        stages,
      };
    })
    .filter((project): project is NonNullable<typeof project> => Boolean(project));

  return {
    ...payload,
    projects,
  };
};

export const applyAdminItemFilters = (
  payload: ArcItemPayload,
  settings: Awaited<ReturnType<typeof getAdminSettings>>
) => {
  const disabledItems = new Set(settings.disabledItemIds);
  return {
    ...payload,
    items: payload.items.filter((item) => {
      const id = item.id ?? item.imageFile ?? "";
      if (!id) return false;
      return !disabledItems.has(id);
    }),
  };
};
