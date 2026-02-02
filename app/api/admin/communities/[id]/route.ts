import { prisma } from "@/lib/prisma";
import { ensureAdminAccess } from "@/lib/server/admin-auth";

export const runtime = "nodejs";

export const DELETE = async (
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  const access = ensureAdminAccess(request);
  if (!access.allowed) {
    return access.response;
  }

  const { id: communityId } = await params;
  if (!communityId) {
    return Response.json({ error: "Missing community id" }, { status: 400 });
  }

  await prisma.community.delete({
    where: { id: communityId },
  });

  return Response.json({ ok: true });
};
