import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const BASE_URL = "https://metaforge.app";
const NODE_URL =
  "https://metaforge.app/_app/immutable/nodes/40.CjE2e_gJ.js";
const WORKSHOP_CHUNK_URL =
  "https://metaforge.app/_app/immutable/chunks/Bqg73PfA.js";
const SOURCE_URL = `${BASE_URL}/arc-raiders/needed-items`;
const OUT_DIR = path.join(process.cwd(), "lib/arc-projects");
const DATA_PATH = path.join(OUT_DIR, "data/projects.json");
const ITEMS_DATA_PATH = path.join(
  process.cwd(),
  "lib/arc-items/data/items.json"
);

const fetchText = async (url) => {
  const res = await fetch(url, {
    headers: {
      "user-agent": "raiders-outpost-sync/1.0",
      accept: "text/html,application/xhtml+xml",
    },
  });
  if (!res.ok) {
    throw new Error(`Request failed ${res.status} for ${url}`);
  }
  return await res.text();
};

const extractBetweenMarkers = (input, startMarker) => {
  const startIndex = input.indexOf(startMarker);
  if (startIndex === -1) {
    return null;
  }
  let index = startIndex + startMarker.length;
  if (input[index] !== "[") {
    return null;
  }
  let depth = 0;
  for (; index < input.length; index += 1) {
    const ch = input[index];
    if (ch === "[") {
      depth += 1;
    } else if (ch === "]") {
      depth -= 1;
      if (depth === 0) {
        return input.slice(startIndex + startMarker.length, index + 1);
      }
    }
  }
  return null;
};

const toJson = (value) => {
  return value
    .replace(/\bundefined\b/g, "null")
    .replace(/([,{\[])(\s*)([A-Za-z_][A-Za-z0-9_]*)\s*:/g, '$1"$3":')
    .replace(/([{,]\s*)(\d+)\s*:/g, '$1"$2":');
};

const extractProjectSeed = (js) => {
  const raw = extractBetweenMarkers(js, "na=");
  if (!raw) {
    throw new Error("Unable to locate project seed (na array).");
  }
  return JSON.parse(toJson(raw));
};

const extractWorkshopSeed = (js) => {
  const raw = extractBetweenMarkers(js, "const i=");
  if (!raw) {
    throw new Error("Unable to locate workshop seed (const i array).");
  }
  return JSON.parse(toJson(raw));
};

const normalizeProjectSlug = (input) => {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
};

const normalizeStageKey = (input) => {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
};

const loadItemNameMap = async () => {
  const raw = await fs.readFile(ITEMS_DATA_PATH, "utf-8");
  const payload = JSON.parse(raw);
  const map = new Map();
  for (const item of payload.items ?? []) {
    const id = item.id ?? item.imageFile?.replace(/\.[^/.]+$/, "");
    if (id) {
      map.set(id, item.name ?? id);
    }
  }
  return map;
};

const mapWorkshopProjects = (workshopSeed, itemNameMap) => {
  return workshopSeed.map((entry) => {
    const levels = Object.entries(entry.levels ?? {})
      .map(([levelKey, level]) => {
        const sortOrder = Number(levelKey);
        const items = (level?.requiredItems ?? []).map((item) => ({
          itemId: item?.id ?? "unknown",
          displayName: itemNameMap.get(item?.id) ?? item?.id ?? "Unknown",
          quantityRequired: Number(item?.quantity ?? 0),
        }));
        return {
          stageKey: `level-${levelKey}`,
          name: `Level ${String(levelKey).padStart(2, "0")}`,
          sortOrder,
          items,
        };
      })
      .sort((a, b) => a.sortOrder - b.sortOrder);

    return {
      slug: normalizeProjectSlug(`workshop-${entry.id}`),
      name: entry.name ?? entry.id,
      kind: "workshop",
      repeatable: true,
      timeLimitedUntil: null,
      stages: levels,
    };
  });
};

const mapNeededProjects = (projectSeed, itemNameMap) => {
  const grouped = new Map();
  for (const row of projectSeed) {
    const projectName = row.project ?? "Unknown Project";
    const projectSlug = normalizeProjectSlug(`project-${projectName}`);
    const phase = row.phase ?? "Phase";
    const stageKey = normalizeStageKey(phase);
    const sortOrderMatch = String(phase).match(/(\d+)/);
    const sortOrder = sortOrderMatch ? Number(sortOrderMatch[1]) : 0;
    const items = (row.requirements ?? []).map((req) => ({
      itemId: req.id ?? "unknown",
      displayName: req.name ?? itemNameMap.get(req.id) ?? req.id ?? "Unknown",
      quantityRequired: Number(req.need ?? 0),
    }));

    if (!grouped.has(projectSlug)) {
      grouped.set(projectSlug, {
        slug: projectSlug,
        name: projectName,
        kind: "project",
        repeatable: false,
        timeLimitedUntil: null,
        stages: [],
      });
    }

    grouped.get(projectSlug).stages.push({
      stageKey,
      name: phase,
      sortOrder,
      items,
    });
  }

  return Array.from(grouped.values()).map((project) => {
    project.stages.sort((a, b) => a.sortOrder - b.sortOrder);
    return project;
  });
};

const buildBlueprintProject = async (itemNameMap) => {
  const raw = await fs.readFile(ITEMS_DATA_PATH, "utf-8");
  const items = JSON.parse(raw);
  const blueprints = (items.items ?? [])
    .filter((item) => item.itemType === "Blueprint")
    .map((item) => ({
      itemId: item.id ?? item.imageFile.replace(/\.[^/.]+$/, ""),
      displayName: item.name ?? itemNameMap.get(item.id) ?? "Unknown",
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

const main = async () => {
  await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });

  const [nodeJs, workshopJs] = await Promise.all([
    fetchText(NODE_URL),
    fetchText(WORKSHOP_CHUNK_URL),
  ]);

  const projectSeed = extractProjectSeed(nodeJs);
  const workshopSeed = extractWorkshopSeed(workshopJs);
  const itemNameMap = await loadItemNameMap();

  const projects = [
    ...(await mapWorkshopProjects(workshopSeed, itemNameMap)),
    ...(await mapNeededProjects(projectSeed, itemNameMap)),
    await buildBlueprintProject(itemNameMap),
  ].sort((a, b) => a.name.localeCompare(b.name));

  const payload = {
    scrapedAt: new Date().toISOString(),
    sourceUrl: SOURCE_URL,
    projects,
  };

  await fs.writeFile(DATA_PATH, JSON.stringify(payload, null, 2));

  console.log(`Synced ${projects.length} projects to ${DATA_PATH}`);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
