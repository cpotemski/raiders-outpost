import { prisma } from "../../../lib/prisma";

export const runtime = "nodejs";

export const POST = async (request: Request) => {
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const token = typeof body?.token === "string" ? body.token.trim() : "";
  const create = body?.create === true;

  const generateToken = () => {
    if (globalThis.crypto && "randomUUID" in globalThis.crypto) {
      return globalThis.crypto.randomUUID();
    }
    return `arc-${Math.random().toString(36).slice(2, 10)}-${Date.now()
      .toString(36)
      .slice(-6)}`;
  };

  if (create) {
    if (!name) {
      return Response.json({ error: "Invalid payload" }, { status: 400 });
    }
    const nextToken = token || generateToken();
    const user = await prisma.user.upsert({
      where: { token: nextToken },
      update: { name },
      create: { name, token: nextToken },
      select: {
        id: true,
        name: true,
        token: true,
        createdAt: true,
      },
    });
    return Response.json({ user });
  }

  if (!token) {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }

  let user = await prisma.user.findUnique({
    where: { token },
    select: {
      id: true,
      name: true,
      token: true,
      createdAt: true,
    },
  });

  if (!user) {
    return Response.json({ error: "Unknown token" }, { status: 404 });
  }

  if (name && name !== user.name) {
    user = await prisma.user.update({
      where: { token },
      data: { name },
      select: {
        id: true,
        name: true,
        token: true,
        createdAt: true,
      },
    });
  }

  return Response.json({ user });
};
