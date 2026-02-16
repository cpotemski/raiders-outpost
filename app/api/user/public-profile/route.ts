import { getTokenFromRequest } from "@/lib/server/requests";
import { getOrCreatePublicProfileSlug } from "@/lib/server/users";

export const runtime = "nodejs";

export const GET = async (request: Request) => {
  const token = getTokenFromRequest(request);
  if (!token) {
    return Response.json({ error: "Missing token" }, { status: 401 });
  }

  const slug = await getOrCreatePublicProfileSlug(token);
  if (!slug) {
    return Response.json({ error: "Unknown token" }, { status: 404 });
  }

  return Response.json({ slug });
};
