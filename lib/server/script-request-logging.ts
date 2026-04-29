type ScriptRequestLogMetadata = Record<string, string | undefined>;

const getHeaderValue = (request: Request, headerName: string) =>
  request.headers.get(headerName)?.trim() || undefined;

const getSearchParams = (requestUrl: URL) => {
  const entries = Array.from(requestUrl.searchParams.entries());

  return Object.fromEntries(entries);
};

export const logScriptRequest = (
  endpoint: string,
  request: Request,
  metadata: ScriptRequestLogMetadata = {}
) => {
  const requestUrl = new URL(request.url);
  const payload = {
    event: "script_request",
    endpoint,
    method: request.method,
    path: requestUrl.pathname,
    search: requestUrl.search,
    query: getSearchParams(requestUrl),
    userAgent: getHeaderValue(request, "user-agent"),
    forwardedFor: getHeaderValue(request, "x-forwarded-for"),
    realIp: getHeaderValue(request, "x-real-ip"),
    forwardedProto: getHeaderValue(request, "x-forwarded-proto"),
    forwardedHost: getHeaderValue(request, "x-forwarded-host"),
    host: getHeaderValue(request, "host"),
    metadata,
  };

  console.info(JSON.stringify(payload));
};

export const logScriptRequestError = (
  endpoint: string,
  request: Request,
  error: unknown
) => {
  const requestUrl = new URL(request.url);

  console.error(
    JSON.stringify({
      event: "script_request_error",
      endpoint,
      method: request.method,
      path: requestUrl.pathname,
      search: requestUrl.search,
      error: error instanceof Error ? error.message : String(error),
    })
  );
};
