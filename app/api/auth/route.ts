import { generateUserToken } from "@/lib/server/auth";
import { applyOnboardingBaseline } from "@/lib/server/onboarding";
import { getUserByToken, updateUserName, upsertUserWithToken } from "@/lib/server/users";

export const runtime = "nodejs";

export const POST = async (request: Request) => {
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const token = typeof body?.token === "string" ? body.token.trim() : "";
  const create = body?.create === true;
  const locale = body?.locale;
  const baseline = Array.isArray(body?.baseline) ? body.baseline : null;
  const expeditionNext =
    typeof body?.expeditionNext === "string" ? body.expeditionNext : null;

  if (create) {
    if (!name) {
      return Response.json({ error: "Invalid payload" }, { status: 400 });
    }
    const nextToken = token || generateUserToken();
    const user = await upsertUserWithToken(name, nextToken);
    await applyOnboardingBaseline({
      userId: user.id,
      locale,
      baseline,
      expeditionNext,
    });
    return Response.json({ user });
  }

  if (!token) {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }

  let user = await getUserByToken(token);

  if (!user) {
    return Response.json({ error: "Unknown token" }, { status: 404 });
  }

  if (name && name !== user.name) {
    user = await updateUserName(token, name);
  }

  return Response.json({ user });
};
