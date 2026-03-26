import { NextRequest, NextResponse } from "next/server";
import {
  getPullRequest,
  getDiffstat,
  getDiff,
  getCommitMessages,
  parsePrUrl,
} from "@/lib/bitbucket";
import { readCache } from "@/lib/cache";
import { filterDiffstat, filterDiff } from "@/lib/diff-filter";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const PENDING_DIR = path.join(process.cwd(), ".cache", "decode-pending");

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    let workspace: string;
    let repo: string;
    let prId: number;

    if (body.prUrl) {
      const parsed = parsePrUrl(body.prUrl);
      if (!parsed) {
        return NextResponse.json({ error: "Invalid Bitbucket PR URL" }, { status: 400 });
      }
      ({ workspace, repo, prId } = parsed);
    } else {
      ({ workspace, repo, prId } = body);
    }

    if (!workspace || !repo || !prId) {
      return NextResponse.json({ error: "Missing workspace, repo, or prId" }, { status: 400 });
    }

    const cacheKey = `${workspace}__${repo}__${prId}`;

    // Already cached? No work needed
    const cached = await readCache(cacheKey);
    if (cached) {
      return NextResponse.json({ status: "cached", cacheKey });
    }

    // Fetch all PR data in parallel
    const [pr, diffstatItems, diff, commitMessages] = await Promise.all([
      getPullRequest(workspace, repo, prId),
      getDiffstat(workspace, repo, prId),
      getDiff(workspace, repo, prId),
      getCommitMessages(workspace, repo, prId),
    ]);

    const allDiffstat = diffstatItems.map((d) => ({
      path: d.new?.path || d.old?.path || "unknown",
      status: d.status as "added" | "modified" | "removed" | "renamed",
      linesAdded: d.lines_added,
      linesRemoved: d.lines_removed,
    }));

    const { included: filteredDiffstat } = filterDiffstat(allDiffstat);
    const { filteredDiff, stats } = filterDiff(diff);

    const pendingData = {
      cacheKey,
      workspace,
      repo,
      prId,
      pr: {
        title: pr.title,
        description: pr.description || "",
        author: pr.author.display_name,
        sourceBranch: pr.source.branch.name,
        destinationBranch: pr.destination.branch.name,
        commitMessages,
      },
      diffstat: filteredDiffstat,
      diff: filteredDiff,
      filterStats: stats,
      preparedAt: new Date().toISOString(),
    };

    await mkdir(PENDING_DIR, { recursive: true });
    const filePath = path.join(
      PENDING_DIR,
      `${cacheKey.replace(/[^a-zA-Z0-9_-]/g, "_")}.json`
    );
    await writeFile(filePath, JSON.stringify(pendingData, null, 2));

    console.log(`[prepare] Saved pending decode: ${filePath}`);

    return NextResponse.json({
      status: "pending",
      cacheKey,
      files: filteredDiffstat.length,
      diffLines: stats.filteredDiffLines,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Internal error";
    if (message === "Not authenticated") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
