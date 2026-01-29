import type { ArcItemPayload } from "./index";

type LoaderOptions = {
  baseUrl?: string;
  cache?: RequestCache;
};

export const fetchArcItems = async (
  options: LoaderOptions = {}
): Promise<ArcItemPayload> => {
  const { baseUrl = "", cache = "no-store" } = options;
  const res = await fetch(`${baseUrl}/api/arc-items`, { cache });
  if (!res.ok) {
    throw new Error(`Failed to load arc items: ${res.status}`);
  }
  return (await res.json()) as ArcItemPayload;
};
