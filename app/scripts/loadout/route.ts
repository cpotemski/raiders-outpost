import { getRandomLoadoutAnnouncement } from "@/lib/scripts/random-loadout";
import { logScriptRequest, logScriptRequestError } from "@/lib/server/script-request-logging";

export const runtime = "nodejs";

export const GET = async (request: Request) => {
  try {
    logScriptRequest("loadout", request);
    const message = getRandomLoadoutAnnouncement();
    return new Response(message, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    logScriptRequestError("loadout", request, error);
    return new Response("Aktuell konnten die Loadout-Daten nicht geladen werden.", {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }
};
