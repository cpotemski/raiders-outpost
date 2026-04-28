import { headers } from "next/headers";
import { ScriptsEndpointList, type ScriptEndpoint } from "./ScriptsEndpointList";

async function getRequestOrigin() {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");

  if (!host) {
    return "";
  }

  const proto =
    headerList.get("x-forwarded-proto") ??
    (host.includes("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");

  return `${proto}://${host}`;
}

export default async function ScriptsPage() {
  const requestOrigin = await getRequestOrigin();
  const endpoints: ScriptEndpoint[] = [
    {
      path: "/scripts/arc",
      description:
        "Gibt einen zufaelligen ARC als Plaintext zurueck. Es gibt keinen weiteren Filter.",
      output: 'Beispiel: "ARC: Matriarchin"',
      command: `!command add !arc $(customapi ${requestOrigin}/scripts/arc)`,
    },
    {
      path: "/scripts/map",
      description:
        "Gibt einen zufaelligen Map-Pick als Plaintext zurueck. Maps ohne aktives Event koennen ebenfalls gezogen werden.",
      output:
        'Beispiel: "Map: Raumhafen - Naechtliche Pluenderung" oder "Map: Blaues Tor"',
      command: `!command add !map $(customapi ${requestOrigin}/scripts/map)`,
    },
    {
      path: "/scripts/item",
      description:
        "Gibt ein zufaelliges Item als Plaintext zurueck. Mit einem optionalen Twitch-Argument wie !item rare wird auf diese Rarity gefiltert.",
      output:
        'Beispiel: "Item: Kaktusfeige" oder bei ungueltiger rarity ein Hinweis mit verfuegbaren Rarities',
      command: `!command add !item $(customapi ${requestOrigin}/scripts/item?rarity=$(queryescape $(1)))`,
    },
  ];

  return (
    <div className="flex flex-col gap-4" data-testid="scripts-page">
      <section className="arc-panel arc-corners arc-noise p-4 md:p-5">
        <div className="arc-panel-header -mx-4 -mt-4 mb-4 md:-mx-5 md:-mt-5">
          <div>
            <p className="hud-label">Scripts</p>
            <h1 className="text-lg font-semibold uppercase tracking-[0.08em]">
              Stream Endpunkte
            </h1>
          </div>
        </div>

        <div className="space-y-3 text-sm leading-6 text-[color:var(--text)]">
          <p>
            Diese Endpunkte sind fuer Chatbots und externe Script-Aufrufe gedacht.
            Antworten sind bewusst knapp gehalten, damit sie direkt in
            StreamElements ausgegeben werden koennen.
          </p>
        </div>

        <ScriptsEndpointList endpoints={endpoints} />
      </section>
    </div>
  );
}
