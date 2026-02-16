import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const getUserIdByToken = async (token: string) => {
  return prisma.user.findUnique({
    where: { token },
    select: { id: true },
  });
};

export const getUserByToken = async (token: string) => {
  return prisma.user.findUnique({
    where: { token },
    select: {
      id: true,
      name: true,
      token: true,
      activeExpeditionSlug: true,
      createdAt: true,
    },
  });
};

export const updateUserName = async (token: string, name: string) => {
  return prisma.user.update({
    where: { token },
    data: { name },
    select: {
      id: true,
      name: true,
      token: true,
      activeExpeditionSlug: true,
      createdAt: true,
    },
  });
};

export const upsertUserWithToken = async (name: string, token: string) => {
  return prisma.user.upsert({
    where: { token },
    update: { name },
    create: { name, token },
    select: {
      id: true,
      name: true,
      token: true,
      activeExpeditionSlug: true,
      createdAt: true,
    },
  });
};

export const getUserExpeditionByToken = async (token: string) => {
  return prisma.user.findUnique({
    where: { token },
    select: {
      id: true,
      activeExpeditionSlug: true,
    },
  });
};

export const updateUserExpedition = async (
  token: string,
  activeExpeditionSlug: string | null
) => {
  return prisma.user.update({
    where: { token },
    data: { activeExpeditionSlug },
    select: {
      id: true,
      activeExpeditionSlug: true,
    },
  });
};

const generatePublicProfileSlug = () => {
  const uuid =
    globalThis.crypto && "randomUUID" in globalThis.crypto
      ? globalThis.crypto.randomUUID().replace(/-/g, "")
      : `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  return uuid.slice(0, 12);
};

export const getOrCreatePublicProfileSlug = async (token: string) => {
  const existing = await prisma.user.findUnique({
    where: { token },
    select: { publicProfileSlug: true },
  });

  if (!existing) {
    return null;
  }

  if (existing.publicProfileSlug) {
    return existing.publicProfileSlug;
  }

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const slug = generatePublicProfileSlug();
    try {
      const updated = await prisma.user.update({
        where: { token },
        data: { publicProfileSlug: slug },
        select: { publicProfileSlug: true },
      });
      return updated.publicProfileSlug;
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

  throw new Error("Failed to generate public profile slug.");
};

export const getUserByPublicProfileSlug = async (slug: string) => {
  return prisma.user.findUnique({
    where: { publicProfileSlug: slug },
    select: {
      id: true,
      name: true,
      publicProfileSlug: true,
      activeExpeditionSlug: true,
      createdAt: true,
    },
  });
};
