"use client";

import { useRef, useEffect } from "react";
import type { FileAnnotation } from "@/lib/types";
import {
  changeTypeColor,
  changeTypeBadgeBg,
  complexityConfig,
  splitFilePath,
} from "./change-type-colors";

interface FileCardProps {
  filePath: string;
  annotation: FileAnnotation;
  linesAdded?: number;
  linesRemoved?: number;
  isExpanded: boolean;
  isActive: boolean;
  onToggle: () => void;
  bitbucketUrl?: string;
}

export function FileCard({
  filePath,
  annotation,
  linesAdded,
  linesRemoved,
  isExpanded,
  isActive,
  onToggle,
  bitbucketUrl,
}: FileCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const { directory, filename } = splitFilePath(filePath);
  const dotColor = changeTypeColor[annotation.changeType];
  const badgeBg = changeTypeBadgeBg[annotation.changeType];
  const badgeText = changeTypeColor[annotation.changeType];
  const complexity = complexityConfig[annotation.complexity];
  const isTrivial = annotation.complexity === "trivial";

  // Scroll into view when activated from sidebar
  useEffect(() => {
    if (isActive && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [isActive]);

  return (
    <div
      ref={cardRef}
      id={`file-${encodeURIComponent(filePath)}`}
      style={{
        background: "var(--bg-surface)",
        border: `1px solid ${isExpanded ? "var(--border-active)" : "var(--border-default)"}`,
        borderRadius: "var(--radius-xl)",
        marginBottom: "12px",
        overflow: "hidden",
        transition: `border-color var(--transition-normal)`,
      }}
      onMouseEnter={(e) => {
        if (!isExpanded)
          e.currentTarget.style.borderColor = "var(--border-hover)";
      }}
      onMouseLeave={(e) => {
        if (!isExpanded)
          e.currentTarget.style.borderColor = "var(--border-default)";
      }}
    >
      {/* Header — always visible */}
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full text-left"
        style={{
          padding: "14px 18px",
          cursor: "pointer",
          userSelect: "none",
          background: "transparent",
          border: "none",
          transition: `background var(--transition-fast)`,
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.background = "var(--bg-elevated)")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.background = "transparent")
        }
      >
        {/* Left: dot + path + badge */}
        <div
          className="flex items-center"
          style={{ gap: "10px", minWidth: 0, flex: 1 }}
        >
          {/* Dot */}
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              flexShrink: 0,
              background: dotColor,
            }}
          />

          {/* File path */}
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "12px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              minWidth: 0,
            }}
          >
            <span style={{ color: "var(--text-tertiary)" }}>{directory}</span>
            <span style={{ color: "var(--text-primary)" }}>{filename}</span>
          </span>

          {/* Change type badge */}
          <span
            style={{
              fontSize: "10px",
              fontWeight: 600,
              padding: "3px 8px",
              borderRadius: "var(--radius-sm)",
              whiteSpace: "nowrap",
              letterSpacing: "0.3px",
              textTransform: "lowercase",
              background: badgeBg,
              color: badgeText,
              flexShrink: 0,
            }}
          >
            {annotation.changeType}
          </span>
        </div>

        {/* Right: stats + complexity + chevron */}
        <div
          className="flex items-center"
          style={{ gap: "12px", flexShrink: 0, marginLeft: "16px" }}
        >
          {/* Line stats */}
          {(linesAdded !== undefined || linesRemoved !== undefined) && (
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                color: "var(--text-tertiary)",
              }}
            >
              {linesAdded !== undefined && linesAdded > 0 && (
                <span style={{ color: "var(--green)" }}>+{linesAdded}</span>
              )}
              {linesAdded !== undefined &&
                linesAdded > 0 &&
                linesRemoved !== undefined &&
                linesRemoved > 0 &&
                " "}
              {linesRemoved !== undefined && linesRemoved > 0 && (
                <span style={{ color: "var(--coral)" }}>-{linesRemoved}</span>
              )}
            </span>
          )}

          {/* Complexity bars */}
          <div className="flex items-center" style={{ gap: "2px" }}>
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                style={{
                  width: "4px",
                  height: "12px",
                  borderRadius: "2px",
                  background:
                    i < complexity.bars
                      ? complexity.color
                      : "var(--bg-muted)",
                }}
              />
            ))}
          </div>

          {/* Chevron */}
          <span
            style={{
              color: "var(--text-tertiary)",
              fontSize: "14px",
              transition: `transform var(--transition-normal)`,
              transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
              marginLeft: "4px",
            }}
          >
            ›
          </span>
        </div>
      </button>

      {/* Body — expanded content */}
      <div
        ref={bodyRef}
        style={{
          display: "grid",
          gridTemplateRows: isExpanded ? "1fr" : "0fr",
          transition: "grid-template-rows var(--transition-normal)",
        }}
      >
        <div style={{ overflow: "hidden" }}>
          <div style={{ padding: "0 18px 16px" }}>
            {/* Role sentence */}
            <p
              style={{
                fontSize: "13px",
                color: "var(--text-primary)",
                lineHeight: 1.55,
                marginBottom: isTrivial ? 0 : "12px",
                margin: 0,
              }}
            >
              {annotation.roleInPR}
            </p>

            {/* What changed — skip for trivial */}
            {!isTrivial && annotation.whatChanged && (
              <div style={{ marginBottom: "10px" }}>
                <div
                  style={{
                    fontSize: "10px",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    color: "var(--text-tertiary)",
                    marginBottom: "4px",
                    fontWeight: 600,
                  }}
                >
                  What Changed
                </div>
                <p
                  style={{
                    fontSize: "12px",
                    color: "var(--text-secondary)",
                    lineHeight: 1.6,
                    margin: 0,
                  }}
                >
                  {annotation.whatChanged}
                </p>
              </div>
            )}

            {/* Attention callout */}
            {annotation.payAttentionTo &&
              annotation.payAttentionTo.trim() !== "" && (
                <div
                  style={{
                    background: "var(--orange-bg)",
                    border: "1px solid var(--orange-border)",
                    borderRadius: "var(--radius-lg)",
                    padding: "10px 14px",
                    fontSize: "12px",
                    color: "var(--orange)",
                    lineHeight: 1.55,
                    marginTop: "8px",
                  }}
                >
                  <span style={{ fontWeight: 600 }}>→ </span>
                  {annotation.payAttentionTo}
                </div>
              )}

            {/* Bitbucket link */}
            {bitbucketUrl && (
              <a
                href={bitbucketUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "11px",
                  color: "var(--accent)",
                  textDecoration: "none",
                  opacity: 0.7,
                  marginTop: "10px",
                  display: "inline-block",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = "1";
                  e.currentTarget.style.textDecoration = "underline";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = "0.7";
                  e.currentTarget.style.textDecoration = "none";
                }}
              >
                View diff in Bitbucket →
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
