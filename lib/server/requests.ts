export const getTokenFromRequest = (request: Request): string => {
  return request.headers.get("x-arc-token")?.trim() ?? "";
};
