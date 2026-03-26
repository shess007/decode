"use client";

import { useEffect, useState } from "react";
import { splitFilePath } from "./change-type-colors";

interface DiffPanelProps {
  filePath: string | null;
  workspace: string;
  repo: string;
  prId: number;
}

interface DiffLine {
  type: "add" | "remove" | "context" | "header" | "meta";
  content: string;
  oldNum?: number;
  newNum?: number;
}

function parseDiffLines(raw: string): DiffLine[] {
  const lines: DiffLine[] = [];
  let oldLine = 0;
  let newLine = 0;

  for (const line of raw.split("\n")) {
    if (
      line.startsWith("diff --git") ||
      line.startsWith("index ") ||
      line.startsWith("--- ") ||
      line.startsWith("+++ ") ||
      line.startsWith("new file") ||
      line.startsWith("deleted file") ||
      line.startsWith("rename") ||
      line.startsWith("similarity") ||
      line.startsWith("Binary")
    ) {
      lines.push({ type: "meta", content: line });
      continue;
    }

    const hunkMatch = line.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@(.*)/);
    if (hunkMatch) {
      oldLine = parseInt(hunkMatch[1], 10);
      newLine = parseInt(hunkMatch[2], 10);
      lines.push({
        type: "header",
        content: `@@ -${hunkMatch[1]} +${hunkMatch[2]} @@${hunkMatch[3] || ""}`,
      });
      continue;
    }

    if (line.startsWith("+")) {
      lines.push({ type: "add", content: line.slice(1), newNum: newLine });
      newLine++;
    } else if (line.startsWith("-")) {
      lines.push({ type: "remove", content: line.slice(1), oldNum: oldLine });
      oldLine++;
    } else {
      // Context line (starts with space or is empty)
      lines.push({
        type: "context",
        content: line.startsWith(" ") ? line.slice(1) : line,
        oldNum: oldLine,
        newNum: newLine,
      });
      oldLine++;
      newLine++;
    }
  }

  return lines;
}

const lineStyles: Record<DiffLine["type"], React.CSSProperties> = {
  add: {
    background: "rgba(52, 211, 153, 0.06)",
    color: "var(--green)",
  },
  remove: {
    background: "rgba(240, 123, 110, 0.06)",
    color: "var(--coral)",
  },
  context: {
    background: "transparent",
    color: "var(--text-secondary)",
  },
  header: {
    background: "var(--bg-muted)",
    color: "var(--accent)",
    fontWeight: 600,
  },
  meta: {
    background: "transparent",
    color: "var(--text-tertiary)",
    fontStyle: "italic",
  },
};

export function DiffPanel({ filePath, workspace, repo, prId }: DiffPanelProps) {
  const [diff, setDiff] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!filePath) {
      setDiff(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(
      `/api/decode/diff?workspace=${encodeURIComponent(workspace)}&repo=${encodeURIComponent(repo)}&prId=${prId}&file=${encodeURIComponent(filePath)}`
    )
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to load diff");
        }
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setDiff(data.diff);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [filePath, workspace, repo, prId]);

  // Empty state — no file selected
  if (!filePath) {
    return (
      <div
        className="flex items-center justify-center h-full"
        style={{ color: "var(--text-tertiary)", fontSize: "12px" }}
      >
        <div className="text-center" style={{ maxWidth: "180px", lineHeight: 1.6 }}>
          <span style={{ fontSize: "20px", display: "block", marginBottom: "8px", opacity: 0.4 }}>
            { }
          </span>
          Click a file card to view its diff
        </div>
      </div>
    );
  }

  const { directory, filename } = splitFilePath(filePath);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        style={{
          padding: "10px 16px",
          borderBottom: "1px solid var(--border-default)",
          fontSize: "12px",
          fontFamily: "var(--font-mono)",
          flexShrink: 0,
        }}
      >
        <span style={{ color: "var(--text-tertiary)" }}>{directory}</span>
        <span style={{ color: "var(--text-primary)" }}>{filename}</span>
      </div>

      {/* Content */}
      <div className="flex-1" style={{ overflowY: "auto" }}>
        {loading && (
          <div
            className="flex items-center justify-center"
            style={{ padding: "40px", color: "var(--text-tertiary)", fontSize: "12px" }}
          >
            Loading diff...
          </div>
        )}

        {error && (
          <div
            style={{
              padding: "16px",
              color: "var(--coral)",
              fontSize: "12px",
            }}
          >
            {error}
          </div>
        )}

        {diff && !loading && (
          <div style={{ fontSize: "12px", fontFamily: "var(--font-mono)", lineHeight: 1.65 }}>
            {parseDiffLines(diff).map((line, i) => (
              <div
                key={i}
                className="flex"
                style={{
                  ...lineStyles[line.type],
                  minHeight: "20px",
                }}
              >
                {/* Line numbers */}
                {line.type !== "meta" && line.type !== "header" && (
                  <span
                    className="flex-shrink-0"
                    style={{
                      width: "80px",
                      padding: "0 8px",
                      textAlign: "right",
                      color: "var(--text-tertiary)",
                      fontSize: "10px",
                      userSelect: "none",
                      display: "flex",
                      gap: "4px",
                      justifyContent: "flex-end",
                      opacity: 0.6,
                    }}
                  >
                    <span style={{ width: "32px", textAlign: "right" }}>
                      {line.oldNum ?? ""}
                    </span>
                    <span style={{ width: "32px", textAlign: "right" }}>
                      {line.newNum ?? ""}
                    </span>
                  </span>
                )}

                {/* Gutter indicator */}
                {line.type !== "meta" && line.type !== "header" && (
                  <span
                    className="flex-shrink-0"
                    style={{
                      width: "20px",
                      textAlign: "center",
                      userSelect: "none",
                      color:
                        line.type === "add"
                          ? "var(--green)"
                          : line.type === "remove"
                            ? "var(--coral)"
                            : "transparent",
                    }}
                  >
                    {line.type === "add" ? "+" : line.type === "remove" ? "-" : " "}
                  </span>
                )}

                {/* Content */}
                <span
                  style={{
                    padding:
                      line.type === "header" || line.type === "meta"
                        ? "0 16px"
                        : "0 8px",
                    whiteSpace: "pre",
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  {line.content}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
