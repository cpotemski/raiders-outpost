import { prisma } from "@/lib/prisma";
import { ensureAdminAccess } from "@/lib/server/admin-auth";

export const runtime = "nodejs";

export const GET = async (request: Request) => {
  const access = ensureAdminAccess(request);
  if (!access.allowed) {
    return access.response;
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      createdAt: true,
      communityMemberships: {
        take: 1,
        select: {
          community: { select: { id: true, name: true } },
        },
      },
    },
  });

  return Response.json({
    users: users.map((user) => ({
      id: user.id,
      name: user.name,
      createdAt: user.createdAt.toISOString(),
      community: user.communityMemberships[0]?.community ?? null,
    })),
  });
};
