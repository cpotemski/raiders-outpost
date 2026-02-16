import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type CommunityPayload = {
  id: string;
  name: string;
  inviteCode: string;
  createdAt: Date;
  members: Array<{
    id: string;
    name: string;
    joinedAt: Date;
    activeExpeditionSlug: string | null;
  }>;
};

const generateInviteCode = () => {
  if (globalThis.crypto && "randomUUID" in globalThis.crypto) {
    return globalThis.crypto.randomUUID().split("-")[0];
  }
  return `arc-${Math.random().toString(36).slice(2, 10)}`;
};

const mapCommunity = (community: {
  id: string;
  name: string;
  inviteCode: string;
  createdAt: Date;
  members: Array<{
    joinedAt: Date;
    user: { id: string; name: string; activeExpeditionSlug: string | null };
  }>;
}): CommunityPayload => ({
  id: community.id,
  name: community.name,
  inviteCode: community.inviteCode,
  createdAt: community.createdAt,
  members: community.members.map((member) => ({
    id: member.user.id,
    name: member.user.name,
    joinedAt: member.joinedAt,
    activeExpeditionSlug: member.user.activeExpeditionSlug ?? null,
  })),
});

export const createCommunityWithOwner = async (
  name: string,
  userId: string
): Promise<string> => {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const inviteCode = generateInviteCode();
    try {
      const createdCommunityId = await prisma.$transaction(async (tx) => {
        const community = await tx.community.create({
          data: { name, inviteCode },
        });
        await tx.communityMember.create({
          data: {
            communityId: community.id,
            userId,
          },
        });
        return community.id;
      });
      return createdCommunityId;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        continue;
      }
      throw error;
    }
  }
  throw new Error("Failed to create community invite code.");
};

export const getCommunitiesForUser = async (
  userId: string
): Promise<CommunityPayload[]> => {
  const communities = await prisma.community.findMany({
    where: {
      members: {
        some: {
          userId,
        },
      },
    },
    orderBy: { createdAt: "asc" },
    include: {
      members: {
        orderBy: { joinedAt: "asc" },
        include: {
          user: {
            select: { id: true, name: true, activeExpeditionSlug: true },
          },
        },
      },
    },
  });

  return communities.map(mapCommunity);
};

export const getCommunityForUser = async (
  userId: string,
  communityId?: string
): Promise<CommunityPayload | null> => {
  if (communityId) {
    const membership = await prisma.communityMember.findFirst({
      where: { userId, communityId },
      include: {
        community: {
          include: {
            members: {
              orderBy: { joinedAt: "asc" },
              include: {
                user: {
                  select: { id: true, name: true, activeExpeditionSlug: true },
                },
              },
            },
          },
        },
      },
    });

    if (!membership) return null;
    return mapCommunity(membership.community);
  }

  const communities = await getCommunitiesForUser(userId);
  return communities[0] ?? null;
};

export const renameCommunity = async (
  userId: string,
  communityId: string,
  name: string
): Promise<boolean> => {
  const membership = await prisma.communityMember.findFirst({
    where: { userId, communityId },
    select: { id: true },
  });

  if (!membership) {
    return false;
  }

  await prisma.community.update({
    where: { id: communityId },
    data: { name },
  });

  return true;
};

export const findCommunityByInviteCode = async (inviteCode: string) => {
  return prisma.community.findUnique({
    where: { inviteCode },
    select: { id: true },
  });
};

export const removeCommunityMember = async (
  communityId: string,
  memberId: string
) => {
  const targetMembership = await prisma.communityMember.findFirst({
    where: {
      communityId,
      userId: memberId,
    },
    select: { id: true },
  });

  if (!targetMembership) return null;

  await prisma.communityMember.delete({
    where: { id: targetMembership.id },
  });

  return targetMembership;
};
