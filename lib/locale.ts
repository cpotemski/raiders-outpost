export type AppLocale = "de" | "en";

export const LOCALE_STORAGE_KEY = "arc:locale";

export const normalizeLocale = (value?: string | null): AppLocale => {
  if (!value) return "en";
  const normalized = value.toLowerCase();
  if (normalized.startsWith("de")) return "de";
  return "en";
};

