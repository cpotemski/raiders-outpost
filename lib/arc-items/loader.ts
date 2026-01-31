import type { ArcItemPayload } from "./index";
import type { AppLocale } from "@/lib/locale";

type LoaderOptions = {
  baseUrl?: string;
  cache?: RequestCache;
  locale?: AppLocale;
};

export const fetchArcItems = async (
  options: LoaderOptions = {}
): Promise<ArcItemPayload> => {
  const { baseUrl = "", cache = "no-store", locale = "en" } = options;
  const res = await fetch(`${baseUrl}/api/arc-items?locale=${locale}`, {
    cache,
  });
  if (!res.ok) {
    throw new Error(`Failed to load arc items: ${res.status}`);
  }
  return (await res.json()) as ArcItemPayload;
};
