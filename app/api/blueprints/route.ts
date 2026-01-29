import { prisma } from "../../../lib/prisma";
import { loadArcItems } from "../../../lib/arc-items";
import { getCommunityForUser } from "../../../lib/community";

export const runtime = "nodejs";

const PROJECT_SLUG = "blueprints";

const getToken = (request: Request) => {
  return request.headers.get("x-arc-token")?.trim() ?? "";
};

const ensureBlueprintProject = async () => {
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

  const payload = await loadArcItems();
  const blueprintNames = payload.items
    .filter((item) => item.itemType === "Blueprint")
    .map((item) => item.name);

  if (blueprintNames.length) {
    await prisma.projectItem.createMany({
      data: blueprintNames.map((name) => ({
        stageId: stage.id,
        itemName: name,
        quantityRequired: 1,
      })),
      skipDuplicates: true,
    });
  }

  return { projectId: project.id, stageId: stage.id };
};

export const GET = async (request: Request) => {
  const token = getToken(request);
  if (!token) {
    return Response.json({ error: "Missing token" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { token },
    select: { id: true },
  });

  if (!user) {
    return Response.json({ error: "Unknown token" }, { status: 404 });
  }

  const { stageId } = await ensureBlueprintProject();

  const items = await prisma.projectItem.findMany({
    where: { stageId },
    select: {
      itemName: true,
      quantityRequired: true,
      userProgress: {
        where: { userId: user.id },
        select: { quantityOwned: true },
      },
    },
  });

  const ownedBlueprints = items
    .filter((item) => (item.userProgress[0]?.quantityOwned ?? 0) > 0)
    .map((item) => item.itemName);

  const community = await getCommunityForUser(user.id);

  if (!community) {
    return Response.json({ ownedBlueprints, viewerId: user.id });
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

  return Response.json({
    ownedBlueprints,
    viewerId: user.id,
    community: {
      id: community.id,
      name: community.name,
      members,
    },
    ownershipByItem,
  });
};

export const PATCH = async (request: Request) => {
  const token = getToken(request);
  if (!token) {
    return Response.json({ error: "Missing token" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const ownedBlueprints = Array.isArray(body?.ownedBlueprints)
    ? body.ownedBlueprints.filter(
        (entry: unknown): entry is string => typeof entry === "string"
      )
    : null;

  if (!ownedBlueprints) {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { token },
    select: { id: true },
  });

  if (!user) {
    return Response.json({ error: "Unknown token" }, { status: 404 });
  }

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
    userId: user.id,
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
            userId: user.id,
            projectItemId,
          },
        },
        update: {
          quantityOwned: 1,
        },
        create: {
          userId: user.id,
          projectItemId,
          quantityOwned: 1,
        },
      })
    ),
  ]);

  return Response.json({ ownedBlueprints });
};
