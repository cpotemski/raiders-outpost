import fs from "node:fs/promises";
import path from "node:path";
import { unstable_cache } from "next/cache";
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

const DATA_PATH = path.join(
  process.cwd(),
  "node_modules/arcraiders-data/projects.json"
);

type ArcProjectSource = {
  id: string;
  disabled?: boolean;
  name?: Record<string, string>;
  phases?: {
    name?: Record<string, string>;
    phase?: number;
    requirementItemIds?: { itemId: string; quantity: number }[];
  }[];
};

const buildBlueprintFallback = async (): Promise<ArcProject> => {
  const items = await loadArcItems();
  const blueprints = items.items
    .filter((item) => item.itemType === "Blueprint")
    .map((item) => ({
      itemId:
        item.id ?? item.imageFile?.replace(/\.[^/.]+$/, "") ?? "unknown",
      displayName: item.name,
      quantityRequired: 1,
    }));

  return {
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
  };
};

const mapProject = (
  project: ArcProjectSource,
  itemNameMap: Map<string, string>
): ArcProject => {
  const stages =
    project.phases?.map((phase) => {
      const sortOrder = Number(phase.phase ?? 0);
      return {
        stageKey: `phase-${sortOrder || 0}`,
        name: phase.name?.en ?? `Phase ${String(sortOrder).padStart(2, "0")}`,
        sortOrder,
        items:
          phase.requirementItemIds?.map((item) => ({
            itemId: item.itemId,
            displayName:
              itemNameMap.get(item.itemId) ?? item.itemId ?? "Unknown",
            quantityRequired: Number(item.quantity ?? 0),
          })) ?? [],
      };
    }) ?? [];

  return {
    slug: project.id,
    name: project.name?.en ?? project.id,
    kind: "project",
    repeatable: false,
    timeLimitedUntil: null,
    stages,
  };
};

const readArcProjects = unstable_cache(
  async (): Promise<ArcProjectPayload> => {
    const raw = await fs.readFile(DATA_PATH, "utf-8");
    const source = JSON.parse(raw) as ArcProjectSource[];
    const items = await loadArcItems();
    const itemNameMap = new Map<string, string>();
    for (const item of items.items) {
      const key = item.id ?? item.imageFile;
      if (key) {
        itemNameMap.set(key, item.name);
      }
    }

    const projects = source
      .filter((project) => !project.disabled)
      .map((project) => mapProject(project, itemNameMap))
      .sort((a, b) => a.name.localeCompare(b.name));

    return {
      scrapedAt: new Date().toISOString(),
      sourceUrl: "raidtheory/arcraiders-data",
      projects: [...projects, await buildBlueprintFallback()],
    };
  },
  ["arc-projects"],
  { revalidate: 3600 }
);

export const loadArcProjects = async (): Promise<ArcProjectPayload> => {
  return readArcProjects();
};
