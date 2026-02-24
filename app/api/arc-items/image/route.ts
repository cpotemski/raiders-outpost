import fs from "node:fs/promises";
import path from "node:path";
import { getOverridePath } from "@/lib/arc-overrides";

export const runtime = "nodejs";
export const revalidate = 86400;

const IMAGE_DIR = path.join(
  process.cwd(),
  "node_modules/arcraiders-data/images/items"
);
const UPSCALED_IMAGE_DIR = path.join(
  process.cwd(),
  "node_modules/arcraiders-data/images/items_upscaled"
);

const IMAGE_LOCATIONS = [
  getOverridePath("images", "items"),
  UPSCALED_IMAGE_DIR,
  IMAGE_DIR,
];

const contentTypeFor = (filename: string) => {
  if (filename.endsWith(".png")) return "image/png";
  if (filename.endsWith(".jpg") || filename.endsWith(".jpeg")) return "image/jpeg";
  return "image/webp";
};

export const GET = async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const fileParam = searchParams.get("file");

  if (!fileParam) {
    return new Response("Missing file parameter", { status: 400 });
  }

  const safeName = path.basename(fileParam);
  const filePath = await findImagePath(safeName);

  if (!filePath) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const file = await fs.readFile(filePath);
    return new Response(file, {
      status: 200,
      headers: {
        "Content-Type": contentTypeFor(safeName),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
};

const findImagePath = async (filename: string): Promise<string | null> => {
  for (const directory of IMAGE_LOCATIONS) {
    const candidate = path.join(directory, filename);
    try {
      await fs.access(candidate);
      return candidate;
    } catch (error: unknown) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as NodeJS.ErrnoException).code === "ENOENT"
      ) {
        continue;
      }
      throw error;
    }
  }

  return null;
};
