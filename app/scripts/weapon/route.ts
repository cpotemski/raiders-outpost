import { getRandomWeaponAnnouncement } from "@/lib/scripts/random-weapon";
import { logScriptRequest, logScriptRequestError } from "@/lib/server/script-request-logging";

export const runtime = "nodejs";

export const GET = async (request: Request) => {
  try {
    logScriptRequest("weapon", request);
    const message = await getRandomWeaponAnnouncement();
    return new Response(message, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    logScriptRequestError("weapon", request, error);
    return new Response("Aktuell konnten die Waffen-Daten nicht geladen werden.", {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }
};
