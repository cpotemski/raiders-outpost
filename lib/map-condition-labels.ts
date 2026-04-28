import type { AppLocale } from "@/lib/locale";

const MAP_ALIASES: Record<string, string> = {
  "Buried City": "Buried City",
  Dam: "Dam Battlegrounds",
  "Dam Battleground": "Dam Battlegrounds",
  "Dam Battlegrounds": "Dam Battlegrounds",
  "Riven Tides": "Riven Tides",
  Spaceport: "The Spaceport",
  "The Spaceport": "The Spaceport",
  "Blue Gate": "The Blue Gate",
  "The Blue Gate": "The Blue Gate",
  "Stella Montis": "Stella Montis",
};

const MAP_LABELS: Record<string, Record<AppLocale, string>> = {
  "Buried City": {
    de: "Begrabene Stadt",
    en: "Buried City",
  },
  "Dam Battlegrounds": {
    de: "Damm-Schlachtfelder",
    en: "Dam Battlegrounds",
  },
  "Riven Tides": {
    de: "Riven Tides",
    en: "Riven Tides",
  },
  "The Spaceport": {
    de: "Raumhafen",
    en: "Spaceport",
  },
  "The Blue Gate": {
    de: "Blaues Tor",
    en: "Blue Gate",
  },
  "Stella Montis": {
    de: "Stella Montis",
    en: "Stella Montis",
  },
};

const EVENT_ALIASES: Record<string, string> = {
  Beachcombing: "Beachcombing",
  Hurricane: "Hurricane",
  "Lush Blooms": "Lush Blooms",
  "Night Raid": "Night Raid",
  "Bird City": "Bird City",
  Harvester: "Harvester",
  Matriarch: "Matriarch",
  "Close Scrutiny": "Close Scrutiny",
  "Electromagnetic Storm": "Electromagnetic Storm",
  "Launch Tower Loot": "Launch Tower Loot",
  "Locked Gate": "Locked Gate",
  "Cold Snap": "Cold Snap",
  "Hidden Bunker": "Hidden Bunker",
  "Prospecting Probes": "Prospecting Probes",
  "Husk Graveyard": "Husk Graveyard",
  "Uncovered Caches": "Uncovered Caches",
  None: "None",
};

export const EVENT_LABELS: Record<string, Record<AppLocale, string>> = {
  Beachcombing: {
    de: "Standgut-Suche",
    en: "Beachcombing",
  },
  Hurricane: {
    de: "Hurrikan",
    en: "Hurricane",
  },
  "Lush Blooms": {
    de: "Blütezeit",
    en: "Lush Blooms",
  },
  "Night Raid": {
    de: "Nächtliche Plünderung",
    en: "Night Raid",
  },
  "Bird City": {
    de: "Vogelstadt",
    en: "Bird City",
  },
  Harvester: {
    de: "Ernter",
    en: "Harvester",
  },
  Matriarch: {
    de: "Matriarchin",
    en: "Matriarch",
  },
  "Close Scrutiny": {
    de: "Genaue Prüfung",
    en: "Close Scrutiny",
  },
  "Electromagnetic Storm": {
    de: "Elektromagnetischer Sturm",
    en: "Electromagnetic Storm",
  },
  "Launch Tower Loot": {
    de: "Startturm-Beute",
    en: "Launch Tower Loot",
  },
  "Locked Gate": {
    de: "Gesperrtes Tor",
    en: "Locked Gate",
  },
  "Cold Snap": {
    de: "Kältewelle",
    en: "Cold Snap",
  },
  "Hidden Bunker": {
    de: "Versteckter Bunker",
    en: "Hidden Bunker",
  },
  "Prospecting Probes": {
    de: "Suchende Sonden",
    en: "Prospecting Probes",
  },
  "Husk Graveyard": {
    de: "Hüllen-Friedhof",
    en: "Husk Graveyard",
  },
  "Uncovered Caches": {
    de: "Freigelegte Geheimvorräte",
    en: "Uncovered Caches",
  },
  None: {
    de: "Keine",
    en: "None",
  },
};

export const KNOWN_MAPS = Object.keys(MAP_LABELS);

export const normalizeMapName = (value: string) => MAP_ALIASES[value] ?? value;

const resolveLabel = (
  value: string,
  locale: AppLocale,
  aliases: Record<string, string>,
  labels: Record<string, Record<AppLocale, string>>
) => {
  const canonical = aliases[value] ?? value;
  const entry = labels[canonical];
  return entry?.[locale] ?? entry?.en ?? canonical;
};

export const translateMapName = (value: string, locale: AppLocale) =>
  resolveLabel(value, locale, MAP_ALIASES, MAP_LABELS);

export const translateMapConditionName = (value: string, locale: AppLocale) =>
  resolveLabel(value, locale, EVENT_ALIASES, EVENT_LABELS);
