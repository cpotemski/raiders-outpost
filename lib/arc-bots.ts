import botsData from "arcraiders-data/bots.json";
import {
  getOverridePath,
  mergeWithOverride,
  readJsonFileIfExists,
} from "@/lib/arc-overrides";
import { translateBotName } from "@/lib/arc-bot-labels";
import type { AppLocale } from "@/lib/locale";

type ArcBotSource = {
  id: string;
  name: string;
};

export type ArcBot = {
  id: string;
  name: string;
};

export type ArcBotPayload = {
  bots: ArcBot[];
  sourceUrl: string;
};

export const loadArcBots = async (
  locale: AppLocale = "de"
): Promise<ArcBotPayload> => {
  const overrideBots = await readJsonFileIfExists<ArcBotSource[]>(
    getOverridePath("bots.json")
  );
  const mergedBots =
    mergeWithOverride(
      botsData as ArcBotSource[] | undefined,
      overrideBots ?? undefined
    ) ?? [];

  const bots = mergedBots
    .filter(
      (bot): bot is ArcBotSource =>
        Boolean(bot?.id) && typeof bot.name === "string" && bot.name.trim().length > 0
    )
    .map((bot) => ({
      id: bot.id,
      name: translateBotName(bot.name, locale),
    }))
    .sort((left, right) => left.name.localeCompare(right.name));

  return {
    bots,
    sourceUrl: "raidtheory/arcraiders-data + local overrides",
  };
};
