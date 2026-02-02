import { prisma } from "@/lib/prisma";
import { ensureAdminAccess } from "@/lib/server/admin-auth";

export const runtime = "nodejs";

export const DELETE = async (request: Request) => {
  const access = ensureAdminAccess(request);
  if (!access.allowed) {
    return access.response;
  }

  const result = await prisma.community.deleteMany();

  return Response.json({ deleted: result.count });
};
