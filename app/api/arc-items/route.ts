import { loadArcItems } from "@/lib/arc-items";

export const runtime = "nodejs";

export const GET = async () => {
  const payload = await loadArcItems();
  return Response.json(payload);
};
