import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import type { DecodeReport } from "./types";

function getCacheDir(): string {
  return path.join(process.cwd(), ".cache", "decode-reports");
}

function cacheFilePath(key: string): string {
  const safe = key.replace(/[^a-zA-Z0-9_-]/g, "_");
  return path.join(getCacheDir(), `${safe}.json`);
}

export async function readCache(key: string): Promise<DecodeReport | null> {
  const filePath = cacheFilePath(key);
  try {
    const data = await readFile(filePath, "utf-8");
    console.log(`[cache] HIT: ${filePath}`);
    return JSON.parse(data) as DecodeReport;
  } catch (e) {
    console.log(`[cache] MISS: ${filePath} (${e instanceof Error ? e.message : e})`);
    return null;
  }
}

export async function writeCache(key: string, report: DecodeReport): Promise<void> {
  const dir = getCacheDir();
  const filePath = cacheFilePath(key);
  try {
    await mkdir(dir, { recursive: true });
    await writeFile(filePath, JSON.stringify(report, null, 2));
    console.log(`[cache] WRITE: ${filePath}`);
  } catch (e) {
    console.error("[cache] Write failed:", e);
  }
}
