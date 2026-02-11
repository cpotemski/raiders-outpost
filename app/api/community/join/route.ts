import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { findCommunityByInviteCode, getCommunitiesForUser } from "@/lib/server/community";
import { getTokenFromRequest } from "@/lib/server/requests";
import { getUserIdByToken } from "@/lib/server/users";

export const runtime = "nodejs";

export const POST = async (request: Request) => {
  const token = getTokenFromRequest(request);
  if (!token) {
    return Response.json({ error: "Missing token" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const code = typeof body?.code === "string" ? body.code.trim() : "";

  if (!code) {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }

  const user = await getUserIdByToken(token);

  if (!user) {
    return Response.json({ error: "Unknown token" }, { status: 404 });
  }

  const community = await findCommunityByInviteCode(code);

  if (!community) {
    return Response.json({ error: "Unknown invite" }, { status: 404 });
  }

  try {
    await prisma.communityMember.upsert({
      where: {
        communityId_userId: {
          communityId: community.id,
          userId: user.id,
        },
      },
      update: {},
      create: {
        communityId: community.id,
        userId: user.id,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return Response.json(
        {
          error:
            "Community migration pending on server. Apply DB migration before enabling multi-community join.",
        },
        { status: 409 }
      );
    }
    throw error;
  }

  const communities = await getCommunitiesForUser(user.id);
  return Response.json({ communities, communityId: community.id });
};
