import { getCommunitiesForUser, renameCommunity } from "@/lib/server/community";
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
  const communityId =
    typeof body?.communityId === "string" ? body.communityId.trim() : "";

  if (!name || !communityId) {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }

  const renamed = await renameCommunity(user.id, communityId, name);

  if (!renamed) {
    return Response.json(
      { error: "Not part of a community" },
      { status: 403 }
    );
  }

  const communities = await getCommunitiesForUser(user.id);
  return Response.json({ communities });
};
