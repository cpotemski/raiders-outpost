import { loadArcItems } from "@/lib/arc-items";

export const runtime = "nodejs";
export const revalidate = 3600;

export const GET = async () => {
  const payload = await loadArcItems();
  return Response.json(payload, {
    headers: {
      "Cache-Control":
        "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
};
