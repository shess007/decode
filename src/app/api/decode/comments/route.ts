import { NextRequest, NextResponse } from "next/server";
import { getAuthHeader } from "@/lib/auth";

const BB_API = "https://api.bitbucket.org/2.0";

export async function POST(request: NextRequest) {
  try {
    const { workspace, repo, prId, filePath, line, lineType, content } =
      await request.json();

    if (!workspace || !repo || !prId || !filePath || !line || !content) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const auth = await getAuthHeader();

    // Build Bitbucket inline comment payload
    // "to" = line in the new file (for additions and context lines)
    // "from" = line in the old file (for removed lines)
    const inline: Record<string, unknown> = { path: filePath };
    if (lineType === "remove") {
      inline.from = line;
    } else {
      inline.to = line;
    }

    const res = await fetch(
      `${BB_API}/repositories/${workspace}/${repo}/pullrequests/${prId}/comments`,
      {
        method: "POST",
        headers: {
          Authorization: auth,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: { raw: content },
          inline,
        }),
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const message =
        err?.error?.message || `Bitbucket API error: ${res.status}`;
      return NextResponse.json({ error: message }, { status: res.status });
    }

    const comment = await res.json();

    return NextResponse.json({
      ok: true,
      commentId: comment.id,
      htmlUrl: comment.links?.html?.href || null,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Internal error";
    if (message === "Not authenticated") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
