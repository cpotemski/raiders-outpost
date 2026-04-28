import { loadArcItems } from "@/lib/arc-items";
import type { ArcItem } from "@/lib/arc-items";

const normalizeRarity = (value: string) => value.trim().toLocaleLowerCase();
const normalizeItemType = (value: string) => value.trim().toLocaleLowerCase();

const toUniqueSortedRarities = (rarities: string[]) =>
  [...new Set(rarities.filter(Boolean))].sort((left, right) =>
    left.localeCompare(right)
  );

type ScriptItemExclusionRule = {
  id: string;
  matches: (item: ArcItem) => boolean;
};

const excludedItemTypes = new Set(["blueprint", "key", "trinket"]);

export const SCRIPT_ITEM_EXCLUSION_RULES: ScriptItemExclusionRule[] = [
  {
    id: "excluded-item-types",
    matches: (item) => excludedItemTypes.has(normalizeItemType(item.itemType)),
  },
];

export const isScriptItemAllowed = (item: ArcItem) =>
  !SCRIPT_ITEM_EXCLUSION_RULES.some((rule) => rule.matches(item));

export const getScriptEligibleItems = (items: ArcItem[]) =>
  items.filter(
    (item) => item.name.trim().length > 0 && isScriptItemAllowed(item)
  );

export const getRandomItemAnnouncement = async (rarity?: string) => {
  const payload = await loadArcItems();
  const items = getScriptEligibleItems(payload.items);

  if (!items.length) {
    return "Aktuell konnten keine Item-Daten geladen werden.";
  }

  const availableRarities = toUniqueSortedRarities(
    items.map((item) => item.rarity.trim()).filter(Boolean)
  );
  const normalizedRarity = rarity?.trim();

  const filteredItems = normalizedRarity
    ? items.filter(
        (item) => normalizeRarity(item.rarity) === normalizeRarity(normalizedRarity)
      )
    : items;

  if (!filteredItems.length) {
    return `Keine Items fuer rarity "${normalizedRarity}" gefunden. Verfuegbare Rarities: ${availableRarities.join(", ")}`;
  }

  const randomItem =
    filteredItems[Math.floor(Math.random() * filteredItems.length)];

  return `Item: ${randomItem.name}`;
};
