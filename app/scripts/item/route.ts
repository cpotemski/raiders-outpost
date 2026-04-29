import { getRandomItemAnnouncement } from "@/lib/scripts/random-item";
import { logScriptRequest, logScriptRequestError } from "@/lib/server/script-request-logging";

export const runtime = "nodejs";

export const GET = async (request: Request) => {
  try {
    const url = new URL(request.url);
    const rarity = url.searchParams.get("rarity") ?? undefined;
    logScriptRequest("item", request, { rarity });
    const message = await getRandomItemAnnouncement(rarity);
    return new Response(message, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    logScriptRequestError("item", request, error);
    return new Response("Aktuell konnten die Item-Daten nicht geladen werden.", {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }
};
