import { getRandomMapAnnouncement } from "@/lib/scripts/map-conditions";

export const runtime = "nodejs";

export const GET = async () => {
  try {
    const message = await getRandomMapAnnouncement();
    return new Response(message, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new Response("Aktuell konnten die Map-Daten nicht geladen werden.", {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }
};
