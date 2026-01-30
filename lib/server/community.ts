import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type CommunityPayload = {
  id: string;
  name: string;
  inviteCode: string;
  members: Array<{ id: string; name: string; joinedAt: Date }>;
};

const generateInviteCode = () => {
  if (globalThis.crypto && "randomUUID" in globalThis.crypto) {
    return globalThis.crypto.randomUUID().split("-")[0];
  }
  return `arc-${Math.random().toString(36).slice(2, 10)}`;
};

export const createCommunityWithOwner = async (
  name: string,
  userId: string
): Promise<void> => {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const inviteCode = generateInviteCode();
    try {
      await prisma.$transaction(async (tx) => {
        const community = await tx.community.create({
          data: { name, inviteCode },
        });
        await tx.communityMember.create({
          data: {
            communityId: community.id,
            userId,
          },
        });
      });
      return;
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

export const getCommunityForUser = async (
  userId: string
): Promise<CommunityPayload | null> => {
  const membership = await prisma.communityMember.findUnique({
    where: { userId },
    include: {
      community: {
        include: {
          members: {
            orderBy: { joinedAt: "asc" },
            include: {
              user: {
                select: { id: true, name: true },
              },
            },
          },
        },
      },
    },
  });

  if (!membership) return null;

  const { community } = membership;

  return {
    id: community.id,
    name: community.name,
    inviteCode: community.inviteCode,
    members: community.members.map((member) => ({
      id: member.user.id,
      name: member.user.name,
      joinedAt: member.joinedAt,
    })),
  };
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
