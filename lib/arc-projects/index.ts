import fs from "node:fs/promises";
import path from "node:path";
import { loadArcItems } from "@/lib/arc-items";

export type ArcProjectItem = {
  itemId: string;
  displayName: string;
  quantityRequired: number;
};

export type ArcProjectStage = {
  stageKey: string;
  name: string;
  sortOrder: number;
  items: ArcProjectItem[];
};

export type ArcProject = {
  slug: string;
  name: string;
  kind: "workshop" | "project" | "blueprints";
  repeatable: boolean;
  timeLimitedUntil: string | null;
  stages: ArcProjectStage[];
};

export type ArcProjectPayload = {
  scrapedAt: string;
  sourceUrl: string;
  projects: ArcProject[];
};

const DATA_PATH = path.join(process.cwd(), "lib/arc-projects/data/projects.json");

const buildBlueprintFallback = async (): Promise<ArcProjectPayload> => {
  const items = await loadArcItems();
  const blueprints = items.items
    .filter((item) => item.itemType === "Blueprint")
    .map((item) => ({
      itemId: item.id ?? item.imageFile.replace(/\.[^/.]+$/, ""),
      displayName: item.name,
      quantityRequired: 1,
    }));

  return {
    scrapedAt: new Date().toISOString(),
    sourceUrl: "local-fallback",
    projects: [
      {
        slug: "blueprints",
        name: "Blueprint Cache",
        kind: "blueprints",
        repeatable: false,
        timeLimitedUntil: null,
        stages: [
          {
            stageKey: "phase-1",
            name: "Phase 01",
            sortOrder: 1,
            items: blueprints,
          },
        ],
      },
    ],
  };
};

export const loadArcProjects = async (): Promise<ArcProjectPayload> => {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf-8");
    return JSON.parse(raw) as ArcProjectPayload;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return await buildBlueprintFallback();
    }
    throw error;
  }
};
