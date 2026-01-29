import { Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma";
import { getCommunityForUser } from "../../../lib/community";

export const runtime = "nodejs";

const getToken = (request: Request) => {
  return request.headers.get("x-arc-token")?.trim() ?? "";
};

const generateInviteCode = () => {
  if (globalThis.crypto && "randomUUID" in globalThis.crypto) {
    return globalThis.crypto.randomUUID().split("-")[0];
  }
  return `arc-${Math.random().toString(36).slice(2, 10)}`;
};

const createCommunity = async (name: string, userId: string) => {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const inviteCode = generateInviteCode();
    try {
      return await prisma.$transaction(async (tx) => {
        const community = await tx.community.create({
          data: { name, inviteCode },
        });
        await tx.communityMember.create({
          data: {
            communityId: community.id,
            userId,
          },
        });
        return community;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        continue;
      }
      throw error;
    }
  }
  throw new Error("Failed to create community invite code.");
};

export const GET = async (request: Request) => {
  const token = getToken(request);
  if (!token) {
    return Response.json({ error: "Missing token" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { token },
    select: { id: true },
  });

  if (!user) {
    return Response.json({ error: "Unknown token" }, { status: 404 });
  }

  const community = await getCommunityForUser(user.id);

  return Response.json({ community });
};

export const POST = async (request: Request) => {
  const token = getToken(request);
  if (!token) {
    return Response.json({ error: "Missing token" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";

  if (!name) {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { token },
    select: { id: true },
  });

  if (!user) {
    return Response.json({ error: "Unknown token" }, { status: 404 });
  }

  const existingCommunity = await getCommunityForUser(user.id);
  if (existingCommunity) {
    return Response.json({ community: existingCommunity });
  }

  await createCommunity(name, user.id);
  const community = await getCommunityForUser(user.id);

  return Response.json({ community });
};
