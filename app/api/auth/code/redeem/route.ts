import { prisma } from "../../../../../lib/prisma";

export const runtime = "nodejs";

export const POST = async (request: Request) => {
  const body = await request.json().catch(() => null);
  const rawCode = typeof body?.code === "string" ? body.code.trim() : "";
  const code = rawCode.toUpperCase();

  if (!code || code.length !== 8) {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }

  const authCode = await prisma.authCode.findUnique({
    where: { code },
    include: {
      user: {
        select: { id: true, name: true, token: true, createdAt: true },
      },
    },
  });

  if (!authCode) {
    return Response.json({ error: "Unknown code" }, { status: 404 });
  }

  if (authCode.expiresAt <= new Date()) {
    await prisma.authCode.delete({ where: { id: authCode.id } });
    return Response.json({ error: "Code expired" }, { status: 410 });
  }

  await prisma.authCode.delete({ where: { id: authCode.id } });

  return Response.json({ user: authCode.user });
};
