import { prisma } from "@/lib/prisma";
import { getCommunitiesForUser, removeCommunityMember } from "@/lib/server/community";
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
  const communityId =
    typeof body?.communityId === "string" ? body.communityId.trim() : "";

  if (!memberId || !communityId) {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }

  const user = await getUserIdByToken(token);

  if (!user) {
    return Response.json({ error: "Unknown token" }, { status: 404 });
  }

  const requesterMembership = await prisma.communityMember.findFirst({
    where: {
      userId: user.id,
      communityId,
    },
    select: { id: true },
  });

  if (!requesterMembership) {
    return Response.json({ error: "No community linked" }, { status: 404 });
  }

  const removed = await removeCommunityMember(communityId, memberId);

  if (!removed) {
    return Response.json({ error: "Member not found" }, { status: 404 });
  }

  const communities = await getCommunitiesForUser(user.id);
  return Response.json({ communities });
};
