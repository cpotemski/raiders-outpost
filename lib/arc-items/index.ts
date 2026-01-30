import fs from "node:fs/promises";
import path from "node:path";

export type ArcItem = {
  id?: string;
  name: string;
  rarity: string;
  itemType: string;
  imageFile: string;
};

export type ArcItemPayload = {
  scrapedAt: string;
  count: number;
  items: ArcItem[];
};

const DATA_PATH = path.join(process.cwd(), "lib/arc-items/data/items.json");

export const loadArcItems = async (): Promise<ArcItemPayload> => {
  const raw = await fs.readFile(DATA_PATH, "utf-8");
  const payload = JSON.parse(raw) as ArcItemPayload;
  const items = payload.items.map((item) => ({
    ...item,
    id: item.id ?? item.imageFile.replace(/\.[^/.]+$/, ""),
  }));
  return { ...payload, items };
};
