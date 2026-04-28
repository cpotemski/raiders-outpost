export const stripBlueprintLabel = (label: string) =>
  label
    .replace(/^\s*(blueprint|bauplan|blaupause)\s*:\s*/i, "")
    .replace(/\s*(blueprint|bauplan|blaupause)\s*$/i, "")
    .trim();
