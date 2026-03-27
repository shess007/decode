import { NextResponse } from "next/server";
import { getAuthHeader, getSession } from "@/lib/auth";

const BB_API = "https://api.bitbucket.org/2.0";

async function bbFetch<T>(path: string, auth: string): Promise<T> {
  const res = await fetch(`${BB_API}${path}`, {
    headers: { Authorization: auth },
  });
  if (!res.ok) {
    throw new Error(`Bitbucket API error: ${res.status} on ${path}`);
  }
  return res.json() as Promise<T>;
}

interface Paginated<T> {
  values: T[];
  next?: string;
}

export async function GET() {
  try {
    const auth = await getAuthHeader();
    const session = await getSession();
    const userUuid = session.user?.uuid;

    // 1. Try the global endpoint first
    try {
      const res = await fetch(
        `${BB_API}/pullrequests?state=OPEN&role=REVIEWER&pagelen=20`,
        { headers: { Authorization: auth } }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.values && data.values.length > 0) {
          return NextResponse.json(data);
        }
      }
    } catch {
      // Global endpoint failed, fall through to per-repo approach
    }

    // 2. Fallback: fetch workspaces → repos → open PRs, filter by reviewer
    const workspaces = await bbFetch<Paginated<{ slug: string }>>(
      "/workspaces?pagelen=25",
      auth
    );

    const allPRs: unknown[] = [];

    // For each workspace, get recently updated repos
    for (const ws of workspaces.values.slice(0, 5)) {
      try {
        const repos = await bbFetch<Paginated<{ slug: string }>>(
          `/repositories/${ws.slug}?pagelen=25&sort=-updated_on`,
          auth
        );

        // For each repo, fetch open PRs
        for (const repo of repos.values.slice(0, 10)) {
          try {
            const prs = await bbFetch<Paginated<{
              id: number;
              reviewers: { uuid: string }[];
              [key: string]: unknown;
            }>>(
              `/repositories/${ws.slug}/${repo.slug}/pullrequests?state=OPEN&pagelen=20`,
              auth
            );

            // Filter PRs where current user is a reviewer
            const myReviews = prs.values.filter((pr) =>
              pr.reviewers?.some((r) => r.uuid === userUuid)
            );

            allPRs.push(...myReviews);
          } catch {
            // Skip repos we can't access
          }
        }
      } catch {
        // Skip workspaces we can't access
      }
    }

    return NextResponse.json({ values: allPRs });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Internal error";
    if (message === "Not authenticated") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
