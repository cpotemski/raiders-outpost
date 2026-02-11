import { getCommunityNeeds } from "@/lib/server/projects";
import { getTokenFromRequest } from "@/lib/server/requests";
import { getUserIdByToken } from "@/lib/server/users";
import { normalizeLocale } from "@/lib/locale";

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

  const url = new URL(request.url);
  const locale = normalizeLocale(url.searchParams.get("locale"));
  const communityIdsParam = url.searchParams.get("communityIds");
  const communityIds = communityIdsParam
    ? communityIdsParam
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean)
    : [];
  const payload = await getCommunityNeeds(user.id, locale, { communityIds });

  return Response.json(payload);
};
