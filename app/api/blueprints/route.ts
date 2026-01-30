import { getBlueprintOwnership, updateBlueprintOwnership } from "@/lib/server/blueprints";
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

  const payload = await getBlueprintOwnership(user.id);

  return Response.json(payload);
};

export const PATCH = async (request: Request) => {
  const token = getTokenFromRequest(request);
  if (!token) {
    return Response.json({ error: "Missing token" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const ownedBlueprints = Array.isArray(body?.ownedBlueprints)
    ? body.ownedBlueprints.filter(
        (entry: unknown): entry is string => typeof entry === "string"
      )
    : null;

  if (!ownedBlueprints) {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }

  const user = await getUserIdByToken(token);

  if (!user) {
    return Response.json({ error: "Unknown token" }, { status: 404 });
  }

  const payload = await updateBlueprintOwnership(user.id, ownedBlueprints);

  return Response.json(payload);
};
