import { prisma } from "../../../../lib/prisma";
import { getCommunityForUser } from "../../../../lib/community";

export const runtime = "nodejs";

const getToken = (request: Request) => {
  return request.headers.get("x-arc-token")?.trim() ?? "";
};

export const POST = async (request: Request) => {
  const token = getToken(request);
  if (!token) {
    return Response.json({ error: "Missing token" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const code = typeof body?.code === "string" ? body.code.trim() : "";

  if (!code) {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { token },
    select: { id: true },
  });

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

  const community = await prisma.community.findUnique({
    where: { inviteCode: code },
    select: { id: true },
  });

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
