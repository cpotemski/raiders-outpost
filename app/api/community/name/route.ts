import { getCommunityForUser, renameCommunity } from "@/lib/server/community";
import { getTokenFromRequest } from "@/lib/server/requests";
import { getUserIdByToken } from "@/lib/server/users";

export const runtime = "nodejs";

export const PATCH = async (request: Request) => {
  const token = getTokenFromRequest(request);
  if (!token) {
    return Response.json({ error: "Missing token" }, { status: 401 });
  }

  const user = await getUserIdByToken(token);

  if (!user) {
    return Response.json({ error: "Unknown token" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";

  if (!name) {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }

  const communityId = await renameCommunity(user.id, name);

  if (!communityId) {
    return Response.json(
      { error: "Not part of a community" },
      { status: 403 }
    );
  }

  const community = await getCommunityForUser(user.id);

  return Response.json({ community });
};
