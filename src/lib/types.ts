// ── Bitbucket types ──────────────────────────────────────────────

export interface BitbucketUser {
  display_name: string;
  username: string;
  uuid: string;
  links: { avatar: { href: string } };
}

export interface BitbucketWorkspace {
  uuid: string;
  slug: string;
  name: string;
}

export interface BitbucketRepository {
  uuid: string;
  slug: string;
  name: string;
  full_name: string; // "workspace/repo"
  description: string;
  updated_on: string;
}

export interface BitbucketPullRequest {
  id: number;
  title: string;
  description: string;
  state: "OPEN" | "MERGED" | "DECLINED" | "SUPERSEDED";
  author: {
    display_name: string;
    uuid: string;
    links: { avatar: { href: string } };
  };
  source: { branch: { name: string }; commit: { hash: string } };
  destination: { branch: { name: string }; commit: { hash: string } };
  created_on: string;
  updated_on: string;
  comment_count: number;
  links: { html: { href: string } };
}

export interface BitbucketDiffstat {
  status: "added" | "modified" | "removed" | "renamed";
  old: { path: string } | null;
  new: { path: string } | null;
  lines_added: number;
  lines_removed: number;
}

export interface BitbucketPaginated<T> {
  size: number;
  page: number;
  pagelen: number;
  next?: string;
  previous?: string;
  values: T[];
}

// ── Decode types ────────────────────────────────────────────────

export interface DecodeInput {
  pr: {
    title: string;
    description: string;
    author: string;
    sourceBranch: string;
    destinationBranch: string;
    commitMessages: string[];
  };
  diffstat: {
    path: string;
    status: "added" | "modified" | "removed" | "renamed";
    linesAdded: number;
    linesRemoved: number;
  }[];
  diff: string;
  fileContents?: Record<string, string>;
}

export type ChangeType =
  | "core-logic"
  | "api-change"
  | "config"
  | "types"
  | "tests"
  | "refactor"
  | "new-file"
  | "deletion"
  | "styling"
  | "dependency";

export type Complexity = "trivial" | "moderate" | "complex";

export interface FileAnnotation {
  filePath: string;
  roleInPR: string;
  whatChanged: string;
  payAttentionTo: string;
  changeType: ChangeType;
  complexity: Complexity;
}

export interface ReviewPhase {
  label: string;
  description: string;
  files: string[];
}

export interface CrossFileGroup {
  label: string;
  files: string[];
  connection: string;
}

export interface DataFlow {
  description: string;
  files: string[];
}

export interface DecodeReport {
  overview: {
    goal: string;
    approach: string;
    keyDecisions: string[];
    scopeAssessment: string;
  };
  reviewOrder: {
    phases: ReviewPhase[];
    reasoning: string;
  };
  fileAnnotations: FileAnnotation[];
  crossFileMap: {
    groups: CrossFileGroup[];
    dataFlows: DataFlow[];
  };
}

// ── Session types ───────────────────────────────────────────────

export interface SessionData {
  apiToken: string;
  authMethod: "bearer" | "basic";
  email: string;
  user: {
    displayName: string;
    username: string;
    uuid: string;
    avatarUrl: string;
  };
}
