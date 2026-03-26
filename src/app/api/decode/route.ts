import { NextRequest, NextResponse } from "next/server";
import {
  getPullRequest,
  getDiffstat,
  getDiff,
  getCommitMessages,
  parsePrUrl,
} from "@/lib/bitbucket";
import { generateReport } from "@/lib/claude";
import { readCache, writeCache } from "@/lib/cache";
import type { DecodeInput } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    let workspace: string;
    let repo: string;
    let prId: number;

    if (body.prUrl) {
      const parsed = parsePrUrl(body.prUrl);
      if (!parsed) {
        return NextResponse.json(
          { error: "Invalid Bitbucket PR URL" },
          { status: 400 }
        );
      }
      ({ workspace, repo, prId } = parsed);
    } else {
      ({ workspace, repo, prId } = body);
    }

    if (!workspace || !repo || !prId) {
      return NextResponse.json(
        { error: "Missing workspace, repo, or prId" },
        { status: 400 }
      );
    }

    // Check cache first (skip with ?fresh=true)
    const skipCache = body.fresh === true;
    const cacheKey = `${workspace}__${repo}__${prId}`;

    if (!skipCache) {
      const cached = await readCache(cacheKey);
      if (cached) {
        console.log(`Cache hit: ${cacheKey}`);
        return NextResponse.json(cached);
      }
    }

    // Fetch all PR data in parallel
    const [pr, diffstatItems, diff, commitMessages] = await Promise.all([
      getPullRequest(workspace, repo, prId),
      getDiffstat(workspace, repo, prId),
      getDiff(workspace, repo, prId),
      getCommitMessages(workspace, repo, prId),
    ]);

    const input: DecodeInput = {
      pr: {
        title: pr.title,
        description: pr.description || "",
        author: pr.author.display_name,
        sourceBranch: pr.source.branch.name,
        destinationBranch: pr.destination.branch.name,
        commitMessages,
      },
      diffstat: diffstatItems.map((d) => ({
        path: d.new?.path || d.old?.path || "unknown",
        status: d.status,
        linesAdded: d.lines_added,
        linesRemoved: d.lines_removed,
      })),
      diff,
    };

    const report = await generateReport(input);

    // Save to cache
    await writeCache(cacheKey, report);
    console.log(`Cached: ${cacheKey}`);

    return NextResponse.json(report);
  } catch (e) {
    console.error("Decode error:", e);
    const message = e instanceof Error ? e.message : "Internal error";

    if (message === "Not authenticated") {
      return NextResponse.json({ error: message }, { status: 401 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
