import { loadArcItems } from "@/lib/arc-items";
import type { ArcItem } from "@/lib/arc-items";

export const SCRIPT_WEAPON_ITEM_TYPES = new Set([
  "assault rifle",
  "battle rifle",
  "hand cannon",
  "lmg",
  "pistol",
  "shotgun",
  "smg",
  "sniper rifle",
]);

const WEAPON_TIER_SUFFIX_PATTERN = /\s+(?:I|II|III|IV)$/;
const WEAPON_RARITY_WEIGHTS = [
  { rarity: "uncommon", weight: 30 },
  { rarity: "rare", weight: 30 },
  { rarity: "common", weight: 20 },
  { rarity: "epic", weight: 15 },
  { rarity: "legendary", weight: 5 },
] as const;

const normalizeItemType = (value: string) => value.trim().toLocaleLowerCase();
const normalizeRarity = (value: string) => value.trim().toLocaleLowerCase();

export const normalizeWeaponName = (name: string) =>
  name.trim().replace(WEAPON_TIER_SUFFIX_PATTERN, "");

export const isScriptWeaponAllowed = (item: ArcItem) =>
  item.name.trim().length > 0 &&
  SCRIPT_WEAPON_ITEM_TYPES.has(normalizeItemType(item.itemType));

export const getScriptEligibleWeapons = (items: ArcItem[]) => {
  const names = new Set(
    items
      .filter(isScriptWeaponAllowed)
      .map((item) => normalizeWeaponName(item.name))
      .filter(Boolean)
  );

  return [...names].sort((left, right) => left.localeCompare(right));
};

export const getScriptEligibleWeaponsByRarity = (items: ArcItem[]) => {
  const weaponRarityByName = new Map<string, string>();

  for (const item of items) {
    if (!isScriptWeaponAllowed(item)) {
      continue;
    }

    const weaponName = normalizeWeaponName(item.name);
    const rarity = normalizeRarity(item.rarity);

    if (!weaponName || !rarity) {
      continue;
    }

    if (!weaponRarityByName.has(weaponName)) {
      weaponRarityByName.set(weaponName, rarity);
    }
  }

  const weaponsByRarity = new Map<string, Set<string>>();

  for (const [weaponName, rarity] of weaponRarityByName.entries()) {
    const weapons = weaponsByRarity.get(rarity) ?? new Set<string>();
    weapons.add(weaponName);
    weaponsByRarity.set(rarity, weapons);
  }

  return new Map(
    [...weaponsByRarity.entries()].map(([rarity, weapons]) => [
      rarity,
      [...weapons].sort((left, right) => left.localeCompare(right)),
    ])
  );
};

export const pickWeightedWeaponRarity = (
  weaponsByRarity: Map<string, string[]>,
  randomValue: number
) => {
  const availableRarities = WEAPON_RARITY_WEIGHTS.filter(
    ({ rarity }) => (weaponsByRarity.get(rarity)?.length ?? 0) > 0
  );

  if (!availableRarities.length) {
    return undefined;
  }

  const totalWeight = availableRarities.reduce(
    (sum, option) => sum + option.weight,
    0
  );
  const threshold = randomValue * totalWeight;
  let cumulativeWeight = 0;

  for (const option of availableRarities) {
    cumulativeWeight += option.weight;

    if (threshold < cumulativeWeight) {
      return option.rarity;
    }
  }

  return availableRarities[availableRarities.length - 1]?.rarity;
};

export const getRandomWeaponName = async () => {
  const payload = await loadArcItems();
  const weaponsByRarity = getScriptEligibleWeaponsByRarity(payload.items);
  const rarity = pickWeightedWeaponRarity(weaponsByRarity, Math.random());

  if (!rarity) {
    return undefined;
  }

  const weapons = weaponsByRarity.get(rarity) ?? [];

  if (!weapons.length) {
    return undefined;
  }

  return weapons[Math.floor(Math.random() * weapons.length)];
};

export const getRandomWeaponAnnouncement = async () => {
  const weaponName = await getRandomWeaponName();
  if (!weaponName) {
    return "Aktuell konnten keine Waffen-Daten geladen werden.";
  }

  return `Waffe: ${weaponName}`;
};
