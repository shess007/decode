import { getAuthHeader } from "./auth";
import type {
  BitbucketUser,
  BitbucketWorkspace,
  BitbucketRepository,
  BitbucketPullRequest,
  BitbucketDiffstat,
  BitbucketPaginated,
} from "./types";

const BB_API = "https://api.bitbucket.org/2.0";

async function bbFetch<T>(path: string): Promise<T> {
  const auth = await getAuthHeader();
  const res = await fetch(`${BB_API}${path}`, {
    headers: { Authorization: auth },
  });

  if (!res.ok) {
    throw new Error(`Bitbucket API error: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<T>;
}

async function bbFetchRaw(path: string): Promise<string> {
  const auth = await getAuthHeader();
  const res = await fetch(`${BB_API}${path}`, {
    headers: {
      Authorization: auth,
      Accept: "text/plain",
    },
  });

  if (!res.ok) {
    throw new Error(`Bitbucket API error: ${res.status} ${res.statusText}`);
  }

  return res.text();
}

/** Fetch all pages of a paginated Bitbucket API endpoint. */
async function bbFetchAll<T>(path: string, maxPages = 10): Promise<T[]> {
  const items: T[] = [];
  let url: string | undefined = `${BB_API}${path}`;
  let page = 0;
  const auth = await getAuthHeader();

  while (url && page < maxPages) {
    const res = await fetch(url, {
      headers: { Authorization: auth },
    });

    if (!res.ok) {
      throw new Error(`Bitbucket API error: ${res.status} ${res.statusText}`);
    }

    const data = (await res.json()) as BitbucketPaginated<T>;
    items.push(...data.values);
    url = data.next;
    page++;
  }

  return items;
}

// ── Public API ──────────────────────────────────────────────────

export async function getCurrentUser() {
  return bbFetch<BitbucketUser>("/user");
}

export async function getWorkspaces() {
  return bbFetchAll<BitbucketWorkspace>("/workspaces?pagelen=100");
}

export async function getRepositories(workspace: string) {
  return bbFetchAll<BitbucketRepository>(
    `/repositories/${workspace}?pagelen=100&sort=-updated_on`
  );
}

export async function getOpenPullRequests(workspace: string, repo: string) {
  return bbFetchAll<BitbucketPullRequest>(
    `/repositories/${workspace}/${repo}/pullrequests?state=OPEN&pagelen=50`
  );
}

export async function getPullRequest(
  workspace: string,
  repo: string,
  prId: number
) {
  return bbFetch<BitbucketPullRequest>(
    `/repositories/${workspace}/${repo}/pullrequests/${prId}`
  );
}

export async function getDiffstat(
  workspace: string,
  repo: string,
  prId: number
) {
  return bbFetchAll<BitbucketDiffstat>(
    `/repositories/${workspace}/${repo}/pullrequests/${prId}/diffstat`
  );
}

export async function getDiff(
  workspace: string,
  repo: string,
  prId: number
): Promise<string> {
  return bbFetchRaw(
    `/repositories/${workspace}/${repo}/pullrequests/${prId}/diff`
  );
}

export async function getCommitMessages(
  workspace: string,
  repo: string,
  prId: number
): Promise<string[]> {
  const commits = await bbFetchAll<{ message: string }>(
    `/repositories/${workspace}/${repo}/pullrequests/${prId}/commits`
  );
  return commits.map((c) => c.message);
}

/** Parse a Bitbucket PR URL into its parts. */
export function parsePrUrl(url: string) {
  // Matches: https://bitbucket.org/{workspace}/{repo}/pull-requests/{id}
  const match = url.match(
    /bitbucket\.org\/([^/]+)\/([^/]+)\/pull-requests\/(\d+)/
  );
  if (!match) return null;
  return {
    workspace: match[1],
    repo: match[2],
    prId: parseInt(match[3], 10),
  };
}
