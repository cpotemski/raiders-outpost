import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { loadArcProjects } from "@/lib/arc-projects";
import { loadArcItems } from "@/lib/arc-items";
import { getCommunityForUser } from "@/lib/server/community";
import type { AppLocale } from "@/lib/locale";
import { isExpeditionProjectSlug } from "@/lib/expeditions";
import { applyAdminProjectFilters, getAdminSettings } from "@/lib/server/admin-settings";

type ProjectWithStages = Prisma.ProjectGetPayload<{
  include: { stages: { include: { items: true } } };
}>;

let projectsSeedPromise: Promise<ProjectWithStages[]> | null = null;
let projectsSeedSignature: string | null = null;

const buildPayloadSignature = (
  payload: Awaited<ReturnType<typeof loadArcProjects>>
) => {
  const entries: string[] = [];

  for (const project of payload.projects) {
    entries.push(`project:${project.slug}:${project.stages.length}`);
    for (const stage of project.stages) {
      entries.push(
        `stage:${project.slug}:${stage.sortOrder}:${stage.items.length}`
      );
      if (stage.items.length === 0) {
        entries.push(`stage-empty:${project.slug}:${stage.sortOrder}`);
      }
      for (const item of stage.items) {
        entries.push(
          `item:${project.slug}:${stage.sortOrder}:${item.itemId}:${item.quantityRequired}`
        );
      }
    }
  }

  return entries.sort().join("||");
};

const buildDbSignature = (projects: ProjectWithStages[]) => {
  const entries: string[] = [];

  for (const project of projects) {
    entries.push(`project:${project.slug}:${project.stages.length}`);
    for (const stage of project.stages) {
      entries.push(
        `stage:${project.slug}:${stage.sortOrder}:${stage.items.length}`
      );
      if (stage.items.length === 0) {
        entries.push(`stage-empty:${project.slug}:${stage.sortOrder}`);
      }
      for (const item of stage.items) {
        entries.push(
          `item:${project.slug}:${stage.sortOrder}:${item.itemName}:${item.quantityRequired}`
        );
      }
    }
  }

  return entries.sort().join("||");
};

const seedProjects = async (payload: Awaited<ReturnType<typeof loadArcProjects>>) => {

  for (const projectData of payload.projects) {
    const project = await prisma.project.create({
      data: {
        name: projectData.name,
        slug: projectData.slug,
      },
    });

    if (projectData.stages.length) {
      await prisma.projectStage.createMany({
        data: projectData.stages.map((stage) => ({
          projectId: project.id,
          name: stage.name,
          sortOrder: stage.sortOrder,
        })),
      });

      const stageRecords = await prisma.projectStage.findMany({
        where: { projectId: project.id },
        select: { id: true, sortOrder: true },
      });
      const stageIdBySort = new Map(
        stageRecords.map((stage) => [stage.sortOrder, stage.id])
      );

      for (const stage of projectData.stages) {
        const stageId = stageIdBySort.get(stage.sortOrder);
        if (!stageId || !stage.items.length) continue;
        await prisma.projectItem.createMany({
          data: stage.items.map((item) => ({
            stageId,
            itemName: item.itemId,
            quantityRequired: item.quantityRequired,
          })),
          skipDuplicates: true,
        });
      }
    }
  }
};

export const ensureProjects = async (
  payload?: Awaited<ReturnType<typeof loadArcProjects>>
) => {
  const nextPayload = payload ?? (await loadArcProjects());
  const payloadSignature = buildPayloadSignature(nextPayload);

  if (projectsSeedPromise && projectsSeedSignature === payloadSignature) {
    return projectsSeedPromise;
  }

  projectsSeedSignature = payloadSignature;
  projectsSeedPromise = (async () => {
    const existingProjects = await prisma.project.findMany({
      include: {
        stages: {
          include: { items: true },
        },
      },
    });
    const needsReseed =
      existingProjects.length === 0 ||
      buildDbSignature(existingProjects) !== payloadSignature;

    if (needsReseed) {
      await prisma.$transaction([
        prisma.userProjectItem.deleteMany(),
        prisma.projectItem.deleteMany(),
        prisma.projectStage.deleteMany(),
        prisma.project.deleteMany(),
      ]);
      await seedProjects(nextPayload);
      return prisma.project.findMany({
        include: {
          stages: {
            include: { items: true },
          },
        },
      });
    }

    return existingProjects;
  })();

  return projectsSeedPromise;
};

export const getProjectProgress = async (
  userId: string,
  locale: AppLocale
) => {
  const projectsPayload = await loadArcProjects(locale);
  const settings = await getAdminSettings();
  const filteredPayload = applyAdminProjectFilters(projectsPayload, settings);
  const [arcItems, projectRecords] = await Promise.all([
    loadArcItems(locale),
    ensureProjects(projectsPayload),
  ]);
  const activeUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { activeExpeditionSlug: true },
  });

  const itemMetaById = new Map(
    arcItems.items.map((item) => [
      item.id ?? item.imageFile ?? "",
      {
        imageFile: item.imageFile,
        rarity: item.rarity,
        itemType: item.itemType,
      },
    ])
  );

  const projectItemIdByStage = new Map<string, Map<string, string>>();
  const expeditionSlugs = new Set(
    filteredPayload.projects
      .filter((project) => isExpeditionProjectSlug(project.slug))
      .map((project) => project.slug)
  );
  const projectSlugByItemId = new Map<string, string>();
  const isExpeditionByItemId = new Map<string, boolean>();

  for (const project of projectRecords) {
    const stageMap = new Map<string, string>();
    for (const stage of project.stages) {
      for (const item of stage.items) {
        stageMap.set(`${stage.sortOrder}::${item.itemName}`, item.id);
      }
    }
    projectItemIdByStage.set(project.slug, stageMap);
  }

  const projectItemIds: string[] = [];
  for (const project of filteredPayload.projects) {
    const stageMap = projectItemIdByStage.get(project.slug) ?? new Map();
    for (const stage of project.stages) {
      for (const item of stage.items) {
        const projectItemId = stageMap.get(
          `${stage.sortOrder}::${item.itemId}`
        );
        if (!projectItemId) continue;
        projectItemIds.push(projectItemId);
        projectSlugByItemId.set(projectItemId, project.slug);
        isExpeditionByItemId.set(
          projectItemId,
          expeditionSlugs.has(project.slug)
        );
      }
    }
  }

  const progress = await prisma.userProjectItem.findMany({
    where: {
      userId,
      projectItemId: { in: projectItemIds },
    },
    select: {
      projectItemId: true,
      quantityOwned: true,
    },
  });

  const ownedByItemId = new Map(
    progress.map((entry) => [entry.projectItemId, entry.quantityOwned])
  );

  const community = await getCommunityForUser(userId);
  let memberCount = 0;
  let expeditionMemberCountsBySlug: Record<string, number> = {};
  let communityCountsByItemId: Record<string, number> = {};

  if (community) {
    memberCount = community.members.length;
    const memberIds = community.members.map((member) => member.id);
    expeditionMemberCountsBySlug = community.members.reduce<
      Record<string, number>
    >((acc, member) => {
      const slug = member.activeExpeditionSlug;
      if (slug && expeditionSlugs.has(slug)) {
        acc[slug] = (acc[slug] ?? 0) + 1;
      }
      return acc;
    }, {});
    const memberExpeditionById = new Map(
      community.members.map((member) => [
        member.id,
        member.activeExpeditionSlug ?? null,
      ])
    );

    const requiredByItemId = new Map<string, number>();
    const allowedItemIds = new Set(projectItemIds);
    for (const project of projectRecords) {
      for (const stage of project.stages) {
        for (const item of stage.items) {
          if (allowedItemIds.has(item.id)) {
            requiredByItemId.set(item.id, item.quantityRequired);
          }
        }
      }
    }

    const communityProgress = await prisma.userProjectItem.findMany({
      where: {
        userId: { in: memberIds },
        projectItemId: { in: projectItemIds },
      },
      select: {
        projectItemId: true,
        userId: true,
        quantityOwned: true,
      },
    });

    communityCountsByItemId = communityProgress.reduce<Record<string, number>>(
      (acc, entry) => {
        const required = requiredByItemId.get(entry.projectItemId) ?? 0;
        if (required <= 0 || entry.quantityOwned < required) {
          return acc;
        }
        const isExpedition = isExpeditionByItemId.get(entry.projectItemId);
        if (isExpedition) {
          const itemSlug = projectSlugByItemId.get(entry.projectItemId);
          const memberSlug = memberExpeditionById.get(entry.userId) ?? null;
          if (!itemSlug || memberSlug !== itemSlug) {
            return acc;
          }
        }
        if (required > 0) {
          acc[entry.projectItemId] = (acc[entry.projectItemId] ?? 0) + 1;
        }
        return acc;
      },
      {}
    );
  }

  const projects = filteredPayload.projects.map((project) => {
    const stageIdMap = projectItemIdByStage.get(project.slug) ?? new Map();

    return {
      ...project,
      stages: project.stages.map((stage) => {
        return {
          ...stage,
          name: stage.name,
          items: stage.items.map((item) => {
            const projectItemId =
              stageIdMap.get(`${stage.sortOrder}::${item.itemId}`) ?? "";
            const meta = itemMetaById.get(item.itemId) ?? {
              imageFile: null,
              rarity: "Unknown",
              itemType: "Unknown",
            };
            const isExpedition = expeditionSlugs.has(project.slug);
            return {
              projectItemId,
              projectSlug: project.slug,
              isExpedition,
              itemId: item.itemId,
              displayName: item.displayName,
              quantityRequired: item.quantityRequired,
              quantityOwned: ownedByItemId.get(projectItemId) ?? 0,
              imageFile: meta.imageFile ?? null,
              rarity: meta.rarity,
              itemType: meta.itemType,
            };
          }),
        };
      }),
    };
  });

  return {
    projects,
    memberCount,
    expeditionMemberCountsBySlug,
    communityCountsByItemId,
    activeExpeditionSlug: activeUser?.activeExpeditionSlug ?? null,
  };
};

type CommunityNeedsItem = {
  itemId: string;
  displayName: string;
  imageFile?: string | null;
  totalNeeded: number;
  memberNeeds: Array<{
    memberId: string;
    memberName: string;
    needed: number;
  }>;
};

export const getCommunityNeeds = async (
  userId: string,
  locale: AppLocale
) => {
  const community = await getCommunityForUser(userId);
  if (!community) {
    return { members: [], items: [] };
  }

  const projectsPayload = await loadArcProjects(locale);
  const settings = await getAdminSettings();
  const filteredPayload = applyAdminProjectFilters(projectsPayload, settings);
  const [projectRecords, arcItems] = await Promise.all([
    ensureProjects(projectsPayload),
    loadArcItems(locale),
  ]);

  const itemMetaById = new Map(
    arcItems.items.map((item) => [
      item.id ?? item.imageFile ?? "",
      {
        itemType: item.itemType,
        rarity: item.rarity,
        imageFile: item.imageFile,
      },
    ])
  );
  const expeditionSlugs = new Set(
    filteredPayload.projects
      .filter((project) => isExpeditionProjectSlug(project.slug))
      .map((project) => project.slug)
  );

  const projectItemIdByStage = new Map<string, Map<string, string>>();
  for (const project of projectRecords) {
    const stageMap = new Map<string, string>();
    for (const stage of project.stages) {
      for (const item of stage.items) {
        stageMap.set(`${stage.sortOrder}::${item.itemName}`, item.id);
      }
    }
    projectItemIdByStage.set(project.slug, stageMap);
  }

  const projectItems = filteredPayload.projects.flatMap((project) => {
    const stageMap = projectItemIdByStage.get(project.slug) ?? new Map();
    const isExpedition = expeditionSlugs.has(project.slug);
    return project.stages.flatMap((stage) =>
      stage.items
        .map((item) => {
          const projectItemId = stageMap.get(
            `${stage.sortOrder}::${item.itemId}`
          );
          if (!projectItemId) return null;
          const meta = itemMetaById.get(item.itemId) ?? {
            itemType: "Unknown",
            rarity: "Unknown",
            imageFile: null,
          };
          return {
            projectItemId,
            projectSlug: project.slug,
            isExpedition,
            itemId: item.itemId,
            displayName: item.displayName,
            quantityRequired: item.quantityRequired,
            itemType: meta.itemType,
            rarity: meta.rarity,
            imageFile: meta.imageFile ?? null,
          };
        })
        .filter(
          (entry): entry is {
            projectItemId: string;
            projectSlug: string;
            isExpedition: boolean;
            itemId: string;
            displayName: string;
            quantityRequired: number;
            itemType: string;
            rarity: string;
            imageFile: string | null;
          } => Boolean(entry)
        )
    );
  });

  const memberIds = community.members.map((member) => member.id);
  const projectItemIds = projectItems.map((item) => item.projectItemId);

  const progress = await prisma.userProjectItem.findMany({
    where: {
      userId: { in: memberIds },
      projectItemId: { in: projectItemIds },
    },
    select: {
      userId: true,
      projectItemId: true,
      quantityOwned: true,
    },
  });

  const ownedByMemberItem = new Map<string, number>();
  for (const entry of progress) {
    ownedByMemberItem.set(
      `${entry.userId}::${entry.projectItemId}`,
      entry.quantityOwned
    );
  }

  const itemTotals = new Map<
    string,
    {
      displayName: string;
      itemType: string;
      rarity: string;
      imageFile: string | null;
      memberNeeds: Map<string, number>;
    }
  >();

  for (const member of community.members) {
    const activeExpedition = expeditionSlugs.has(
      member.activeExpeditionSlug ?? ""
    )
      ? member.activeExpeditionSlug
      : null;
    for (const item of projectItems) {
      if (item.isExpedition) {
        if (!activeExpedition) continue;
        if (item.projectSlug !== activeExpedition) continue;
      }
      const owned =
        ownedByMemberItem.get(`${member.id}::${item.projectItemId}`) ?? 0;
      const needed = Math.max(0, item.quantityRequired - owned);
      if (!needed) continue;
      const entry = itemTotals.get(item.itemId) ?? {
        displayName: item.displayName,
        itemType: item.itemType,
        rarity: item.rarity,
        imageFile: item.imageFile ?? null,
        memberNeeds: new Map(),
      };
      entry.memberNeeds.set(
        member.id,
        (entry.memberNeeds.get(member.id) ?? 0) + needed
      );
      if (!itemTotals.has(item.itemId)) {
        itemTotals.set(item.itemId, entry);
      }
    }
  }

  const items: CommunityNeedsItem[] = Array.from(itemTotals.entries()).map(
    ([itemId, data]) => {
      const memberNeeds = community.members
        .map((member) => ({
          memberId: member.id,
          memberName: member.name,
          needed: data.memberNeeds.get(member.id) ?? 0,
        }))
        .filter((entry) => entry.needed > 0);
      const totalNeeded = memberNeeds.reduce(
        (sum, entry) => sum + entry.needed,
        0
      );
      return {
        itemId,
        displayName: data.displayName,
        itemType: data.itemType,
        rarity: data.rarity,
        imageFile: data.imageFile ?? null,
        totalNeeded,
        memberNeeds,
      };
    }
  );

  return {
    members: community.members.map((member) => ({
      id: member.id,
      name: member.name,
      joinedAt: member.joinedAt.toISOString(),
      activeExpeditionSlug: member.activeExpeditionSlug ?? null,
    })),
    items,
  };
};

export const updateProjectItems = async (
  userId: string,
  updates: { projectItemId: string; quantityOwned: number }[]
) => {
  if (!updates.length) {
    return [];
  }

  const ids = updates.map((update) => update.projectItemId);
  const items = await prisma.projectItem.findMany({
    where: { id: { in: ids } },
    select: { id: true, quantityRequired: true },
  });

  const requiredById = new Map(
    items.map((item) => [item.id, item.quantityRequired])
  );

  const operations: ReturnType<typeof prisma.userProjectItem.upsert>[] = [];
  const deletions: ReturnType<typeof prisma.userProjectItem.deleteMany>[] = [];

  for (const update of updates) {
    const required = requiredById.get(update.projectItemId);
    if (required === undefined) continue;
    const nextQuantity = Math.max(
      0,
      Math.min(update.quantityOwned, required)
    );

    if (nextQuantity === 0) {
      deletions.push(
        prisma.userProjectItem.deleteMany({
          where: { userId, projectItemId: update.projectItemId },
        })
      );
      continue;
    }

    operations.push(
      prisma.userProjectItem.upsert({
        where: {
          userId_projectItemId: {
            userId,
            projectItemId: update.projectItemId,
          },
        },
        update: { quantityOwned: nextQuantity },
        create: {
          userId,
          projectItemId: update.projectItemId,
          quantityOwned: nextQuantity,
        },
      })
    );
  }

  if (deletions.length || operations.length) {
    await prisma.$transaction([...deletions, ...operations]);
  }

  return updates.map((update) => ({
    projectItemId: update.projectItemId,
    quantityOwned: Math.max(
      0,
      Math.min(update.quantityOwned, requiredById.get(update.projectItemId) ?? 0)
    ),
  }));
};
