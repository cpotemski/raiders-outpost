import fs from "node:fs/promises";
import path from "node:path";
import { unstable_cache } from "next/cache";

export type ArcItem = {
  id?: string;
  name: string;
  rarity: string;
  itemType: string;
  imageFile: string | null;
};

export type ArcItemPayload = {
  scrapedAt: string;
  count: number;
  items: ArcItem[];
};

const DATA_DIR = path.join(
  process.cwd(),
  "node_modules/arcraiders-data/items"
);
const IMAGE_DIR = path.join(
  process.cwd(),
  "node_modules/arcraiders-data/images/items"
);

type ArcItemSource = {
  id: string;
  name?: Record<string, string>;
  type?: string;
  rarity?: string;
  imageFilename?: string;
  updatedAt?: string;
};

const parseUpdatedAt = (value?: string) => {
  if (!value) return null;
  const parts = value.split("/");
  if (parts.length !== 3) return null;
  const [month, day, year] = parts.map((entry) => Number(entry));
  if (!month || !day || !year) return null;
  return new Date(Date.UTC(year, month - 1, day));
};

const readArcItems = unstable_cache(
  async (): Promise<ArcItemPayload> => {
    const [itemFiles, imageFiles] = await Promise.all([
      fs.readdir(DATA_DIR),
      fs.readdir(IMAGE_DIR).catch(() => [] as string[]),
    ]);
    const imageSet = new Set(imageFiles);

    const items = await Promise.all(
      itemFiles
        .filter((file) => file.endsWith(".json"))
        .map(async (file) => {
          const raw = await fs.readFile(path.join(DATA_DIR, file), "utf-8");
          const item = JSON.parse(raw) as ArcItemSource;
          const id = item.id ?? file.replace(/\.json$/, "");
          const imageFile = imageSet.has(`${id}.png`) ? `${id}.png` : null;
          return {
            id,
            name: item.name?.en ?? item.name?.de ?? item.name?.fr ?? id,
            rarity: item.rarity ?? "Unknown",
            itemType: item.type ?? "Unknown",
            imageFile,
            updatedAt: item.updatedAt,
          };
        })
    );

    const latestUpdated = items
      .map((item) => parseUpdatedAt(item.updatedAt))
      .filter((date): date is Date => Boolean(date))
      .sort((a, b) => b.getTime() - a.getTime())[0];

    return {
      scrapedAt: (latestUpdated ?? new Date()).toISOString(),
      count: items.length,
      items: items
        .map(({ updatedAt, ...rest }) => rest)
        .sort((a, b) => a.name.localeCompare(b.name)),
    };
  },
  ["arc-items"],
  { revalidate: 3600 }
);

export const loadArcItems = async (): Promise<ArcItemPayload> => {
  return readArcItems();
};
