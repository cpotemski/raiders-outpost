import { prisma } from "@/lib/prisma";
import { findCommunityByInviteCode, getCommunityForUser } from "@/lib/server/community";
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

  const existingCommunity = await getCommunityForUser(user.id);
  if (existingCommunity) {
    if (existingCommunity.inviteCode === code) {
      return Response.json({ community: existingCommunity });
    }
    return Response.json(
      { error: "Already in another community" },
      { status: 409 }
    );
  }

  const community = await findCommunityByInviteCode(code);

  if (!community) {
    return Response.json({ error: "Unknown invite" }, { status: 404 });
  }

  await prisma.communityMember.create({
    data: {
      communityId: community.id,
      userId: user.id,
    },
  });

  const joinedCommunity = await getCommunityForUser(user.id);

  return Response.json({ community: joinedCommunity });
};
