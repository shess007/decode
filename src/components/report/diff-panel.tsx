"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { splitFilePath, changeTypeColor, changeTypeBadgeBg, complexityConfig } from "./change-type-colors";
import { useHighlighter, type TokenizedLine } from "@/lib/use-highlighter";
import type { FileAnnotation } from "@/lib/types";

interface DiffPanelProps {
  filePath: string | null;
  workspace: string;
  repo: string;
  prId: number;
  annotation?: FileAnnotation | null;
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

interface PostedComment {
  line: number;
  lineType: "add" | "remove" | "context";
  content: string;
  commentId: number;
  htmlUrl?: string;
}

function parseDiffLines(raw: string): DiffLine[] {
  const lines: DiffLine[] = [];
  let oldLine = 0;
  let newLine = 0;

  for (const line of raw.split("\n")) {
    // Skip git meta lines — not useful for reviewers
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
      lines.push({ type: "remove", content: line.slice(1), oldNum: oldLine });
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

function getLineKey(line: DiffLine): string | null {
  if (line.type === "meta" || line.type === "header") return null;
  const num = line.type === "remove" ? line.oldNum : line.newNum;
  return num !== undefined ? `${line.type}:${num}` : null;
}

const rowBg: Record<DiffLine["type"], string> = {
  add: "rgba(52, 211, 153, 0.06)",
  remove: "rgba(240, 123, 110, 0.06)",
  context: "transparent",
  header: "var(--bg-muted)",
  meta: "transparent",
};

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

  if (line.type === "meta") {
    return (
      <span
        style={{ ...style, color: "var(--text-tertiary)", fontStyle: "italic" }}
      >
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

// ── Inline comment input ────────────────────────────────────────

function CommentInput({
  onSubmit,
  onCancel,
  submitting,
}: {
  onSubmit: (content: string) => void;
  onCancel: () => void;
  submitting: boolean;
}) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (value.trim()) onSubmit(value.trim());
    }
    if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div
      style={{
        padding: "8px 8px 8px 100px",
        background: "var(--bg-elevated)",
        borderTop: "1px solid var(--border-default)",
        borderBottom: "1px solid var(--border-default)",
      }}
    >
      <textarea
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Write a comment... (Cmd+Enter to submit, Esc to cancel)"
        disabled={submitting}
        rows={3}
        style={{
          width: "100%",
          background: "var(--bg-muted)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-md)",
          color: "var(--text-primary)",
          fontSize: "12px",
          fontFamily: "var(--font-sans)",
          padding: "8px 10px",
          resize: "vertical",
          outline: "none",
          lineHeight: 1.5,
        }}
        onFocus={(e) =>
          (e.currentTarget.style.borderColor = "var(--accent)")
        }
        onBlur={(e) =>
          (e.currentTarget.style.borderColor = "var(--border-default)")
        }
      />
      <div
        className="flex items-center justify-between"
        style={{ marginTop: "6px" }}
      >
        <span style={{ fontSize: "10px", color: "var(--text-tertiary)" }}>
          Cmd+Enter to submit · Esc to cancel
        </span>
        <div className="flex" style={{ gap: "6px" }}>
          <button
            onClick={onCancel}
            disabled={submitting}
            style={{
              padding: "4px 12px",
              fontSize: "11px",
              color: "var(--text-secondary)",
              background: "transparent",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-sm)",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => value.trim() && onSubmit(value.trim())}
            disabled={submitting || !value.trim()}
            style={{
              padding: "4px 12px",
              fontSize: "11px",
              color: "#fff",
              background: "var(--accent)",
              border: "none",
              borderRadius: "var(--radius-sm)",
              cursor:
                submitting || !value.trim() ? "not-allowed" : "pointer",
              opacity: submitting || !value.trim() ? 0.5 : 1,
            }}
          >
            {submitting ? "Posting..." : "Comment"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Posted comment display ──────────────────────────────────────

function PostedCommentBubble({ comment }: { comment: PostedComment }) {
  return (
    <div
      style={{
        padding: "6px 8px 6px 100px",
        background: "var(--accent-dim)",
        borderTop: "1px solid var(--border-default)",
        borderBottom: "1px solid var(--border-default)",
      }}
    >
      <div
        className="flex items-start justify-between"
        style={{ gap: "8px" }}
      >
        <div
          style={{
            fontSize: "11px",
            color: "var(--text-primary)",
            lineHeight: 1.5,
            fontFamily: "var(--font-sans)",
            flex: 1,
            minWidth: 0,
          }}
        >
          <span style={{ color: "var(--accent)", marginRight: "6px" }}>💬</span>
          {comment.content}
        </div>
        {comment.htmlUrl && (
          <a
            href={comment.htmlUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: "10px",
              color: "var(--accent)",
              textDecoration: "none",
              flexShrink: 0,
              opacity: 0.7,
              transition: "opacity var(--transition-fast)",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.7")}
          >
            view in BB ↗
          </a>
        )}
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────

export function DiffPanel({
  filePath,
  workspace,
  repo,
  prId,
  annotation,
  onPrev,
  onNext,
  currentIndex,
  totalFiles,
}: DiffPanelProps) {
  const [diff, setDiff] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [commentingLineIdx, setCommentingLineIdx] = useState<number | null>(null);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [postedComments, setPostedComments] = useState<
    Map<string, PostedComment[]>
  >(new Map());

  // Reset comment input when file changes
  useEffect(() => {
    setCommentingLineIdx(null);
  }, [filePath]);

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

  const codeLines = useMemo(
    () =>
      parsedLines.map((line) =>
        line.type === "meta" || line.type === "header" ? "" : line.content
      ),
    [parsedLines]
  );

  const highlightedTokens = useHighlighter(codeLines, filePath);

  const handleLineClick = useCallback(
    (idx: number) => {
      setCommentingLineIdx((prev) => (prev === idx ? null : idx));
    },
    []
  );

  const handleSubmitComment = useCallback(
    async (content: string) => {
      if (!filePath || commentingLineIdx === null) return;

      const line = parsedLines[commentingLineIdx];
      if (!line) return;

      const lineType = line.type as "add" | "remove" | "context";
      const lineNum = lineType === "remove" ? line.oldNum! : line.newNum!;

      setSubmittingComment(true);

      try {
        const res = await fetch("/api/decode/comments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workspace,
            repo,
            prId,
            filePath,
            line: lineNum,
            lineType,
            content,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to post comment");
        }

        const data = await res.json();

        // Store the posted comment
        const comment: PostedComment = {
          line: lineNum,
          lineType: lineType as "add" | "remove" | "context",
          content,
          commentId: data.commentId,
          htmlUrl: data.htmlUrl,
        };

        setPostedComments((prev) => {
          const next = new Map(prev);
          const fileComments = next.get(filePath) || [];
          next.set(filePath, [...fileComments, comment]);
          return next;
        });

        setCommentingLineIdx(null);
      } catch (e) {
        alert(e instanceof Error ? e.message : "Failed to post comment");
      } finally {
        setSubmittingComment(false);
      }
    },
    [filePath, commentingLineIdx, parsedLines, workspace, repo, prId]
  );

  // Get posted comments for current file
  const filePosted = filePath ? postedComments.get(filePath) || [] : [];
  const postedLineKeys = new Set(
    filePosted.map((c) => `${c.lineType}:${c.line}`)
  );

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
          Select a file to view its diff
        </div>
      </div>
    );
  }

  const { directory, filename } = splitFilePath(filePath);

  return (
    <div className="flex flex-col h-full" style={{ padding: "10px", background: "var(--bg-base)" }}>
      <div
        className="flex flex-col flex-1"
        style={{
          background: "var(--bg-card)",
          borderRadius: "var(--radius-xl)",
          border: "1px solid var(--border-card)",
          overflow: "hidden",
          minHeight: 0,
        }}
      >
      {/* Navigation bar */}
      <div
        className="flex items-center justify-between"
        style={{
          padding: "10px 14px",
          borderBottom: "1px solid var(--border-default)",
          flexShrink: 0,
          background: "var(--bg-card-header)",
        }}
      >
        <div
          className="flex items-center"
          style={{ gap: "8px", minWidth: 0, flex: 1 }}
        >
          <div className="flex" style={{ gap: "2px", flexShrink: 0 }}>
            <NavButton
              onClick={onPrev}
              disabled={currentIndex === 0}
              label="‹"
            />
            <NavButton
              onClick={onNext}
              disabled={
                currentIndex !== undefined &&
                totalFiles !== undefined &&
                currentIndex >= totalFiles - 1
              }
              label="›"
            />
          </div>
          <a
            href={`https://bitbucket.org/${workspace}/${repo}/pull-requests/${prId}/diff#chg-${filePath}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              minWidth: 0,
              textDecoration: "none",
              transition: "opacity var(--transition-fast)",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.7")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            <span style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-sans)", fontSize: "12px" }}>{directory}</span>
            <span style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)", fontSize: "12px" }}>{filename}</span>
            <span style={{ color: "var(--text-tertiary)", marginLeft: "4px", fontSize: "10px" }}>↗</span>
          </a>
          {annotation && (
            <>
              <span
                style={{
                  fontSize: "9px",
                  fontWeight: 600,
                  padding: "2px 9px",
                  borderRadius: "999px",
                  letterSpacing: "0.3px",
                  textTransform: "lowercase",
                  background: changeTypeBadgeBg[annotation.changeType],
                  color: changeTypeColor[annotation.changeType],
                  flexShrink: 0,
                  whiteSpace: "nowrap",
                }}
              >
                {annotation.changeType}
              </span>
              <div className="flex items-center" style={{ gap: "2px", flexShrink: 0 }}>
                {[0, 1, 2].map((j) => (
                  <span
                    key={j}
                    style={{
                      width: "3px",
                      height: "10px",
                      borderRadius: "1.5px",
                      background:
                        j < complexityConfig[annotation.complexity].bars
                          ? complexityConfig[annotation.complexity].color
                          : "var(--bg-muted)",
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </div>
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
          <div
            style={{ padding: "16px", color: "var(--coral)", fontSize: "12px" }}
          >
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
            {parsedLines.map((line, i) => {
              const lineKey = getLineKey(line);
              const isCommentable =
                line.type === "add" ||
                line.type === "remove" ||
                line.type === "context";
              const hasComment = lineKey ? postedLineKeys.has(lineKey) : false;
              const isCommenting = i === commentingLineIdx;

              // Find posted comments for this line
              const lineComments = lineKey
                ? filePosted.filter(
                    (c) => `${c.lineType}:${c.line}` === lineKey
                  )
                : [];

              return (
                <div key={i}>
                  <div
                    className={`flex group${isCommentable ? " diff-line-hover" : ""}${isCommenting ? " diff-line-commenting" : ""}`}
                    style={{
                      background: rowBg[line.type],
                      minHeight: "20px",
                      position: "relative",
                      cursor: isCommentable ? "pointer" : "default",
                    }}
                    onClick={() => isCommentable && handleLineClick(i)}
                  >
                    {/* Line numbers */}
                    {line.type !== "meta" && line.type !== "header" && (
                      <span
                        className="flex-shrink-0"
                        style={{
                          width: "84px",
                          padding: "0 8px",
                          textAlign: "right",
                          color: "var(--text-tertiary)",
                          fontSize: "11px",
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

                    {/* Gutter indicator + comment icon */}
                    {line.type !== "meta" && line.type !== "header" && (
                      <span
                        className="flex-shrink-0"
                        style={{
                          width: "20px",
                          textAlign: "center",
                          userSelect: "none",
                          color: hasComment
                            ? "var(--accent)"
                            : line.type === "add"
                              ? "var(--green)"
                              : line.type === "remove"
                                ? "var(--coral)"
                                : "transparent",
                        }}
                      >
                        {hasComment
                          ? "💬"
                          : line.type === "add"
                            ? "+"
                            : line.type === "remove"
                              ? "-"
                              : " "}
                      </span>
                    )}

                    {/* Content */}
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

                    {/* Hover comment button */}
                    {isCommentable && !hasComment && (
                      <span
                        className="opacity-0 group-hover:opacity-100"
                        style={{
                          position: "absolute",
                          right: "8px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          fontSize: "10px",
                          color: "var(--accent)",
                          transition: "opacity var(--transition-fast)",
                          pointerEvents: "none",
                        }}
                      >
                        +
                      </span>
                    )}
                  </div>

                  {/* Posted comments on this line */}
                  {lineComments.map((c) => (
                    <PostedCommentBubble key={c.commentId} comment={c} />
                  ))}

                  {/* Comment input */}
                  {isCommenting && (
                    <CommentInput
                      onSubmit={handleSubmitComment}
                      onCancel={() => setCommentingLineIdx(null)}
                      submitting={submittingComment}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
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
        if (!disabled)
          e.currentTarget.style.background = "var(--bg-elevated)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      {label}
    </button>
  );
}
