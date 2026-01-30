import { redeemAuthCode } from "@/lib/server/auth-codes";

export const runtime = "nodejs";

export const POST = async (request: Request) => {
  const body = await request.json().catch(() => null);
  const rawCode = typeof body?.code === "string" ? body.code.trim() : "";
  const code = rawCode.toUpperCase();

  if (!code || code.length !== 8) {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }

  const result = await redeemAuthCode(code);

  if (result.status === 200) {
    return Response.json({ user: result.user });
  }

  return Response.json({ error: result.error }, { status: result.status });
};
