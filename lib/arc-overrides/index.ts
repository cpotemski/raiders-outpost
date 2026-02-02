import fs from "node:fs/promises";
import path from "node:path";

const OVERRIDES_ROOT = path.join(process.cwd(), "data/arc-overrides");

const cloneValue = <T>(value: T): T => {
  if (value === undefined) {
    return value;
  }

  if (typeof globalThis.structuredClone === "function") {
    return globalThis.structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value));
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const KEY_FIELDS = ["id", "slug", "stageKey", "itemId", "level"];

const findKeyField = (value: unknown): string | undefined => {
  if (!isPlainObject(value)) return undefined;
  return KEY_FIELDS.find((field) => field in value && typeof value[field] !== "undefined");
};

const mergeArrayDeep = (base: unknown[], override: unknown[]): unknown[] => {
  const overrideKeyed = new Map<string, unknown>();
  const overrideUnkeyed: unknown[] = [];

  for (const entry of override) {
    const keyField = findKeyField(entry);
    if (keyField) {
      const keyValue = String((entry as Record<string, unknown>)[keyField]);
      overrideKeyed.set(`${keyField}:${keyValue}`, entry);
    } else {
      overrideUnkeyed.push(entry);
    }
  }

  const result: unknown[] = [];

  for (const entry of base) {
    const keyField = findKeyField(entry);
    const compositeKey = keyField
      ? `${keyField}:${String((entry as Record<string, unknown>)[keyField])}`
      : undefined;

    if (compositeKey && overrideKeyed.has(compositeKey)) {
      const overrideEntry = overrideKeyed.get(compositeKey)!;
      result.push(deepMerge(entry, overrideEntry));
      overrideKeyed.delete(compositeKey);
      continue;
    }

    result.push(cloneValue(entry));
  }

  for (const overrideEntry of overrideKeyed.values()) {
    result.push(cloneValue(overrideEntry));
  }

  for (const entry of overrideUnkeyed) {
    result.push(cloneValue(entry));
  }

  return result;
};

const deepMerge = (base: unknown, override: unknown): unknown => {
  if (override === undefined) return cloneValue(base);
  if (base === undefined) return cloneValue(override);

  if (Array.isArray(base) && Array.isArray(override)) {
    const bothObjects = base.every(isPlainObject) && override.every(isPlainObject);
    if (bothObjects) {
      return mergeArrayDeep(base, override);
    }
    return cloneValue(override);
  }

  if (isPlainObject(base) && isPlainObject(override)) {
    const keys = new Set<string>([
      ...Object.keys(base),
      ...Object.keys(override),
    ]);
    const merged: Record<string, unknown> = {};
    for (const key of keys) {
      merged[key] = deepMerge(base[key], override[key]);
    }
    return merged;
  }

  return cloneValue(override);
};

const isNotFoundError = (error: unknown): error is NodeJS.ErrnoException =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  (error as NodeJS.ErrnoException).code === "ENOENT";

export const readJsonFileIfExists = async <T>(filePath: string): Promise<T | null> => {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch (error: unknown) {
    if (isNotFoundError(error)) return null;
    throw error;
  }
};

export const listOverrideDir = async (...segments: string[]): Promise<string[]> => {
  try {
    const directory = path.join(OVERRIDES_ROOT, ...segments);
    return await fs.readdir(directory);
  } catch (error: unknown) {
    if (isNotFoundError(error)) return [];
    throw error;
  }
};

export const getOverridePath = (...segments: string[]): string =>
  path.join(OVERRIDES_ROOT, ...segments);

export const mergeWithOverride = <T>(
  base: T | undefined,
  override: T | undefined
): T | undefined => {
  if (base === undefined && override === undefined) return undefined;
  if (base === undefined) return cloneValue(override);
  if (override === undefined) return cloneValue(base);
  return deepMerge(base, override) as T;
};
