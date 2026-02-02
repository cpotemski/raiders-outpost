import { loadArcItems } from "@/lib/arc-items";
import { normalizeLocale } from "@/lib/locale";
import { applyAdminItemFilters, getAdminSettings } from "@/lib/server/admin-settings";

export const runtime = "nodejs";
export const revalidate = 3600;

export const GET = async (request: Request) => {
  const url = new URL(request.url);
  const locale = normalizeLocale(url.searchParams.get("locale"));
  const [payload, settings] = await Promise.all([
    loadArcItems(locale),
    getAdminSettings(),
  ]);
  const filtered = applyAdminItemFilters(payload, settings);
  return Response.json(filtered, {
    headers: {
      "Cache-Control":
        "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
};
