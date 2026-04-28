import type { AppLocale } from "@/lib/locale";

const BOT_ALIASES: Record<string, string> = {
  "ARC Assessor": "ARC Assessor",
  "ARC ASSESSOR": "ARC Assessor",
  BASTION: "BASTION",
  Bastion: "BASTION",
  BOMBARDIER: "BOMBARDIER",
  Bombardier: "BOMBARDIER",
  Comet: "Comet",
  FIREBALL: "FIREBALL",
  Fireball: "FIREBALL",
  Firefly: "Firefly",
  HORNET: "HORNET",
  Hornet: "HORNET",
  LEAPER: "LEAPER",
  Leaper: "LEAPER",
  MATRIARCH: "MATRIARCH",
  Matriarch: "MATRIARCH",
  POP: "POP",
  Pop: "POP",
  Queen: "THE QUEEN",
  ROCKETEER: "ROCKETEER",
  Rocketeer: "ROCKETEER",
  SENTINEL: "SENTINEL",
  Sentinel: "SENTINEL",
  SHREDDER: "SHREDDER",
  Shredder: "SHREDDER",
  SNITCH: "SNITCH",
  Snitch: "SNITCH",
  SPOTTER: "SPOTTER",
  Spotter: "SPOTTER",
  SURVEYOR: "SURVEYOR",
  Surveyor: "SURVEYOR",
  "THE QUEEN": "THE QUEEN",
  TICK: "TICK",
  Tick: "TICK",
  Turbine: "Turbine",
  TURRET: "TURRET",
  Turret: "TURRET",
  Vaporizer: "Vaporizer",
  WASP: "WASP",
  Wasp: "WASP",
};

const BOT_LABELS: Record<string, Record<AppLocale, string>> = {
  "ARC Assessor": {
    de: "Prüfer",
    en: "ARC Assessor",
  },
  BASTION: {
    de: "Bastion",
    en: "Bastion",
  },
  BOMBARDIER: {
    de: "Kanonier",
    en: "Bombadier",
  },
  Comet: {
    de: "Komet",
    en: "Comet",
  },
  FIREBALL: {
    de: "Feuerball",
    en: "Fireball",
  },
  Firefly: {
    de: "Feuerfliege",
    en: "Firefly",
  },
  HORNET: {
    de: "Hornisse",
    en: "Hornet",
  },
  LEAPER: {
    de: "Springer",
    en: "Leaper",
  },
  MATRIARCH: {
    de: "Matriarchin",
    en: "Matriarch",
  },
  POP: {
    de: "Pop",
    en: "Pop",
  },
  ROCKETEER: {
    de: "Raketenkanonier",
    en: "Rocketeer",
  },
  SENTINEL: {
    de: "Wächter",
    en: "Sentinel",
  },
  SHREDDER: {
    de: "Schredder",
    en: "Shredder",
  },
  SNITCH: {
    de: "Spitzel",
    en: "Snitch",
  },
  SPOTTER: {
    de: "Späher",
    en: "Spotter",
  },
  SURVEYOR: {
    de: "Beobachter",
    en: "Surveyor",
  },
  "THE QUEEN": {
    de: "Königin",
    en: "Queen",
  },
  TICK: {
    de: "Zecke",
    en: "Tick",
  },
  Turbine: {
    de: "Turbine",
    en: "Turbine",
  },
  TURRET: {
    de: "Geschütz",
    en: "Turret",
  },
  Vaporizer: {
    de: "Verdampfer",
    en: "Vaporizer",
  },
  WASP: {
    de: "Wespe",
    en: "Wasp",
  },
};

export const normalizeBotName = (value: string) => BOT_ALIASES[value] ?? value;

export const translateBotName = (value: string, locale: AppLocale) => {
  const canonical = normalizeBotName(value);
  const entry = BOT_LABELS[canonical];
  return entry?.[locale] ?? entry?.en ?? canonical;
};
