import { NextResponse } from "next/server";

function useRedis(): boolean {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

export async function GET() {
  if (!useRedis()) {
    // File-based cache doesn't track metadata — return empty
    return NextResponse.json({ reports: [] });
  }

  try {
    const { Redis } = await import("@upstash/redis");
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });

    // Scan for decode report keys
    const keys: string[] = [];
    let cursor = "0";
    do {
      const result = await redis.scan(cursor, {
        match: "decode:*",
        count: 50,
      });
      cursor = String(result[0]);
      keys.push(...result[1]);
    } while (cursor !== "0" && keys.length < 50);

    if (keys.length === 0) {
      return NextResponse.json({ reports: [] });
    }

    // Fetch overview from each report
    const reports = await Promise.all(
      keys.map(async (key) => {
        try {
          const report = await redis.get<{
            overview?: { goal?: string };
          }>(key);
          // Key format: decode:workspace__repo__prId
          const parts = key.replace("decode:", "").split("__");
          return {
            key,
            workspace: parts[0] || "",
            repo: parts[1] || "",
            prId: parseInt(parts[2] || "0", 10),
            goal: report?.overview?.goal || "",
          };
        } catch {
          return null;
        }
      })
    );

    return NextResponse.json({
      reports: reports.filter(Boolean),
    });
  } catch (e) {
    console.error("[recent] Redis error:", e);
    return NextResponse.json({ reports: [] });
  }
}
