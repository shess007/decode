import { NextRequest, NextResponse } from "next/server";
import { readCache } from "@/lib/cache";
import { parsePrUrl } from "@/lib/bitbucket";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  let workspace = searchParams.get("workspace");
  let repo = searchParams.get("repo");
  let prId = searchParams.get("prId");
  const prUrl = searchParams.get("prUrl");

  if (prUrl) {
    const parsed = parsePrUrl(prUrl);
    if (parsed) {
      workspace = parsed.workspace;
      repo = parsed.repo;
      prId = String(parsed.prId);
    }
  }

  if (!workspace || !repo || !prId) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const cacheKey = `${workspace}__${repo}__${prId}`;
  const report = await readCache(cacheKey);

  if (report) {
    return NextResponse.json({ status: "ready", report });
  }

  return NextResponse.json({ status: "pending" });
}
