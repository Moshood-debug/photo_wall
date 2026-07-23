import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const IMAGE_EXTENSIONS = new Set([
  ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp", ".ico", ".avif", ".heic"
]);

export async function GET() {
  try {
    const uploadsDir = path.join(process.cwd(), "public", "uploads");

    if (!fs.existsSync(uploadsDir)) {
      return NextResponse.json({ images: [] });
    }

    const files = fs.readdirSync(uploadsDir);

    const imagesWithTime = files
      .filter((file) => {
        const ext = path.extname(file).toLowerCase();
        return IMAGE_EXTENSIONS.has(ext);
      })
      .map((file) => {
        const filePath = path.join(uploadsDir, file);
        const stats = fs.statSync(filePath);
        return { file, mtime: stats.mtimeMs };
      })
      .sort((a, b) => b.mtime - a.mtime)
      .map((item) => item.file);

    return NextResponse.json({ images: imagesWithTime });
  } catch (err) {
    return NextResponse.json({ error: "Unable to read images directory" }, { status: 500 });
  }
}
