import { Prisma } from "@prisma/client";
import { setTimeout as sleep } from "node:timers/promises";
import type { AppLocale } from "@/lib/locale";
import {
  KNOWN_MAPS,
  normalizeMapName,
  translateMapConditionName,
  translateMapName,
} from "@/lib/map-condition-labels";
import { prisma } from "@/lib/prisma";

const CACHE_KEY = "scripts:map-conditions";
const DEFAULT_SOURCE_URL =
  process.env.ARC_EVENTS_SCHEDULE_SOURCE_URL ??
  "https://metaforge.app/api/arc-raiders/events-schedule";
const CACHE_TTL_MS = 5 * 60 * 1000;
const REFRESH_LEASE_MS = 2 * 60 * 1000;
const REFRESH_WAIT_MS = 400;
const REFRESH_WAIT_ATTEMPTS = 8;

type ScheduledEvent = {
  name: string;
  map: string;
  startTime: number;
  endTime: number;
};

type EventsScheduleResponse = {
  cachedAt?: number;
  data?: unknown;
};

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
  cachedAtMs: number;
  knownMaps: string[];
  schedule: ScheduledEvent[];
};

const dedupe = (values: string[]) => [...new Set(values.filter(Boolean))];

const isScheduledEvent = (value: unknown): value is ScheduledEvent => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.name === "string" &&
    typeof candidate.map === "string" &&
    typeof candidate.startTime === "number" &&
    typeof candidate.endTime === "number"
  );
};

const toCachePayload = (payload: Prisma.JsonValue): ScriptCachePayload | null => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const record = payload as {
    cachedAtMs?: unknown;
    knownMaps?: unknown;
    schedule?: unknown;
  };

  if (
    typeof record.cachedAtMs !== "number" ||
    !Array.isArray(record.knownMaps) ||
    !Array.isArray(record.schedule)
  ) {
    return null;
  }

  const knownMaps = record.knownMaps.filter(
    (entry: unknown): entry is string => typeof entry === "string" && Boolean(entry)
  );
  const schedule = record.schedule.filter(isScheduledEvent);

  return {
    cachedAtMs: record.cachedAtMs,
    knownMaps: dedupe(knownMaps),
    schedule,
  };
};

const normalizeSnapshot = (
  payload: ScriptCachePayload,
  sourceUrl: string,
  now = new Date()
): ActiveMapConditionsSnapshot => {
  const nowMs = now.getTime();

  return {
    activeEntries: payload.schedule
      .filter((entry) => entry.startTime <= nowMs && entry.endTime > nowMs)
      .map((entry) => ({
        condition: entry.name,
        map: normalizeMapName(entry.map),
        timeLabel: `${new Date(entry.startTime).toISOString()}-${new Date(
          entry.endTime
        ).toISOString()}`,
      })),
    knownMaps: payload.knownMaps.length ? payload.knownMaps : KNOWN_MAPS,
    fetchedAt: new Date(payload.cachedAtMs).toISOString(),
    sourceUrl,
  };
};

const getNextBoundaryTs = (schedule: ScheduledEvent[], nowMs: number) => {
  const futureBoundaries = schedule.flatMap((entry) => [entry.startTime, entry.endTime]);
  const nextBoundary = futureBoundaries
    .filter((value) => value > nowMs)
    .sort((left, right) => left - right)[0];

  return nextBoundary ?? nowMs + CACHE_TTL_MS;
};

const isFreshCachePayload = (payload: ScriptCachePayload, now = new Date()) => {
  const nowMs = now.getTime();
  const ttlFresh = payload.cachedAtMs + CACHE_TTL_MS > nowMs;
  const beforeNextBoundary = nowMs < getNextBoundaryTs(payload.schedule, nowMs);
  return ttlFresh && beforeNextBoundary;
};

const readSnapshotFromCache = async (now = new Date()) => {
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

  return {
    fresh: isFreshCachePayload(payload, now),
    snapshot: normalizeSnapshot(payload, cache.sourceUrl, now),
  };
};

const fetchEventsSchedule = async (): Promise<ScriptCachePayload> => {
  const response = await fetch(DEFAULT_SOURCE_URL, {
    headers: {
      "User-Agent": "RaidersOutpost/1.0 (+https://metaforge.app)",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch events schedule: ${response.status} ${response.statusText}`
    );
  }

  const payload = (await response.json()) as EventsScheduleResponse;
  const schedule = Array.isArray(payload.data)
    ? payload.data.filter(isScheduledEvent)
    : [];
  const knownMaps = dedupe(
    schedule.map((entry) => normalizeMapName(entry.map)).concat(KNOWN_MAPS)
  );

  return {
    cachedAtMs:
      typeof payload.cachedAt === "number" ? payload.cachedAt : Date.now(),
    knownMaps,
    schedule,
  };
};

const persistSnapshot = async (payload: ScriptCachePayload, now = new Date()) => {
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

  return normalizeSnapshot(payload, record.sourceUrl, now);
};

const acquireRefreshLease = async () => {
  await prisma.scriptCache.upsert({
    where: { key: CACHE_KEY },
    update: {},
    create: {
      key: CACHE_KEY,
      payload: {
        cachedAtMs: 0,
        knownMaps: KNOWN_MAPS,
        schedule: [],
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
    const cached = await readSnapshotFromCache(now);
    if (cached?.fresh) {
      return cached.snapshot;
    }
  }

  return null;
};

const refreshSnapshot = async (now: Date) => {
  const payload = await fetchEventsSchedule();
  return persistSnapshot(payload, now);
};

export const getActiveMapConditionsSnapshot = async (
  now = new Date()
): Promise<ActiveMapConditionsSnapshot> => {
  const cached = await readSnapshotFromCache(now);
  if (cached?.fresh) {
    return cached.snapshot;
  }

  const hasLease = await acquireRefreshLease();
  if (!hasLease) {
    const waited = await waitForFreshSnapshot(now);
    if (waited) {
      return waited;
    }

    if (cached) {
      return cached.snapshot;
    }

    throw new Error("Map conditions refresh is already running.");
  }

  try {
    return await refreshSnapshot(now);
  } catch (error) {
    if (cached) {
      return cached.snapshot;
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
  return dedupe(snapshot.knownMaps.length ? snapshot.knownMaps : KNOWN_MAPS).map(
    (map) => ({
      map: translateMapName(map, locale),
      activeConditions: snapshot.activeEntries
        .filter((entry) => entry.map === map)
        .map((entry) => translateMapConditionName(entry.condition, locale)),
    })
  );
};

export const formatRandomMapAnnouncement = (
  snapshot: ActiveMapConditionsSnapshot,
  random = Math.random,
  locale: AppLocale = "de"
) => {
  const maps = getMapStates(snapshot, locale);
  const selectedMap = maps[Math.floor(random() * maps.length)];

  if (!selectedMap) {
    throw new Error("No known maps available.");
  }

  if (!selectedMap.activeConditions.length) {
    return `Map: ${selectedMap.map}`;
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

export const getRandomMapLabel = async (locale: AppLocale = "de") => {
  const announcement = await getRandomMapAnnouncement(locale);
  return announcement.replace(/^Map:\s*/, "");
};
