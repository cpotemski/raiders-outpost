const LOADOUT_OPTIONS = [
  { value: "normal", weight: 55 },
  { value: "free", weight: 25 },
  { value: "ohne waffe", weight: 15 },
  { value: "naked", weight: 5 },
] as const;

export const pickWeightedLoadout = (randomValue: number) => {
  const threshold = randomValue * 100;
  let cumulativeWeight = 0;

  for (const option of LOADOUT_OPTIONS) {
    cumulativeWeight += option.weight;

    if (threshold < cumulativeWeight) {
      return option.value;
    }
  }

  return LOADOUT_OPTIONS[LOADOUT_OPTIONS.length - 1].value;
};

export const getRandomLoadout = () => pickWeightedLoadout(Math.random());

export const getRandomLoadoutAnnouncement = () => {
  const loadout = getRandomLoadout();

  return `Loadout: ${loadout}`;
};
