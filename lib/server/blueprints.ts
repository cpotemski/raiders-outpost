import { prisma } from "@/lib/prisma";
import { loadArcProjects } from "@/lib/arc-projects";
import { getCommunityForUser } from "@/lib/server/community";

const PROJECT_SLUG = "blueprints";

export const ensureBlueprintProject = async () => {
  let project = await prisma.project.findUnique({
    where: { slug: PROJECT_SLUG },
    include: { stages: true },
  });

  if (!project) {
    project = await prisma.project.create({
      data: {
        name: "Blueprint Cache",
        slug: PROJECT_SLUG,
        stages: {
          create: {
            name: "Stage 01",
            sortOrder: 1,
          },
        },
      },
      include: { stages: true },
    });
  }

  let stage = project.stages.find((entry) => entry.sortOrder === 1);
  if (!stage) {
    stage = await prisma.projectStage.create({
      data: {
        projectId: project.id,
        name: "Stage 01",
        sortOrder: 1,
      },
    });
  }

  const payload = await loadArcProjects();
  const blueprintProject = payload.projects.find(
    (entry) => entry.slug === PROJECT_SLUG
  );
  const blueprintItems = (blueprintProject?.stages ?? []).flatMap(
    (stage) => stage.items
  );
  const blueprintIds = blueprintItems.map((item) => item.itemId);
  const displayNameMap = new Map(
    blueprintItems.map((item) => [item.displayName, item.itemId])
  );

  if (blueprintIds.length) {
    const existingItems = await prisma.projectItem.findMany({
      where: { stageId: stage.id },
      select: { id: true, itemName: true },
    });
    const updates = existingItems
      .map((item) => {
        const mapped = displayNameMap.get(item.itemName);
        if (!mapped) return null;
        return prisma.projectItem.update({
          where: { id: item.id },
          data: { itemName: mapped },
        });
      })
      .filter((entry): entry is ReturnType<typeof prisma.projectItem.update> =>
        Boolean(entry)
      );
    if (updates.length) {
      await prisma.$transaction(updates);
    }

    await prisma.projectItem.createMany({
      data: blueprintIds.map((itemId) => ({
        stageId: stage.id,
        itemName: itemId,
        quantityRequired: 1,
      })),
      skipDuplicates: true,
    });
  }

  return { projectId: project.id, stageId: stage.id };
};

export const getBlueprintOwnership = async (userId: string) => {
  const { stageId } = await ensureBlueprintProject();

  const items = await prisma.projectItem.findMany({
    where: { stageId },
    select: {
      itemName: true,
      quantityRequired: true,
      userProgress: {
        where: { userId },
        select: { quantityOwned: true },
      },
    },
  });

  const ownedBlueprints = items
    .filter((item) => (item.userProgress[0]?.quantityOwned ?? 0) > 0)
    .map((item) => item.itemName);

  const community = await getCommunityForUser(userId);

  if (!community) {
    return { ownedBlueprints, viewerId: userId };
  }

  const members = [...community.members]
    .map((member) => ({ id: member.id, name: member.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const memberIds = members.map((member) => member.id);

  const communityItems = await prisma.projectItem.findMany({
    where: { stageId },
    select: {
      itemName: true,
      userProgress: {
        where: { userId: { in: memberIds } },
        select: { userId: true, quantityOwned: true },
      },
    },
  });

  const ownershipByItem = communityItems.reduce<Record<string, string[]>>(
    (acc, item) => {
      acc[item.itemName] = item.userProgress
        .filter((progress) => progress.quantityOwned > 0)
        .map((progress) => progress.userId);
      return acc;
    },
    {}
  );

  return {
    ownedBlueprints,
    viewerId: userId,
    community: {
      id: community.id,
      name: community.name,
      members,
    },
    ownershipByItem,
  };
};

export const updateBlueprintOwnership = async (
  userId: string,
  ownedBlueprints: string[]
) => {
  const { stageId } = await ensureBlueprintProject();
  const items = await prisma.projectItem.findMany({
    where: { stageId },
    select: { id: true, itemName: true },
  });

  const ownedSet = new Set(ownedBlueprints);
  const ownedItemIds = items
    .filter((item) => ownedSet.has(item.itemName))
    .map((item) => item.id);
  const stageItemIds = items.map((item) => item.id);

  const deleteWhere = {
    userId,
    projectItemId: { in: stageItemIds },
    ...(ownedItemIds.length
      ? { NOT: { projectItemId: { in: ownedItemIds } } }
      : {}),
  };

  await prisma.$transaction([
    prisma.userProjectItem.deleteMany({ where: deleteWhere }),
    ...ownedItemIds.map((projectItemId) =>
      prisma.userProjectItem.upsert({
        where: {
          userId_projectItemId: {
            userId,
            projectItemId,
          },
        },
        update: {
          quantityOwned: 1,
        },
        create: {
          userId,
          projectItemId,
          quantityOwned: 1,
        },
      })
    ),
  ]);

  return { ownedBlueprints };
};
