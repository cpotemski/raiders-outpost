import { prisma } from "@/lib/prisma";
import { ensureAdminAccess } from "@/lib/server/admin-auth";

export const runtime = "nodejs";

export const GET = async (request: Request) => {
  const access = ensureAdminAccess(request);
  if (!access.allowed) {
    return access.response;
  }

  const communities = await prisma.community.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      inviteCode: true,
      createdAt: true,
      _count: { select: { members: true } },
    },
  });

  return Response.json({
    communities: communities.map((community) => ({
      id: community.id,
      name: community.name,
      inviteCode: community.inviteCode,
      createdAt: community.createdAt.toISOString(),
      memberCount: community._count.members,
    })),
  });
};
