import { Prisma } from "@prisma/client";
import { prisma } from "../../../../lib/prisma";

export const runtime = "nodejs";

const getToken = (request: Request) => {
  return request.headers.get("x-arc-token")?.trim() ?? "";
};

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

export const POST = async (request: Request) => {
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

  try {
    await prisma.authCode.deleteMany({
      where: {
        OR: [{ userId: user.id }, { expiresAt: { lt: new Date() } }],
      },
    });

    for (let attempt = 0; attempt < 4; attempt += 1) {
      const code = generateCode();
      try {
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
        await prisma.authCode.create({
          data: {
            code,
            userId: user.id,
            expiresAt,
          },
        });
        return Response.json({ code, expiresAt });
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

    return Response.json({ error: "Generation failed" }, { status: 500 });
  } catch (error) {
    console.error("auth code generation failed", error);
    return Response.json({ error: "Generation failed" }, { status: 500 });
  }
};
