import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { loadArcProjects } from "@/lib/arc-projects";
import { loadArcItems } from "@/lib/arc-items";
import { getCommunitiesForUser, getCommunityForUser } from "@/lib/server/community";
import type { AppLocale } from "@/lib/locale";
import { isExpeditionProjectSlug } from "@/lib/expeditions";
import { applyAdminProjectFilters, getAdminSettings } from "@/lib/server/admin-settings";
import {
  EXPEDITION_RESET_CYCLE_ID,
  EXPEDITION_RESET_NOTICE_END_ISO,
  EXPEDITION_RESET_NOTICE_START_ISO,
  isExpeditionResetNoticeActive,
} from "@/lib/expedition-reset";

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

const syncProjects = async (payload: Awaited<ReturnType<typeof loadArcProjects>>) => {
  await prisma.$transaction(async (tx) => {
    for (const projectData of payload.projects) {
      const project = await tx.project.upsert({
        where: { slug: projectData.slug },
        update: { name: projectData.name },
        create: {
          name: projectData.name,
          slug: projectData.slug,
        },
      });

      for (const stageData of projectData.stages) {
        const stage = await tx.projectStage.upsert({
          where: {
            projectId_sortOrder: {
              projectId: project.id,
              sortOrder: stageData.sortOrder,
            },
          },
          update: { name: stageData.name },
          create: {
            projectId: project.id,
            name: stageData.name,
            sortOrder: stageData.sortOrder,
          },
        });

        for (const itemData of stageData.items) {
          await tx.projectItem.upsert({
            where: {
              stageId_itemName: {
                stageId: stage.id,
                itemName: itemData.itemId,
              },
            },
            update: { quantityRequired: itemData.quantityRequired },
            create: {
              stageId: stage.id,
              itemName: itemData.itemId,
              quantityRequired: itemData.quantityRequired,
            },
          });
        }
      }
    }
  });
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
    await syncProjects(nextPayload);
    return prisma.project.findMany({
      include: {
        stages: {
          include: { items: true },
        },
      },
    });
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
    select: {
      activeExpeditionSlug: true,
      expeditionResetDismissedCycle: true,
      expeditionResetCompletedCycle: true,
    },
  });
  const noticeActive = isExpeditionResetNoticeActive();

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
    expeditionReset: {
      cycleId: EXPEDITION_RESET_CYCLE_ID,
      noticeStartIso: EXPEDITION_RESET_NOTICE_START_ISO,
      noticeEndIso: EXPEDITION_RESET_NOTICE_END_ISO,
      noticeActive,
      dismissed:
        activeUser?.expeditionResetDismissedCycle ===
        EXPEDITION_RESET_CYCLE_ID,
      completed:
        activeUser?.expeditionResetCompletedCycle ===
        EXPEDITION_RESET_CYCLE_ID,
      showNotice:
        noticeActive &&
        Boolean(activeUser?.activeExpeditionSlug) &&
        activeUser?.expeditionResetDismissedCycle !==
          EXPEDITION_RESET_CYCLE_ID &&
        activeUser?.expeditionResetCompletedCycle !==
          EXPEDITION_RESET_CYCLE_ID,
    },
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
  locale: AppLocale,
  options?: { communityIds?: string[] | null }
) => {
  const allCommunities = await getCommunitiesForUser(userId);
  const requestedCommunityIds = options?.communityIds ?? null;

  const sourceCommunities = Array.isArray(requestedCommunityIds)
    ? allCommunities.filter((community) =>
        requestedCommunityIds.includes(community.id)
      )
    : allCommunities;

  if (!sourceCommunities.length) {
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

  const memberById = new Map<
    string,
    {
      id: string;
      name: string;
      joinedAt: Date;
      activeExpeditionSlug: string | null;
    }
  >();

  for (const community of sourceCommunities) {
    for (const member of community.members) {
      if (!memberById.has(member.id)) {
        memberById.set(member.id, member);
      }
    }
  }

  const members = Array.from(memberById.values());
  const memberIds = members.map((member) => member.id);
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

  for (const member of members) {
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
      const memberNeeds = members
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
    members: members.map((member) => ({
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
