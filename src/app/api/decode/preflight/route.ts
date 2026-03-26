import { NextRequest, NextResponse } from "next/server";
import {
  getPullRequest,
  getDiffstat,
  getDiff,
  parsePrUrl,
} from "@/lib/bitbucket";
import { readCache } from "@/lib/cache";
import { filterDiffstat, filterDiff } from "@/lib/diff-filter";

/** Rough token estimate: ~4 chars per token for code */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/** Rough cost estimate for Sonnet: $3/M input + $15/M output */
function estimateCost(inputTokens: number, outputTokens: number): number {
  return (inputTokens * 3 + outputTokens * 15) / 1_000_000;
}

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

    // Check cache — if cached, no AI cost
    const cacheKey = `${workspace}__${repo}__${prId}`;
    const cached = await readCache(cacheKey);
    if (cached) {
      return NextResponse.json({ cached: true, estimatedCost: 0 });
    }

    // Fetch PR data
    const [pr, diffstatItems, diff] = await Promise.all([
      getPullRequest(workspace, repo, prId),
      getDiffstat(workspace, repo, prId),
      getDiff(workspace, repo, prId),
    ]);

    const allDiffstat = diffstatItems.map((d) => ({
      path: d.new?.path || d.old?.path || "unknown",
      status: d.status as "added" | "modified" | "removed" | "renamed",
      linesAdded: d.lines_added,
      linesRemoved: d.lines_removed,
    }));

    const { included, excluded } = filterDiffstat(allDiffstat);
    const { stats } = filterDiff(diff);

    const inputTokens = estimateTokens(diff) * (stats.filteredDiffLines / Math.max(stats.originalDiffLines, 1));
    const outputTokens = 8000; // typical report output
    const cost = estimateCost(Math.round(inputTokens), outputTokens);

    return NextResponse.json({
      cached: false,
      pr: {
        title: pr.title,
        author: pr.author.display_name,
        sourceBranch: pr.source.branch.name,
        destinationBranch: pr.destination.branch.name,
      },
      files: {
        total: allDiffstat.length,
        included: included.length,
        excluded: excluded.length,
        excludedPaths: excluded.map((e) => e.path),
      },
      diff: {
        originalLines: stats.originalDiffLines,
        filteredLines: stats.filteredDiffLines,
        reductionPercent: Math.round(
          (1 - stats.filteredDiffLines / Math.max(stats.originalDiffLines, 1)) * 100
        ),
        truncatedFiles: stats.truncatedFiles,
      },
      estimatedInputTokens: Math.round(inputTokens),
      estimatedCost: Math.round(cost * 1000) / 1000, // round to 3 decimals
      warning: inputTokens > 50000
        ? "large"
        : inputTokens > 20000
          ? "medium"
          : null,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Internal error";
    if (message === "Not authenticated") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
