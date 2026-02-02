const isLocalhostHost = (host: string) =>
  host.startsWith("localhost") ||
  host.startsWith("127.0.0.1") ||
  host.startsWith("[::1]");

const getProvidedPassword = (request: Request) => {
  const url = new URL(request.url);
  return (
    url.searchParams.get("password") ??
    request.headers.get("x-admin-password") ??
    ""
  ).trim();
};

export const ensureAdminAccess = (request: Request) => {
  const provided = getProvidedPassword(request);

  if (!provided) {
    return { allowed: false, response: new Response("Not found", { status: 404 }) };
  }

  const expected = process.env.ADMIN_PASSWORD;
  const host = request.headers.get("host") ?? "";
  const isDev = process.env.NODE_ENV !== "production";
  const isLocalhost = isLocalhostHost(host);

  if (!expected && (isDev || isLocalhost)) {
    return { allowed: true as const };
  }

  if (!expected) {
    return { allowed: false, response: new Response("Not found", { status: 404 }) };
  }

  if (provided !== expected) {
    return { allowed: false, response: new Response("Not found", { status: 404 }) };
  }

  return { allowed: true as const };
};
