import { prisma } from "./prisma";

export type CommunityPayload = {
  id: string;
  name: string;
  inviteCode: string;
  members: Array<{ id: string; name: string; joinedAt: Date }>;
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
