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

  const { id: userId } = await params;
  if (!userId) {
    return Response.json({ error: "Missing user id" }, { status: 400 });
  }

  await prisma.user.delete({
    where: { id: userId },
  });

  return Response.json({ ok: true });
};
