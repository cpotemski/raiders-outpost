import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type AuthCodeResult = {
  code: string;
  expiresAt: Date;
};

const BACKUP_CODE_EXPIRY = new Date("2126-01-01T00:00:00.000Z");

const generateCode = () => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const values = new Uint8Array(8);
  try {
    if (globalThis.crypto && "getRandomValues" in globalThis.crypto) {
      globalThis.crypto.getRandomValues(values);
    } else {
      throw new Error("No crypto");
    }
  } catch {
    for (let i = 0; i < values.length; i += 1) {
      values[i] = Math.floor(Math.random() * 256);
    }
  }

  return Array.from(values, (value) => alphabet[value % alphabet.length]).join("");
};

export const createAuthCodeForUser = async (
  userId: string
): Promise<AuthCodeResult> => {
  const existing = await prisma.authCode.findUnique({
    where: { userId },
    select: { code: true, expiresAt: true },
  });

  if (existing) {
    return existing;
  }

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const code = generateCode();
    try {
      const expiresAt = BACKUP_CODE_EXPIRY;
      await prisma.authCode.create({
        data: {
          code,
          userId,
          expiresAt,
        },
      });
      return { code, expiresAt };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const latest = await prisma.authCode.findUnique({
          where: { userId },
          select: { code: true, expiresAt: true },
        });
        if (latest) {
          return latest;
        }
        continue;
      }
      throw error;
    }
  }

  throw new Error("Generation failed");
};

type RedeemResult =
  | { status: 200; user: { id: string; name: string; token: string; createdAt: Date } }
  | { status: 404; error: "Unknown code" };

export const redeemAuthCode = async (code: string): Promise<RedeemResult> => {
  const authCode = await prisma.authCode.findUnique({
    where: { code },
    include: {
      user: {
        select: { id: true, name: true, token: true, createdAt: true },
      },
    },
  });

  if (!authCode) {
    return { status: 404, error: "Unknown code" };
  }

  return { status: 200, user: authCode.user };
};
