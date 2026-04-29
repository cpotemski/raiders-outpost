import { getRandomMapAnnouncement } from "@/lib/scripts/map-conditions";
import { logScriptRequest, logScriptRequestError } from "@/lib/server/script-request-logging";

export const runtime = "nodejs";

export const GET = async (request: Request) => {
  try {
    logScriptRequest("map", request);
    const message = await getRandomMapAnnouncement();
    return new Response(message, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    logScriptRequestError("map", request, error);
    return new Response("Aktuell konnten die Map-Daten nicht geladen werden.", {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }
};
