import { headers } from "next/headers";

const endpointRows = [
  {
    path: "/scripts/map",
    description:
      "Gibt einen zufälligen Map-Pick als Plaintext zurück. Maps ohne aktives Event können ebenfalls gezogen werden.",
    output:
      'Beispiel: "Map: Raumhafen - Nächtliche Plünderung" oder "Map: Blaues Tor"',
  },
];

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
  const streamElementsCommand = `!command add !map $(customapi ${requestOrigin}/scripts/map)`;

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
            Diese Endpunkte sind fuer Chatbots und externe Script-Aufrufe
            gedacht. Antworten sind bewusst knapp gehalten, damit sie direkt in
            StreamElements ausgegeben werden koennen.
          </p>
        </div>

        <div className="my-4">
          {endpointRows.map((endpoint) => (
            <article
              key={endpoint.path}
              className="border border-[color:var(--frame2)] bg-[color:var(--panel2)]/50 p-3"
            >
              <p className="font-mono text-sm text-[color:var(--accent)]">
                {endpoint.path}
              </p>
              <p className="mt-2 text-sm leading-6">{endpoint.description}</p>
              <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
                {endpoint.output}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="arc-panel arc-corners p-4 md:p-5">
        <div className="arc-panel-header -mx-4 -mt-4 mb-4 md:-mx-5 md:-mt-5">
          <div>
            <p className="hud-label">StreamElements</p>
            <h2 className="text-base font-semibold uppercase tracking-[0.08em]">
              Einbindung
            </h2>
          </div>
        </div>

        <div className="space-y-3 text-sm leading-6">
          <p>
            Erstelle in StreamElements einen Custom Command und rufe den
            Endpunkt per <code>$(customapi ...)</code> auf.
          </p>
          <pre className="overflow-x-auto border border-[color:var(--frame2)] bg-[color:var(--panel2)]/60 p-3 text-xs text-[color:var(--text)]">
            {streamElementsCommand}
          </pre>
          <p className="text-[color:var(--muted)]">
            StreamElements verwendet fuer HTTP-GET auch den Alias{" "}
            <code>$(urlfetch ...)</code>. Der Endpunkt liefert Plaintext und
            ist deshalb direkt fuer Chat-Ausgaben geeignet.
          </p>
        </div>
      </section>
    </div>
  );
}
