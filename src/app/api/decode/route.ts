import { NextRequest, NextResponse } from "next/server";
import {
  getPullRequest,
  getDiffstat,
  getDiff,
  getCommitMessages,
  parsePrUrl,
} from "@/lib/bitbucket";
import { generateReport, type AIModel } from "@/lib/claude";
import { readCache, writeCache } from "@/lib/cache";
import { filterDiffstat, filterDiff } from "@/lib/diff-filter";
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

    const aiModel: AIModel = body.model === "sonnet" ? "sonnet" : "gemini";

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

    // Map diffstat to our format
    const allDiffstat = diffstatItems.map((d) => ({
      path: d.new?.path || d.old?.path || "unknown",
      status: d.status as "added" | "modified" | "removed" | "renamed",
      linesAdded: d.lines_added,
      linesRemoved: d.lines_removed,
    }));

    // Filter low-value files
    const { included: filteredDiffstat, excluded: excludedDiffstat } =
      filterDiffstat(allDiffstat);
    const { filteredDiff, stats } = filterDiff(diff);

    if (stats.excludedFiles > 0) {
      console.log(
        `[filter] Excluded ${stats.excludedFiles} files: ${stats.excludedPaths.join(", ")}`
      );
    }
    if (stats.truncatedFiles.length > 0) {
      console.log(
        `[filter] Truncated ${stats.truncatedFiles.length} files: ${stats.truncatedFiles.join(", ")}`
      );
    }
    console.log(
      `[filter] Diff: ${stats.originalDiffLines} → ${stats.filteredDiffLines} lines (${Math.round((1 - stats.filteredDiffLines / Math.max(stats.originalDiffLines, 1)) * 100)}% reduction)`
    );

    const input: DecodeInput = {
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
    };

    const report = await generateReport(input, aiModel);

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
