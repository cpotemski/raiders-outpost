import { Prisma } from "@prisma/client";
import { setTimeout as sleep } from "node:timers/promises";
import type { AppLocale } from "@/lib/locale";
import {
  translateMapConditionName,
  translateMapName,
} from "@/lib/map-condition-labels";
import { prisma } from "@/lib/prisma";

const CACHE_KEY = "scripts:map-conditions";
const DEFAULT_SOURCE_URL =
  process.env.ARC_MAP_CONDITIONS_SOURCE_URL ??
  "https://arcraiders.com/de/map-conditions";
const FALLBACK_MAPS = [
  "Buried City",
  "Dam Battlegrounds",
  "Riven Tides",
  "Spaceport",
  "Stella Montis",
  "The Blue Gate",
];
const REFRESH_LEASE_MS = 2 * 60 * 1000;
const REFRESH_WAIT_MS = 400;
const REFRESH_WAIT_ATTEMPTS = 8;

export type ActiveMapCondition = {
  condition: string;
  map: string;
  timeLabel: string;
};

export type ActiveMapConditionsSnapshot = {
  activeEntries: ActiveMapCondition[];
  knownMaps: string[];
  fetchedAt: string;
  sourceUrl: string;
};

type ScriptCachePayload = {
  activeEntries: ActiveMapCondition[];
  knownMaps: string[];
};

const decodeHtmlText = (value: string) =>
  value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();

const dedupe = (values: string[]) => [...new Set(values.filter(Boolean))];

const getCurrentHalfHourWindowStart = (now: Date) => {
  const start = new Date(now);
  start.setUTCMinutes(now.getUTCMinutes() < 30 ? 0 : 30, 0, 0);
  return start;
};

export const isCurrentHalfHourCache = (fetchedAt: Date, now = new Date()) =>
  fetchedAt.getTime() >= getCurrentHalfHourWindowStart(now).getTime();

const parseKnownMapsFromHtml = (html: string) => {
  const matches = html.matchAll(
    /href="\/de\/map-conditions\/map\/[^"]+">([^<]+)<\/a>/g
  );
  return dedupe(
    [...matches].map((match) => decodeHtmlText(match[1] ?? ""))
  );
};

const parseActiveSectionFromHtml = (html: string) => {
  const match = html.match(
    /<h2[^>]*>\s*Active now\s*<\/h2>([\s\S]*?)<\/section>/
  );
  return match?.[1] ?? null;
};

export const parseActiveEntriesFromHtml = (
  html: string
): ActiveMapCondition[] => {
  const activeSection = parseActiveSectionFromHtml(html);
  if (!activeSection) {
    throw new Error("Unable to find Active now section in map conditions page.");
  }

  const matches = activeSection.matchAll(
    /<a class="map-condition-card_row[\s\S]*?<span class="map-condition-card_conditionName[^"]*">([^<]+)<\/span><span class="map-condition-card_map[^"]*"><button[^>]*>([^<]+)<\/button><\/span>[\s\S]*?<span class="map-condition-card_time[^"]*">([^<]+)<\/span>/g
  );

  return [...matches].map((match) => ({
    condition: decodeHtmlText(match[1] ?? ""),
    map: decodeHtmlText(match[2] ?? ""),
    timeLabel: decodeHtmlText(match[3] ?? ""),
  }));
};

const toCachePayload = (payload: Prisma.JsonValue): ScriptCachePayload | null => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const record = payload as {
    activeEntries?: unknown;
    knownMaps?: unknown;
  };

  if (!Array.isArray(record.activeEntries) || !Array.isArray(record.knownMaps)) {
    return null;
  }

  const activeEntries = record.activeEntries
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const candidate = entry as {
        condition?: unknown;
        map?: unknown;
        timeLabel?: unknown;
      };
      if (
        typeof candidate.condition !== "string" ||
        typeof candidate.map !== "string" ||
        typeof candidate.timeLabel !== "string"
      ) {
        return null;
      }

      return {
        condition: candidate.condition,
        map: candidate.map,
        timeLabel: candidate.timeLabel,
      };
    })
    .filter(
      (entry): entry is ActiveMapCondition =>
        Boolean(entry?.condition && entry?.map && entry?.timeLabel)
    );

  const knownMaps = record.knownMaps.filter(
    (entry: unknown): entry is string => typeof entry === "string" && Boolean(entry)
  );

  if (!knownMaps.length) {
    return null;
  }

  return {
    activeEntries,
    knownMaps: dedupe(knownMaps),
  };
};

const normalizeSnapshot = (
  payload: ScriptCachePayload,
  fetchedAt: Date,
  sourceUrl: string
): ActiveMapConditionsSnapshot => ({
  activeEntries: payload.activeEntries,
  knownMaps: payload.knownMaps.length ? payload.knownMaps : FALLBACK_MAPS,
  fetchedAt: fetchedAt.toISOString(),
  sourceUrl,
});

const readSnapshotFromCache = async () => {
  const cache = await prisma.scriptCache.findUnique({
    where: { key: CACHE_KEY },
  });

  if (!cache) {
    return null;
  }

  const payload = toCachePayload(cache.payload);
  if (!payload) {
    return null;
  }

  return normalizeSnapshot(payload, cache.fetchedAt, cache.sourceUrl);
};

const fetchMapConditionsHtml = async () => {
  const response = await fetch(DEFAULT_SOURCE_URL, {
    headers: {
      "User-Agent": "RaidersOutpost/1.0 (+https://arcraiders.com)",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch map conditions page: ${response.status} ${response.statusText}`
    );
  }

  return response.text();
};

const buildCachePayloadFromHtml = (html: string): ScriptCachePayload => {
  const activeEntries = parseActiveEntriesFromHtml(html);
  const knownMaps = parseKnownMapsFromHtml(html);

  return {
    activeEntries,
    knownMaps: knownMaps.length ? knownMaps : FALLBACK_MAPS,
  };
};

const persistSnapshot = async (payload: ScriptCachePayload) => {
  const fetchedAt = new Date();
  const record = await prisma.scriptCache.upsert({
    where: { key: CACHE_KEY },
    update: {
      payload: payload as Prisma.InputJsonValue,
      sourceUrl: DEFAULT_SOURCE_URL,
      fetchedAt,
      refreshStartedAt: null,
    },
    create: {
      key: CACHE_KEY,
      payload: payload as Prisma.InputJsonValue,
      sourceUrl: DEFAULT_SOURCE_URL,
      fetchedAt,
      refreshStartedAt: null,
    },
  });

  return normalizeSnapshot(payload, record.fetchedAt, record.sourceUrl);
};

const acquireRefreshLease = async () => {
  await prisma.scriptCache.upsert({
    where: { key: CACHE_KEY },
    update: {},
    create: {
      key: CACHE_KEY,
      payload: {
        activeEntries: [],
        knownMaps: FALLBACK_MAPS,
      } as Prisma.InputJsonValue,
      sourceUrl: DEFAULT_SOURCE_URL,
      fetchedAt: new Date(0),
      refreshStartedAt: null,
    },
  });

  const leaseCutoff = new Date(Date.now() - REFRESH_LEASE_MS);
  const lease = await prisma.scriptCache.updateMany({
    where: {
      key: CACHE_KEY,
      OR: [
        { refreshStartedAt: null },
        { refreshStartedAt: { lt: leaseCutoff } },
      ],
    },
    data: {
      refreshStartedAt: new Date(),
    },
  });

  return lease.count > 0;
};

const releaseRefreshLease = async () => {
  await prisma.scriptCache.updateMany({
    where: { key: CACHE_KEY },
    data: { refreshStartedAt: null },
  });
};

const waitForFreshSnapshot = async (now: Date) => {
  for (let attempt = 0; attempt < REFRESH_WAIT_ATTEMPTS; attempt += 1) {
    await sleep(REFRESH_WAIT_MS);
    const snapshot = await readSnapshotFromCache();
    if (
      snapshot &&
      isCurrentHalfHourCache(new Date(snapshot.fetchedAt), now)
    ) {
      return snapshot;
    }
  }

  return null;
};

const refreshSnapshot = async () => {
  const html = await fetchMapConditionsHtml();
  const payload = buildCachePayloadFromHtml(html);
  return persistSnapshot(payload);
};

export const getActiveMapConditionsSnapshot = async (
  now = new Date()
): Promise<ActiveMapConditionsSnapshot> => {
  const cached = await readSnapshotFromCache();
  if (cached && isCurrentHalfHourCache(new Date(cached.fetchedAt), now)) {
    return cached;
  }

  const hasLease = await acquireRefreshLease();
  if (!hasLease) {
    const waited = await waitForFreshSnapshot(now);
    if (waited) {
      return waited;
    }

    if (cached) {
      return cached;
    }

    throw new Error("Map conditions refresh is already running.");
  }

  try {
    return await refreshSnapshot();
  } catch (error) {
    if (cached) {
      return cached;
    }

    throw error;
  } finally {
    await releaseRefreshLease();
  }
};

export const getMapStates = (
  snapshot: ActiveMapConditionsSnapshot,
  locale: AppLocale = "de"
) => {
  return dedupe(
    snapshot.knownMaps.length ? snapshot.knownMaps : FALLBACK_MAPS
  ).map((map) => ({
    map: translateMapName(map, locale),
    activeConditions: snapshot.activeEntries
      .filter((entry) => entry.map === map)
      .map((entry) => translateMapConditionName(entry.condition, locale)),
  }));
};

export const formatRandomMapAnnouncement = (
  snapshot: ActiveMapConditionsSnapshot,
  random = Math.random,
  locale: AppLocale = "de"
) => {
  const maps = getMapStates(snapshot, locale);
  const selectedMap = maps[Math.floor(random() * maps.length)];

  if (!selectedMap || !selectedMap.activeConditions.length) {
    return `Map: ${selectedMap?.map ?? "Unbekannt"}`;
  }

  const selectedCondition =
    selectedMap.activeConditions[
      Math.floor(random() * selectedMap.activeConditions.length)
    ];

  return `Map: ${selectedMap.map} - ${selectedCondition}`;
};

export const getRandomMapAnnouncement = async (locale: AppLocale = "de") => {
  const snapshot = await getActiveMapConditionsSnapshot();
  return formatRandomMapAnnouncement(snapshot, Math.random, locale);
};
