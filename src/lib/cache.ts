import type { DecodeReport } from "./types";

const REPORT_PREFIX = "decode:";
const DIFF_PREFIX = "diff:";
const TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

function sanitizeKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9_-]/g, "_");
}

// ── Upstash Redis (production) ──────────────────────────────────

function useRedis(): boolean {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

async function getRedis() {
  const { Redis } = await import("@upstash/redis");
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
}

// ── File-based (local dev fallback) ─────────────────────────────

async function fileRead(filePath: string): Promise<string | null> {
  try {
    const { readFile } = await import("fs/promises");
    return await readFile(filePath, "utf-8");
  } catch {
    return null;
  }
}

async function fileWrite(filePath: string, data: string): Promise<void> {
  const { writeFile, mkdir } = await import("fs/promises");
  const path = await import("path");
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, data);
}

function localPath(prefix: string, key: string, ext: string): string {
  const path = require("path");
  const dir = prefix === REPORT_PREFIX ? "decode-reports" : "decode-diffs";
  return path.join(process.cwd(), ".cache", dir, `${sanitizeKey(key)}.${ext}`);
}

// ── Public API: Reports ─────────────────────────────────────────

export async function readCache(key: string): Promise<DecodeReport | null> {
  const safeKey = sanitizeKey(key);

  if (useRedis()) {
    try {
      const redis = await getRedis();
      const data = await redis.get<DecodeReport>(`${REPORT_PREFIX}${safeKey}`);
      if (data) {
        console.log(`[cache] HIT (redis): ${safeKey}`);
        return data;
      }
      console.log(`[cache] MISS (redis): ${safeKey}`);
      return null;
    } catch (e) {
      console.error("[cache] Redis read error:", e);
      return null;
    }
  }

  // File fallback
  const filePath = localPath(REPORT_PREFIX, key, "json");
  const raw = await fileRead(filePath);
  if (raw) {
    console.log(`[cache] HIT (file): ${filePath}`);
    return JSON.parse(raw) as DecodeReport;
  }
  console.log(`[cache] MISS (file): ${filePath}`);
  return null;
}

export async function writeCache(key: string, report: DecodeReport): Promise<void> {
  const safeKey = sanitizeKey(key);

  if (useRedis()) {
    try {
      const redis = await getRedis();
      await redis.set(`${REPORT_PREFIX}${safeKey}`, report, { ex: TTL_SECONDS });
      console.log(`[cache] WRITE (redis): ${safeKey}`);
    } catch (e) {
      console.error("[cache] Redis write error:", e);
    }
    return;
  }

  // File fallback
  const filePath = localPath(REPORT_PREFIX, key, "json");
  try {
    await fileWrite(filePath, JSON.stringify(report, null, 2));
    console.log(`[cache] WRITE (file): ${filePath}`);
  } catch (e) {
    console.error("[cache] File write error:", e);
  }
}

// ── Public API: Diffs ───────────────────────────────────────────

export async function readDiffCache(key: string): Promise<string | null> {
  const safeKey = sanitizeKey(key);

  if (useRedis()) {
    try {
      const redis = await getRedis();
      const data = await redis.get<string>(`${DIFF_PREFIX}${safeKey}`);
      return data ?? null;
    } catch {
      return null;
    }
  }

  return fileRead(localPath(DIFF_PREFIX, key, "diff"));
}

export async function writeDiffCache(key: string, diff: string): Promise<void> {
  const safeKey = sanitizeKey(key);

  if (useRedis()) {
    try {
      const redis = await getRedis();
      await redis.set(`${DIFF_PREFIX}${safeKey}`, diff, { ex: TTL_SECONDS });
    } catch (e) {
      console.error("[cache] Redis diff write error:", e);
    }
    return;
  }

  try {
    await fileWrite(localPath(DIFF_PREFIX, key, "diff"), diff);
  } catch (e) {
    console.error("[cache] File diff write error:", e);
  }
}
