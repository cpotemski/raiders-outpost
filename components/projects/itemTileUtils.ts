import blueprintBg from "@/blueprint-bg.webp";

const getRarityKey = (rarity: string) =>
  (rarity || "unknown").toLowerCase().replace(/[^a-z]/g, "");

export const getItemLabel = (
  displayName: string,
  itemId: string,
  stripBlueprintLabel?: boolean
) => {
  const rawLabel = displayName || itemId;
  if (!stripBlueprintLabel) return rawLabel;
  return rawLabel
    .replace(/^\s*(blueprint|bauplan)\s*:\s*/i, "")
    .replace(/\s*(blueprint|bauplan)\s*$/i, "")
    .trim();
};

export const getItemRarityColor = (rarity: string) => {
  const rarityKey = getRarityKey(rarity);
  return (
    {
      common: "var(--rarity-common)",
      uncommon: "var(--rarity-uncommon)",
      rare: "var(--rarity-rare)",
      epic: "var(--rarity-epic)",
      legendary: "var(--rarity-legendary)",
    }[rarityKey] ?? null
  );
};

export const getItemTileBackground = ({
  itemId,
  itemType,
  rarity,
}: {
  itemId: string;
  itemType: string;
  rarity: string;
}) => {
  const rarityColor = getItemRarityColor(rarity);
  const isBlueprint =
    itemType.toLowerCase() === "blueprint" || /_blueprint$/i.test(itemId);
  const rarityTint = rarityColor
    ? {
        strong: `color-mix(in srgb, ${rarityColor} 55%, transparent)`,
        mid: `color-mix(in srgb, ${rarityColor} 32%, transparent)`,
        low: `color-mix(in srgb, ${rarityColor} 18%, transparent)`,
      }
    : null;
  const itemBackground = isBlueprint
    ? `url(${blueprintBg.src})`
    : rarityTint
      ? [
          `radial-gradient(120% 120% at 20% 18%, ${rarityTint.strong} 0%, transparent 55%)`,
          `linear-gradient(135deg, ${rarityTint.mid} 0%, ${rarityTint.low} 42%, rgba(7, 10, 16, 0.92) 100%)`,
        ].join(", ")
      : "linear-gradient(135deg, rgba(18, 24, 40, 0.75), rgba(7, 10, 16, 0.9))";

  return { itemBackground, rarityColor, isBlueprint };
};
