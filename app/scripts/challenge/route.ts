import { getRandomChallengeAnnouncement } from "@/lib/scripts/random-challenge";
import { logScriptRequest, logScriptRequestError } from "@/lib/server/script-request-logging";

export const runtime = "nodejs";

export const GET = async (request: Request) => {
  try {
    logScriptRequest("challenge", request);
    const message = await getRandomChallengeAnnouncement();
    return new Response(message, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    logScriptRequestError("challenge", request, error);
    return new Response("Aktuell konnten die Challenge-Daten nicht geladen werden.", {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }
};
