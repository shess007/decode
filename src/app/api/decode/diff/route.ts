import { NextRequest, NextResponse } from "next/server";
import { getDiff, parsePrUrl } from "@/lib/bitbucket";
import { readDiffCache, writeDiffCache } from "@/lib/cache";

/** Parse a full unified diff into per-file sections */
function splitDiffByFile(fullDiff: string): Record<string, string> {
  const files: Record<string, string> = {};
  const parts = fullDiff.split(/^(?=diff --git )/m);

  for (const part of parts) {
    if (!part.trim()) continue;

    const bMatch = part.match(/^\+\+\+ b\/(.+)$/m);
    const aMatch = part.match(/^--- a\/(.+)$/m);
    const gitMatch = part.match(/^diff --git a\/.+ b\/(.+)$/m);
    const filePath = bMatch?.[1] || gitMatch?.[1] || aMatch?.[1];

    if (filePath) {
      files[filePath] = part;
    }
  }

  return files;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const workspace = searchParams.get("workspace");
    const repo = searchParams.get("repo");
    const prId = searchParams.get("prId");
    const prUrl = searchParams.get("prUrl");
    const filePath = searchParams.get("file");

    let ws: string, rp: string, id: number;

    if (prUrl) {
      const parsed = parsePrUrl(prUrl);
      if (!parsed) {
        return NextResponse.json({ error: "Invalid PR URL" }, { status: 400 });
      }
      ws = parsed.workspace;
      rp = parsed.repo;
      id = parsed.prId;
    } else if (workspace && repo && prId) {
      ws = workspace;
      rp = repo;
      id = parseInt(prId, 10);
    } else {
      return NextResponse.json(
        { error: "Missing workspace, repo, prId or prUrl" },
        { status: 400 }
      );
    }

    const cacheKey = `${ws}__${rp}__${id}`;

    // Try cache
    let fullDiff = await readDiffCache(cacheKey);
    if (!fullDiff) {
      fullDiff = await getDiff(ws, rp, id);
      await writeDiffCache(cacheKey, fullDiff);
    }

    if (filePath) {
      const fileDiffs = splitDiffByFile(fullDiff);
      const match = fileDiffs[filePath];
      if (!match) {
        return NextResponse.json(
          { error: "File not found in diff", availableFiles: Object.keys(fileDiffs) },
          { status: 404 }
        );
      }
      return NextResponse.json({ filePath, diff: match });
    }

    const fileDiffs = splitDiffByFile(fullDiff);
    return NextResponse.json({ files: fileDiffs });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Internal error";
    if (message === "Not authenticated") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
