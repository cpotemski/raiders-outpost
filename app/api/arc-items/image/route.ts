import fs from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
export const revalidate = 86400;

const IMAGE_DIR = path.join(
  process.cwd(),
  "node_modules/arcraiders-data/images/items"
);

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
  const filePath = path.join(IMAGE_DIR, safeName);

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
