import { createCommunityWithOwner, getCommunitiesForUser } from "@/lib/server/community";
import { getTokenFromRequest } from "@/lib/server/requests";
import { getUserIdByToken } from "@/lib/server/users";

export const runtime = "nodejs";

export const GET = async (request: Request) => {
  const token = getTokenFromRequest(request);
  if (!token) {
    return Response.json({ error: "Missing token" }, { status: 401 });
  }

  const user = await getUserIdByToken(token);

  if (!user) {
    return Response.json({ error: "Unknown token" }, { status: 404 });
  }

  const communities = await getCommunitiesForUser(user.id);
  return Response.json({ communities });
};

export const POST = async (request: Request) => {
  const token = getTokenFromRequest(request);
  if (!token) {
    return Response.json({ error: "Missing token" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";

  if (!name) {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }

  const user = await getUserIdByToken(token);

  if (!user) {
    return Response.json({ error: "Unknown token" }, { status: 404 });
  }

  const communityId = await createCommunityWithOwner(name, user.id);
  const communities = await getCommunitiesForUser(user.id);
  return Response.json({ communities, communityId });
};
