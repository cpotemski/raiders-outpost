import { loadArcBots } from "@/lib/arc-bots";

export const getRandomArcAnnouncement = async () => {
  const payload = await loadArcBots();
  const bots = payload.bots.filter((bot) => bot.name.trim().length > 0);

  if (!bots.length) {
    return "Aktuell konnten keine ARC-Daten geladen werden.";
  }

  const randomBot = bots[Math.floor(Math.random() * bots.length)];
  return `ARC: ${randomBot.name}`;
};
