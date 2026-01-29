import { prisma } from "../../../lib/prisma";

export const runtime = "nodejs";

export const POST = async (request: Request) => {
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const token = typeof body?.token === "string" ? body.token.trim() : "";

  if (!name || !token) {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }

  const user = await prisma.user.upsert({
    where: { token },
    update: { name },
    create: { name, token },
    select: {
      id: true,
      name: true,
      token: true,
      createdAt: true,
    },
  });

  return Response.json({ user });
};
