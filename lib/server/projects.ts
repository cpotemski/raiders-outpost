import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { loadArcProjects } from "@/lib/arc-projects";
import { loadArcItems } from "@/lib/arc-items";
import { getCommunityForUser } from "@/lib/server/community";

type ProjectWithStages = Prisma.ProjectGetPayload<{
  include: { stages: { include: { items: true } } };
}>;

let projectsSeedPromise: Promise<ProjectWithStages[]> | null = null;

const seedProjects = async () => {
  const payload = await loadArcProjects();

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

const ensureProjects = async () => {
  if (projectsSeedPromise) {
    return projectsSeedPromise;
  }

  projectsSeedPromise = (async () => {
    const existingCount = await prisma.project.count();
    if (existingCount === 0) {
      await seedProjects();
    }
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

export const getProjectProgress = async (userId: string) => {
  const [projectsPayload, arcItems, projectRecords] = await Promise.all([
    loadArcProjects(),
    loadArcItems(),
    ensureProjects(),
  ]);

  const imageById = new Map(
    arcItems.items.map((item) => [item.id ?? item.imageFile, item.imageFile])
  );

  const projectBySlug = new Map(
    projectRecords.map((project) => [project.slug, project])
  );

  const projectItemIds: string[] = [];
  const projectItemIdByStage = new Map<string, Map<string, string>>();

  for (const project of projectRecords) {
    const stageMap = new Map<string, string>();
    for (const stage of project.stages) {
      for (const item of stage.items) {
        stageMap.set(`${stage.sortOrder}::${item.itemName}`, item.id);
        projectItemIds.push(item.id);
      }
    }
    projectItemIdByStage.set(project.slug, stageMap);
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
  let communityCountsByItemId: Record<string, number> = {};

  if (community) {
    memberCount = community.members.length;
    const memberIds = community.members.map((member) => member.id);

    const requiredByItemId = new Map(
      projectRecords
        .flatMap((project) => project.stages)
        .flatMap((stage) => stage.items)
        .map((item) => [item.id, item.quantityRequired])
    );

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
        if (required > 0 && entry.quantityOwned >= required) {
          acc[entry.projectItemId] = (acc[entry.projectItemId] ?? 0) + 1;
        }
        return acc;
      },
      {}
    );
  }

  const projects = projectsPayload.projects.map((project) => {
    const stageIdMap = projectItemIdByStage.get(project.slug) ?? new Map();
    const projectRecord = projectBySlug.get(project.slug);
    const stageBySort = new Map(
      projectRecord?.stages.map((stage) => [stage.sortOrder, stage]) ?? []
    );

    return {
      ...project,
      stages: project.stages.map((stage) => {
        const stageRecord = stageBySort.get(stage.sortOrder);
        return {
          ...stage,
          name: stageRecord?.name ?? stage.name,
          items: stage.items.map((item) => {
            const projectItemId =
              stageIdMap.get(`${stage.sortOrder}::${item.itemId}`) ?? "";
            return {
              projectItemId,
              itemId: item.itemId,
              displayName: item.displayName,
              quantityRequired: item.quantityRequired,
              quantityOwned: ownedByItemId.get(projectItemId) ?? 0,
              imageFile: imageById.get(item.itemId) ?? null,
            };
          }),
        };
      }),
    };
  });

  return {
    projects,
    memberCount,
    communityCountsByItemId,
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
