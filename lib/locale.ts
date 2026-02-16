export type AppLocale = "de" | "en";

export const LOCALE_STORAGE_KEY = "arc:locale";

export const normalizeLocale = (value?: string | null): AppLocale => {
  if (!value) return "de";
  const normalized = value.toLowerCase();
  if (normalized.startsWith("en")) return "en";
  return "de";
};
