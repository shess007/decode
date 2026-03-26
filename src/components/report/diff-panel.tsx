"use client";

import { useEffect, useState, useMemo } from "react";
import { splitFilePath } from "./change-type-colors";
import { useHighlighter, type TokenizedLine } from "@/lib/use-highlighter";

interface DiffPanelProps {
  filePath: string | null;
  workspace: string;
  repo: string;
  prId: number;
  onPrev?: () => void;
  onNext?: () => void;
  currentIndex?: number;
  totalFiles?: number;
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

    const hunkMatch = line.match(
      /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@(.*)/
    );
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
      lines.push({
        type: "remove",
        content: line.slice(1),
        oldNum: oldLine,
      });
      oldLine++;
    } else {
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

const rowBg: Record<DiffLine["type"], string> = {
  add: "rgba(52, 211, 153, 0.06)",
  remove: "rgba(240, 123, 110, 0.06)",
  context: "transparent",
  header: "var(--bg-muted)",
  meta: "transparent",
};

/** Render a single line's content — either syntax-highlighted tokens or plain text */
function LineContent({
  line,
  tokens,
}: {
  line: DiffLine;
  tokens: TokenizedLine | null;
}) {
  const style: React.CSSProperties = {
    padding:
      line.type === "header" || line.type === "meta" ? "0 16px" : "0 8px",
    whiteSpace: "pre",
    flex: 1,
    minWidth: 0,
  };

  // For meta/header lines, use plain styling
  if (line.type === "meta") {
    return (
      <span style={{ ...style, color: "var(--text-tertiary)", fontStyle: "italic" }}>
        {line.content}
      </span>
    );
  }
  if (line.type === "header") {
    return (
      <span style={{ ...style, color: "var(--accent)", fontWeight: 600 }}>
        {line.content}
      </span>
    );
  }

  // Syntax-highlighted tokens
  if (tokens) {
    return (
      <span style={style}>
        {tokens.map((token, i) => (
          <span
            key={i}
            style={{
              color: token.color,
              fontStyle: token.fontStyle === 1 ? "italic" : undefined,
              fontWeight: token.fontStyle === 2 ? "bold" : undefined,
            }}
          >
            {token.content}
          </span>
        ))}
      </span>
    );
  }

  // Fallback: plain text with diff-type coloring
  const fallbackColor =
    line.type === "add"
      ? "var(--green)"
      : line.type === "remove"
        ? "var(--coral)"
        : "var(--text-secondary)";

  return (
    <span style={{ ...style, color: fallbackColor }}>{line.content}</span>
  );
}

export function DiffPanel({
  filePath,
  workspace,
  repo,
  prId,
  onPrev,
  onNext,
  currentIndex,
  totalFiles,
}: DiffPanelProps) {
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

  const parsedLines = useMemo(
    () => (diff ? parseDiffLines(diff) : []),
    [diff]
  );

  // Extract just the code content lines for syntax highlighting
  // (skip meta/header lines — they don't need highlighting)
  const codeLines = useMemo(
    () =>
      parsedLines.map((line) =>
        line.type === "meta" || line.type === "header" ? "" : line.content
      ),
    [parsedLines]
  );

  const highlightedTokens = useHighlighter(codeLines, filePath);

  // Empty state
  if (!filePath) {
    return (
      <div
        className="flex items-center justify-center h-full"
        style={{ color: "var(--text-tertiary)", fontSize: "12px" }}
      >
        <div
          className="text-center"
          style={{ maxWidth: "180px", lineHeight: 1.6 }}
        >
          Click a file card to view its diff
        </div>
      </div>
    );
  }

  const { directory, filename } = splitFilePath(filePath);

  return (
    <div className="flex flex-col h-full">
      {/* Navigation bar */}
      <div
        className="flex items-center justify-between"
        style={{
          padding: "8px 12px",
          borderBottom: "1px solid var(--border-default)",
          flexShrink: 0,
          background: "var(--bg-surface)",
        }}
      >
        <div className="flex items-center" style={{ gap: "8px", minWidth: 0, flex: 1 }}>
          {/* Prev/Next */}
          <div className="flex" style={{ gap: "2px", flexShrink: 0 }}>
            <NavButton onClick={onPrev} disabled={currentIndex === 0} label="‹" />
            <NavButton
              onClick={onNext}
              disabled={currentIndex !== undefined && totalFiles !== undefined && currentIndex >= totalFiles - 1}
              label="›"
            />
          </div>
          {/* File path */}
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              minWidth: 0,
            }}
          >
            <span style={{ color: "var(--text-tertiary)" }}>{directory}</span>
            <span style={{ color: "var(--text-primary)" }}>{filename}</span>
          </span>
        </div>
        {/* File counter */}
        {currentIndex !== undefined && totalFiles !== undefined && (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              color: "var(--text-tertiary)",
              flexShrink: 0,
              marginLeft: "8px",
            }}
          >
            {currentIndex + 1}/{totalFiles}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1" style={{ overflowY: "auto" }}>
        {loading && (
          <div
            className="flex items-center justify-center"
            style={{
              padding: "40px",
              color: "var(--text-tertiary)",
              fontSize: "12px",
            }}
          >
            Loading diff...
          </div>
        )}

        {error && (
          <div style={{ padding: "16px", color: "var(--coral)", fontSize: "12px" }}>
            {error}
          </div>
        )}

        {diff && !loading && (
          <div
            style={{
              fontSize: "12px",
              fontFamily: "var(--font-mono)",
              lineHeight: 1.65,
            }}
          >
            {parsedLines.map((line, i) => (
              <div
                key={i}
                className="flex"
                style={{
                  background: rowBg[line.type],
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
                    {line.type === "add"
                      ? "+"
                      : line.type === "remove"
                        ? "-"
                        : " "}
                  </span>
                )}

                {/* Content — syntax highlighted or plain */}
                <LineContent
                  line={line}
                  tokens={
                    highlightedTokens &&
                    line.type !== "meta" &&
                    line.type !== "header"
                      ? highlightedTokens[i] ?? null
                      : null
                  }
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function NavButton({
  onClick,
  disabled,
  label,
}: {
  onClick?: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "24px",
        height: "24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "var(--radius-sm)",
        border: "1px solid var(--border-default)",
        background: "transparent",
        color: disabled ? "var(--text-tertiary)" : "var(--text-secondary)",
        cursor: disabled ? "default" : "pointer",
        fontSize: "14px",
        opacity: disabled ? 0.4 : 1,
        transition: "all var(--transition-fast)",
      }}
      onMouseEnter={(e) => {
        if (!disabled) e.currentTarget.style.background = "var(--bg-elevated)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      {label}
    </button>
  );
}
