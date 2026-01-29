import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const BASE_URL = "https://metaforge.app";
const LIST_URL = `${BASE_URL}/arc-raiders/database/items/page/`;
const OUT_DIR = path.join(process.cwd(), "lib/arc-items");
const DATA_PATH = path.join(OUT_DIR, "data/items.json");
const IMAGES_DIR = path.join(OUT_DIR, "images");

const RARITIES = [
  "Common",
  "Uncommon",
  "Rare",
  "Epic",
  "Legendary",
  "Mythic",
  "Exotic",
];

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

const fetchBuffer = async (url) => {
  const res = await fetch(url, {
    headers: { "user-agent": "raiders-outpost-sync/1.0" },
  });
  if (!res.ok) {
    throw new Error(`Image request failed ${res.status} for ${url}`);
  }
  return Buffer.from(await res.arrayBuffer());
};

const uniq = (list) => Array.from(new Set(list));

const extractAll = (regex, text) => {
  const results = [];
  let match;
  while ((match = regex.exec(text))) {
    results.push(match[1] ?? match[0]);
  }
  return results;
};

const decodeHtml = (input) =>
  input
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

const MAX_PAGES = 200;
const MAX_NO_NEW_PAGES = 2;

const extractItemLinks = (html) => {
  const links = extractAll(
    /href="(\/arc-raiders\/database\/item\/[^"]+)"/g,
    html
  );
  return uniq(links).map((link) => `${BASE_URL}${link}`);
};

const extractName = (html) => {
  const titleMatch = html.match(/<title>([^<]+?)\s*\|/i);
  if (titleMatch?.[1]) {
    return decodeHtml(titleMatch[1].trim());
  }
  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  return h1Match?.[1] ? decodeHtml(h1Match[1].trim()) : null;
};

const extractRarity = (html) => {
  const rarityMatch = html.match(
    new RegExp(`>(${RARITIES.join("|")})<`, "i")
  );
  return rarityMatch?.[1] ?? null;
};

const extractRarityFromData = (html) => {
  const match = html.match(/rarity:\"([^\"]*)\"/i);
  if (!match) {
    return null;
  }
  const value = match[1]?.trim();
  if (!value) {
    return null;
  }
  const normalized = value[0].toUpperCase() + value.slice(1);
  return RARITIES.includes(normalized) ? normalized : value;
};

const extractItemTypeFromData = (html) => {
  const match = html.match(/item_type:\"([^\"]*)\"/i);
  if (!match) {
    return null;
  }
  const value = match[1]?.trim();
  return value || null;
};

const extractImageUrl = (html) => {
  const direct = html.match(
    /(https:\/\/cdn\.metaforge\.app\/arc-raiders\/[^"']+\.(?:png|webp|jpg|jpeg))/i
  );
  if (direct?.[1]) {
    return direct[1];
  }
  const icon = html.match(/icon:\"(https?:\/\/[^\"']+\.(?:png|webp|jpg|jpeg))\"/i);
  if (icon?.[1]) {
    return icon[1];
  }
  const iconRelative = html.match(
    /icon:\"(\/arc-raiders\/[^\"']+\.(?:png|webp|jpg|jpeg))\"/i
  );
  if (iconRelative?.[1]) {
    return `https://cdn.metaforge.app/${iconRelative[1].replace(/^\//, "")}`;
  }
  const relative = html.match(
    /src="(\/arc-raiders\/[^"']+\.(?:png|webp|jpg|jpeg))"/i
  );
  return relative?.[1]
    ? `https://cdn.metaforge.app/${relative[1].replace(/^\//, "")}`
    : null;
};

const slugFromUrl = (url) => {
  const parts = new URL(url).pathname.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? "unknown";
};

const mapLimit = async (items, limit, mapper) => {
  const results = [];
  let index = 0;
  const workers = new Array(Math.min(limit, items.length))
    .fill(null)
    .map(async () => {
      while (index < items.length) {
        const currentIndex = index;
        index += 1;
        results[currentIndex] = await mapper(items[currentIndex], currentIndex);
      }
    });
  await Promise.all(workers);
  return results;
};

const main = async () => {
  await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
  await fs.mkdir(IMAGES_DIR, { recursive: true });

  const firstPageHtml = await fetchText(`${LIST_URL}1`);
  const itemLinksSet = new Set(extractItemLinks(firstPageHtml));
  let page = 2;
  let noNewPages = 0;

  while (page <= MAX_PAGES && noNewPages < MAX_NO_NEW_PAGES) {
    const pageHtml = await fetchText(`${LIST_URL}${page}`);
    const links = extractItemLinks(pageHtml);
    const before = itemLinksSet.size;
    for (const link of links) {
      itemLinksSet.add(link);
    }
    const added = itemLinksSet.size - before;
    if (added === 0) {
      noNewPages += 1;
    } else {
      noNewPages = 0;
    }
    page += 1;
  }

  const itemLinks = Array.from(itemLinksSet);

  const items = await mapLimit(itemLinks, 6, async (itemUrl) => {
    const html = await fetchText(itemUrl);
    const slug = slugFromUrl(itemUrl);
    const name = extractName(html);
    const rarity =
      extractRarity(html) ?? extractRarityFromData(html) ?? "Unknown";
    const itemType = extractItemTypeFromData(html) ?? "Unknown";
    const imageUrl = extractImageUrl(html);

    let imageFile = null;
    if (imageUrl) {
      const ext = path.extname(new URL(imageUrl).pathname) || ".webp";
      imageFile = `${slug}${ext}`;
      const imagePath = path.join(IMAGES_DIR, imageFile);
      const buffer = await fetchBuffer(imageUrl);
      await fs.writeFile(imagePath, buffer);
    }

    return {
      id: slug,
      name,
      rarity,
      itemType,
      imageFile,
    };
  });

  const missing = items.filter(
    (item) => !item.name || !item.rarity || !item.itemType || !item.imageFile
  );
  const duplicateIds = items
    .map((item) => item.id)
    .filter((id, idx, list) => list.indexOf(id) !== idx);

  if (missing.length) {
    throw new Error(
      `Missing required fields for ${missing.length} items: ${missing
        .map((item) => item.id)
        .join(", ")}`
    );
  }
  if (duplicateIds.length) {
    throw new Error(`Duplicate item ids: ${uniq(duplicateIds).join(", ")}`);
  }

  const payload = {
    scrapedAt: new Date().toISOString(),
    count: items.length,
    items: items
      .map((item) => ({
        name: item.name,
        rarity: item.rarity,
        itemType: item.itemType,
        imageFile: item.imageFile,
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  };

  await fs.writeFile(DATA_PATH, JSON.stringify(payload, null, 2));

  console.log(
    `Synced ${items.length} items to ${DATA_PATH} (pages scanned: ${page - 1})`
  );
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
