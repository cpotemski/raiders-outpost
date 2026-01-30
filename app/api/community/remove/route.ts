import { prisma } from "@/lib/prisma";
import { getCommunityForUser, removeCommunityMember } from "@/lib/server/community";
import { getTokenFromRequest } from "@/lib/server/requests";
import { getUserIdByToken } from "@/lib/server/users";

export const runtime = "nodejs";

export const POST = async (request: Request) => {
  const token = getTokenFromRequest(request);
  if (!token) {
    return Response.json({ error: "Missing token" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const memberId =
    typeof body?.memberId === "string" ? body.memberId.trim() : "";

  if (!memberId) {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }

  const user = await getUserIdByToken(token);

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

  const removed = await removeCommunityMember(
    requesterMembership.communityId,
    memberId
  );

  if (!removed) {
    return Response.json({ error: "Member not found" }, { status: 404 });
  }

  const community = await getCommunityForUser(user.id);

  return Response.json({ community });
};
