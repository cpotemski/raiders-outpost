import { loadArcItems } from "@/lib/arc-items";
import type { ArcItem } from "@/lib/arc-items";
import { SCRIPT_WEAPON_ITEM_TYPES } from "@/lib/scripts/random-weapon";

const normalizeRarity = (value: string) => value.trim().toLocaleLowerCase();
const normalizeItemType = (value: string) => value.trim().toLocaleLowerCase();
const hasLootSource = (item: ArcItem) => item.foundIn?.trim().length > 0;
const scriptRarityPassthroughValues = new Set(["all"]);

const normalizeScriptRarityInput = (value?: string) => {
  const trimmed = value?.trim();

  if (!trimmed) {
    return undefined;
  }

  // Some chat command providers forward unresolved placeholders when an
  // optional argument is omitted. Treat those as "no filter" instead of an
  // invalid rarity so `!item` still returns a random item.
  if (/^\$\(.+\)$/.test(trimmed)) {
    return undefined;
  }

  if (scriptRarityPassthroughValues.has(trimmed.toLocaleLowerCase())) {
    return undefined;
  }

  return trimmed;
};

const toUniqueSortedRarities = (rarities: string[]) =>
  [...new Set(rarities.filter(Boolean))].sort((left, right) =>
    left.localeCompare(right)
  );

type ScriptItemExclusionRule = {
  id: string;
  matches: (item: ArcItem) => boolean;
};

const excludedItemTypes = new Set([
  "augment",
  "blueprint",
  "key",
  "modification",
  "trinket",
  ...SCRIPT_WEAPON_ITEM_TYPES,
]);

export const SCRIPT_ITEM_EXCLUSION_RULES: ScriptItemExclusionRule[] = [
  {
    id: "missing-found-in",
    matches: (item) => !hasLootSource(item),
  },
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

export const getRandomScriptItemName = async (rarity?: string) => {
  const payload = await loadArcItems();
  const items = getScriptEligibleItems(payload.items);

  if (!items.length) {
    return undefined;
  }

  const availableRarities = toUniqueSortedRarities(
    items.map((item) => item.rarity.trim()).filter(Boolean)
  );
  const normalizedRarity = normalizeScriptRarityInput(rarity);

  const filteredItems = normalizedRarity
    ? items.filter(
        (item) => normalizeRarity(item.rarity) === normalizeRarity(normalizedRarity)
      )
    : items;

  if (!filteredItems.length) {
    return `Keine Items fuer rarity "${normalizedRarity}" gefunden. Verfuegbare Rarities: ${availableRarities.join(", ")}`;
  }

  return filteredItems[Math.floor(Math.random() * filteredItems.length)]?.name;
};

export const getRandomItemAnnouncement = async (rarity?: string) => {
  const itemName = await getRandomScriptItemName(rarity);
  if (!itemName) {
    return "Aktuell konnten keine Item-Daten geladen werden.";
  }

  return `Item: ${itemName}`;
};
