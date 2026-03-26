import type { ChangeType, Complexity } from "@/lib/types";

export const changeTypeColor: Record<ChangeType, string> = {
  "new-file": "var(--green)",
  "core-logic": "var(--orange)",
  "api-change": "var(--orange)",
  refactor: "var(--blue)",
  tests: "var(--teal)",
  config: "var(--text-tertiary)",
  types: "var(--text-tertiary)",
  styling: "var(--text-tertiary)",
  dependency: "var(--text-tertiary)",
  deletion: "var(--coral)",
};

export const changeTypeBadgeBg: Record<ChangeType, string> = {
  "new-file": "var(--green-bg)",
  "core-logic": "var(--orange-bg)",
  "api-change": "var(--orange-bg)",
  refactor: "var(--blue-bg)",
  tests: "var(--teal-bg)",
  config: "var(--bg-muted)",
  types: "var(--bg-muted)",
  styling: "var(--bg-muted)",
  dependency: "var(--bg-muted)",
  deletion: "var(--coral-bg)",
};

export const complexityConfig: Record<
  Complexity,
  { bars: number; color: string }
> = {
  trivial: { bars: 1, color: "var(--green)" },
  moderate: { bars: 2, color: "var(--orange)" },
  complex: { bars: 3, color: "var(--coral)" },
};

/** Split a file path into dimmed directory + bright filename */
export function splitFilePath(filePath: string): {
  directory: string;
  filename: string;
} {
  const lastSlash = filePath.lastIndexOf("/");
  if (lastSlash === -1) {
    return { directory: "", filename: filePath };
  }
  return {
    directory: filePath.slice(0, lastSlash + 1),
    filename: filePath.slice(lastSlash + 1),
  };
}
