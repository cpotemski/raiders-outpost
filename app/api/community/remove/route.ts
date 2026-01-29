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
  const memberId =
    typeof body?.memberId === "string" ? body.memberId.trim() : "";

  if (!memberId) {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { token },
    select: { id: true },
  });

  if (!user) {
    return Response.json({ error: "Unknown token" }, { status: 404 });
  }

  const requesterMembership = await prisma.communityMember.findUnique({
    where: { userId: user.id },
    select: { communityId: true },
  });

  if (!requesterMembership) {
    return Response.json({ error: "No community linked" }, { status: 404 });
  }

  const targetMembership = await prisma.communityMember.findFirst({
    where: {
      communityId: requesterMembership.communityId,
      userId: memberId,
    },
    select: { id: true },
  });

  if (!targetMembership) {
    return Response.json({ error: "Member not found" }, { status: 404 });
  }

  await prisma.communityMember.delete({
    where: { id: targetMembership.id },
  });

  const community = await getCommunityForUser(user.id);

  return Response.json({ community });
};
