import { getRandomArcName } from "@/lib/scripts/random-arc";
import { getRandomMapLabel } from "@/lib/scripts/map-conditions";
import { getRandomScriptItemName } from "@/lib/scripts/random-item";
import { getRandomLoadout } from "@/lib/scripts/random-loadout";
import { getRandomWeaponName } from "@/lib/scripts/random-weapon";

const LOADOUTS_WITHOUT_WEAPON = new Set(["free", "naked", "ohne waffe"]);

export const loadoutNeedsWeapon = (loadout: string) =>
  !LOADOUTS_WITHOUT_WEAPON.has(loadout);

export const getRandomChallengeAnnouncement = async () => {
  const loadout = getRandomLoadout();
  const [mapLabel, arcName, itemName] = await Promise.all([
    getRandomMapLabel(),
    getRandomArcName(),
    getRandomScriptItemName(),
  ]);

  if (!mapLabel || !arcName || !itemName) {
    return "Aktuell konnten keine Challenge-Daten geladen werden.";
  }

  const parts = [`Challenge: Map: ${mapLabel}`, `Loadout: ${loadout}`];

  if (loadoutNeedsWeapon(loadout)) {
    const weaponName = await getRandomWeaponName();
    if (!weaponName) {
      return "Aktuell konnten keine Challenge-Daten geladen werden.";
    }

    parts.push(`Waffe: ${weaponName}`);
  }

  parts.push(`ARC: ${arcName}`, `Item: ${itemName}`);

  return parts.join(" | ");
};
