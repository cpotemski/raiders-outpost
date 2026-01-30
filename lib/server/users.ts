import { prisma } from "@/lib/prisma";

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
      createdAt: true,
    },
  });
};
