import { loadArcBots } from "@/lib/arc-bots";

export const getRandomArcName = async () => {
  const payload = await loadArcBots();
  const bots = payload.bots.filter((bot) => bot.name.trim().length > 0);

  if (!bots.length) {
    return undefined;
  }

  return bots[Math.floor(Math.random() * bots.length)]?.name;
};

export const getRandomArcAnnouncement = async () => {
  const botName = await getRandomArcName();
  if (!botName) {
    return "Aktuell konnten keine ARC-Daten geladen werden.";
  }

  return `ARC: ${botName}`;
};
