import { createAuthCodeForUser } from "@/lib/server/auth-codes";
import { getTokenFromRequest } from "@/lib/server/requests";
import { getUserIdByToken } from "@/lib/server/users";

export const runtime = "nodejs";

export const POST = async (request: Request) => {
  const token = getTokenFromRequest(request);
  if (!token) {
    return Response.json({ error: "Missing token" }, { status: 401 });
  }

  const user = await getUserIdByToken(token);

  if (!user) {
    return Response.json({ error: "Unknown token" }, { status: 404 });
  }

  try {
    const payload = await createAuthCodeForUser(user.id);
    return Response.json(payload);
  } catch (error) {
    console.error("auth code generation failed", error);
    return Response.json({ error: "Generation failed" }, { status: 500 });
  }
};
