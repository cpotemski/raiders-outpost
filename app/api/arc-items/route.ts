import { loadArcItems } from "@/lib/arc-items";
import { normalizeLocale } from "@/lib/locale";

export const runtime = "nodejs";
export const revalidate = 3600;

export const GET = async (request: Request) => {
  const url = new URL(request.url);
  const locale = normalizeLocale(url.searchParams.get("locale"));
  const payload = await loadArcItems(locale);
  return Response.json(payload, {
    headers: {
      "Cache-Control":
        "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
};
