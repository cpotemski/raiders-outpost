import { getRandomArcAnnouncement } from "@/lib/scripts/random-arc";

export const runtime = "nodejs";

export const GET = async () => {
  try {
    const message = await getRandomArcAnnouncement();
    return new Response(message, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new Response("Aktuell konnten die ARC-Daten nicht geladen werden.", {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }
};
