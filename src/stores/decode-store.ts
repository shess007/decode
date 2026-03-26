import { create } from "zustand";
import type {
  BitbucketWorkspace,
  BitbucketRepository,
  BitbucketPullRequest,
  DecodeReport,
} from "@/lib/types";

export interface PreflightResult {
  cached: boolean;
  estimatedCost: number;
  estimatedInputTokens?: number;
  warning?: "medium" | "large" | null;
  pr?: {
    title: string;
    author: string;
    sourceBranch: string;
    destinationBranch: string;
  };
  files?: {
    total: number;
    included: number;
    excluded: number;
    excludedPaths: string[];
  };
  diff?: {
    originalLines: number;
    filteredLines: number;
    reductionPercent: number;
    truncatedFiles: string[];
  };
}

interface DecodeState {
  // PR picker state
  workspaces: BitbucketWorkspace[];
  repositories: BitbucketRepository[];
  pullRequests: BitbucketPullRequest[];
  selectedWorkspace: string | null;
  selectedRepo: string | null;
  selectedPR: BitbucketPullRequest | null;

  // Loading states
  loadingWorkspaces: boolean;
  loadingRepos: boolean;
  loadingPRs: boolean;
  preflighting: boolean;
  decoding: boolean;

  // Preflight
  preflight: PreflightResult | null;

  // Local decode
  waitingForLocal: boolean;

  // Report + its context (always set alongside report)
  report: DecodeReport | null;
  reportContext: { workspace: string; repo: string; prId: number } | null;
  error: string | null;

  // Actions
  fetchWorkspaces: () => Promise<void>;
  fetchRepositories: (workspace: string) => Promise<void>;
  fetchPullRequests: (workspace: string, repo: string) => Promise<void>;
  selectWorkspace: (workspace: string) => void;
  selectRepo: (repo: string) => void;
  selectPR: (pr: BitbucketPullRequest) => void;
  runPreflight: (workspace: string, repo: string, prId: number) => Promise<PreflightResult | null>;
  runPreflightFromUrl: (url: string) => Promise<PreflightResult | null>;
  decode: (workspace: string, repo: string, prId: number, model?: string) => Promise<void>;
  decodeFromUrl: (url: string, model?: string) => Promise<void>;
  decodeLocal: (workspace: string, repo: string, prId: number) => Promise<void>;
  decodeLocalFromUrl: (url: string) => Promise<void>;
  pollForReport: (workspace: string, repo: string, prId: number) => void;
  stopPolling: () => void;
  clearPreflight: () => void;
  reset: () => void;
}

export const useDecodeStore = create<DecodeState>((set, get) => ({
  workspaces: [],
  repositories: [],
  pullRequests: [],
  selectedWorkspace: null,
  selectedRepo: null,
  selectedPR: null,
  loadingWorkspaces: false,
  loadingRepos: false,
  loadingPRs: false,
  preflighting: false,
  decoding: false,
  preflight: null,
  waitingForLocal: false,
  report: null,
  reportContext: null,
  error: null,

  fetchWorkspaces: async () => {
    set({ loadingWorkspaces: true, error: null });
    try {
      const res = await fetch("/api/bitbucket?path=/workspaces?pagelen=100");
      const data = await res.json();
      set({ workspaces: data.values || [], loadingWorkspaces: false });
    } catch {
      set({ error: "Failed to fetch workspaces", loadingWorkspaces: false });
    }
  },

  fetchRepositories: async (workspace: string) => {
    set({ loadingRepos: true, repositories: [], pullRequests: [], error: null });
    try {
      const res = await fetch(
        `/api/bitbucket?path=/repositories/${workspace}?pagelen=100&sort=-updated_on`
      );
      const data = await res.json();
      set({ repositories: data.values || [], loadingRepos: false });
    } catch {
      set({ error: "Failed to fetch repositories", loadingRepos: false });
    }
  },

  fetchPullRequests: async (workspace: string, repo: string) => {
    set({ loadingPRs: true, pullRequests: [], error: null });
    try {
      const res = await fetch(
        `/api/bitbucket?path=/repositories/${workspace}/${repo}/pullrequests?state=OPEN&pagelen=50`
      );
      const data = await res.json();
      set({ pullRequests: data.values || [], loadingPRs: false });
    } catch {
      set({ error: "Failed to fetch pull requests", loadingPRs: false });
    }
  },

  selectWorkspace: (workspace: string) => {
    set({
      selectedWorkspace: workspace,
      selectedRepo: null,
      selectedPR: null,
      repositories: [],
      pullRequests: [],
      report: null,
    });
    get().fetchRepositories(workspace);
  },

  selectRepo: (repo: string) => {
    const { selectedWorkspace } = get();
    set({ selectedRepo: repo, selectedPR: null, pullRequests: [], report: null });
    if (selectedWorkspace) {
      get().fetchPullRequests(selectedWorkspace, repo);
    }
  },

  selectPR: (pr: BitbucketPullRequest) => {
    set({ selectedPR: pr, report: null });
  },

  runPreflight: async (workspace: string, repo: string, prId: number) => {
    set({ preflighting: true, preflight: null, error: null });
    try {
      const res = await fetch("/api/decode/preflight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspace, repo, prId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Preflight failed");
      }
      const result: PreflightResult = await res.json();
      set({ preflight: result, preflighting: false });
      return result;
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : "Preflight failed",
        preflighting: false,
      });
      return null;
    }
  },

  runPreflightFromUrl: async (url: string) => {
    set({ preflighting: true, preflight: null, error: null });
    try {
      const res = await fetch("/api/decode/preflight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prUrl: url }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Preflight failed");
      }
      const result: PreflightResult = await res.json();
      set({ preflight: result, preflighting: false });
      return result;
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : "Preflight failed",
        preflighting: false,
      });
      return null;
    }
  },

  clearPreflight: () => {
    set({ preflight: null });
  },

  decode: async (workspace: string, repo: string, prId: number, model?: string) => {
    set({ decoding: true, report: null, error: null });
    try {
      const res = await fetch("/api/decode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspace, repo, prId, model }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Decode failed");
      }

      const report = await res.json();
      set({ report, reportContext: { workspace, repo, prId }, decoding: false });
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : "Decode failed",
        decoding: false,
      });
    }
  },

  decodeFromUrl: async (url: string, model?: string) => {
    set({ decoding: true, report: null, error: null });
    try {
      const res = await fetch("/api/decode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prUrl: url, model }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Decode failed");
      }

      const report = await res.json();
      // Parse URL to extract context
      const match = url.match(/bitbucket\.org\/([^/]+)\/([^/]+)\/pull-requests\/(\d+)/);
      const ctx = match
        ? { workspace: match[1], repo: match[2], prId: parseInt(match[3], 10) }
        : null;
      set({ report, reportContext: ctx, decoding: false });
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : "Decode failed",
        decoding: false,
      });
    }
  },

  decodeLocal: async (workspace: string, repo: string, prId: number) => {
    set({ waitingForLocal: true, report: null, error: null, preflight: null });
    try {
      const res = await fetch("/api/decode/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspace, repo, prId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Prepare failed");
      }
      const data = await res.json();
      if (data.status === "cached") {
        // Already cached, just fetch it
        const statusRes = await fetch(
          `/api/decode/status?workspace=${workspace}&repo=${repo}&prId=${prId}`
        );
        const statusData = await statusRes.json();
        if (statusData.status === "ready") {
          set({
            report: statusData.report,
            reportContext: { workspace, repo, prId },
            waitingForLocal: false,
          });
          return;
        }
      }
      // Start polling
      set({ reportContext: { workspace, repo, prId } });
      get().pollForReport(workspace, repo, prId);
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : "Prepare failed",
        waitingForLocal: false,
      });
    }
  },

  decodeLocalFromUrl: async (url: string) => {
    const match = url.match(/bitbucket\.org\/([^/]+)\/([^/]+)\/pull-requests\/(\d+)/);
    if (!match) {
      set({ error: "Invalid Bitbucket PR URL" });
      return;
    }
    const workspace = match[1];
    const repo = match[2];
    const prId = parseInt(match[3], 10);
    await get().decodeLocal(workspace, repo, prId);
  },

  pollForReport: (workspace: string, repo: string, prId: number) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/decode/status?workspace=${workspace}&repo=${repo}&prId=${prId}`
        );
        const data = await res.json();
        if (data.status === "ready") {
          clearInterval(interval);
          set({
            report: data.report,
            reportContext: { workspace, repo, prId },
            waitingForLocal: false,
          });
        }
      } catch {
        // ignore poll errors, keep trying
      }
    }, 2000);

    // Store interval ID for cleanup
    (globalThis as Record<string, unknown>).__decodePollInterval = interval;
  },

  stopPolling: () => {
    const interval = (globalThis as Record<string, unknown>).__decodePollInterval;
    if (interval) {
      clearInterval(interval as ReturnType<typeof setInterval>);
      (globalThis as Record<string, unknown>).__decodePollInterval = undefined;
    }
    set({ waitingForLocal: false });
  },

  reset: () => {
    get().stopPolling();
    set({
      selectedWorkspace: null,
      selectedRepo: null,
      selectedPR: null,
      repositories: [],
      pullRequests: [],
      report: null,
      reportContext: null,
      waitingForLocal: false,
      preflight: null,
      error: null,
    });
  },
}));
