import { normalizeLocale } from "@/lib/locale";
import { getPublicProfileNeeds } from "@/lib/server/projects";
import { getUserByPublicProfileSlug } from "@/lib/server/users";

export const runtime = "nodejs";

export const GET = async (
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) => {
  const { slug } = await params;
  const trimmedSlug = slug.trim().toLowerCase();
  if (!trimmedSlug) {
    return Response.json({ error: "Invalid slug" }, { status: 400 });
  }

  const user = await getUserByPublicProfileSlug(trimmedSlug);
  if (!user) {
    return Response.json({ error: "Profile not found" }, { status: 404 });
  }

  const url = new URL(request.url);
  const locale = normalizeLocale(url.searchParams.get("locale"));
  const payload = await getPublicProfileNeeds(user.id, locale);
  if (!payload) {
    return Response.json({ error: "Profile not found" }, { status: 404 });
  }

  return Response.json(payload);
};
