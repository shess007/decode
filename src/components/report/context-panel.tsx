"use client";

import type { DecodeReport } from "@/lib/types";
import {
  changeTypeColor,
  splitFilePath,
} from "./change-type-colors";

interface ContextPanelProps {
  report: DecodeReport;
  activeFile: string | null;
  onFileClick: (filePath: string) => void;
}

export function ContextPanel({
  report,
  activeFile,
  onFileClick,
}: ContextPanelProps) {
  const annotationMap = new Map(
    report.fileAnnotations.map((a) => [a.filePath, a])
  );
  const annotation = activeFile ? annotationMap.get(activeFile) : null;
  const relatedFiles = activeFile ? getRelatedFiles(report, activeFile) : [];

  return (
    <div
      className="flex flex-col h-full"
      style={{
        background: "var(--bg-surface)",
        borderLeft: "1px solid var(--border-card)",
        overflowY: "auto",
      }}
    >
      {activeFile && annotation ? (
        <div style={{ padding: "16px 14px", flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* Role — mini-card */}
          <MiniCard label="Role">
            <p style={{ fontSize: "13px", color: "var(--text-primary)", lineHeight: 1.6, margin: 0 }}>
              {annotation.roleInPR}
            </p>
          </MiniCard>

          {/* What changed — mini-card, skip for trivial */}
          {annotation.complexity !== "trivial" && annotation.whatChanged && (
            <MiniCard label="What changed">
              <BulletList items={toArray(annotation.whatChanged)} />
            </MiniCard>
          )}

          {/* Attention callout — elevated card */}
          {annotation.payAttentionTo && toArray(annotation.payAttentionTo).filter(s => s.trim()).length > 0 && (
            <div
              style={{
                background: "var(--orange-bg)",
                border: "1px solid var(--orange-border)",
                borderRadius: "var(--radius-lg)",
                padding: "12px 14px",
                fontSize: "12.5px",
                color: "var(--orange)",
                lineHeight: 1.6,
              }}
            >
              <div
                style={{
                  fontSize: "10px",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                  marginBottom: "6px",
                  opacity: 0.8,
                }}
              >
                Attention
              </div>
              <BulletList items={toArray(annotation.payAttentionTo)} color="var(--orange)" />
            </div>
          )}

          {/* Related files — mini-card */}
          {relatedFiles.length > 0 && (
            <MiniCard label="Related files">
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                {relatedFiles.map((rf) => {
                  const rfAnnotation = annotationMap.get(rf.filePath);
                  const dotColor = rfAnnotation
                    ? changeTypeColor[rfAnnotation.changeType]
                    : "var(--text-tertiary)";
                  const { filename } = splitFilePath(rf.filePath);
                  return (
                    <button
                      key={rf.filePath}
                      onClick={() => onFileClick(rf.filePath)}
                      className="flex items-center w-full text-left"
                      style={{
                        padding: "4px 6px",
                        borderRadius: "var(--radius-sm)",
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                        transition: "background var(--transition-fast)",
                        gap: "8px",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = "var(--bg-muted)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      <span
                        style={{
                          width: "6px",
                          height: "6px",
                          borderRadius: "50%",
                          flexShrink: 0,
                          background: dotColor,
                        }}
                      />
                      <span
                        style={{
                          fontFamily: "var(--font-sans)",
                          fontSize: "11px",
                          color: "var(--text-secondary)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          flex: 1,
                          minWidth: 0,
                        }}
                      >
                        {filename}
                      </span>
                      {rf.relationship && (
                        <span
                          style={{
                            fontSize: "10px",
                            color: "var(--text-tertiary)",
                            flexShrink: 0,
                          }}
                        >
                          {rf.relationship}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </MiniCard>
          )}
        </div>
      ) : (
        <div
          className="flex items-center justify-center"
          style={{
            flex: 1,
            color: "var(--text-tertiary)",
            fontSize: "12px",
            padding: "20px",
            textAlign: "center",
          }}
        >
          Select a file to see annotations
        </div>
      )}
    </div>
  );
}

function MiniCard({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "var(--bg-elevated)",
        borderRadius: "var(--radius-lg)",
        padding: "12px 14px",
        border: "1px solid var(--border-default)",
      }}
    >
      <div
        style={{
          fontSize: "10px",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "1px",
          color: "var(--text-tertiary)",
          marginBottom: "8px",
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

/** Convert string or string[] to string[], handling legacy cached reports */
function toArray(value: string | string[]): string[] {
  if (Array.isArray(value)) return value;
  // Legacy: split on sentence boundaries as fallback, but keep it simple
  return [value];
}

function BulletList({ items, color }: { items: string[]; color?: string }) {
  const textColor = color || "var(--text-secondary)";
  const dotColor = color || "var(--accent)";
  const filtered = items.filter((s) => s.trim());

  if (filtered.length === 0) return null;

  if (filtered.length === 1) {
    return (
      <p style={{ fontSize: "12.5px", color: textColor, lineHeight: 1.6, margin: 0 }}>
        {filtered[0]}
      </p>
    );
  }

  return (
    <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
      {filtered.map((s, i) => (
        <li
          key={i}
          className="flex"
          style={{
            fontSize: "12.5px",
            color: textColor,
            lineHeight: 1.6,
            marginBottom: "4px",
            gap: "8px",
          }}
        >
          <span
            style={{
              color: dotColor,
              flexShrink: 0,
              fontSize: "14px",
              lineHeight: "20px",
              opacity: 0.7,
            }}
          >
            •
          </span>
          <span>{s.trim()}</span>
        </li>
      ))}
    </ul>
  );
}

interface RelatedFile {
  filePath: string;
  relationship: string;
}

function getRelatedFiles(
  report: DecodeReport,
  activeFile: string
): RelatedFile[] {
  const related = new Map<string, string>();

  for (const group of report.crossFileMap.groups) {
    if (group.files.includes(activeFile)) {
      for (const f of group.files) {
        if (f !== activeFile && !related.has(f)) {
          related.set(f, group.label);
        }
      }
    }
  }

  for (const flow of report.crossFileMap.dataFlows) {
    if (flow.files.includes(activeFile)) {
      for (const f of flow.files) {
        if (f !== activeFile && !related.has(f)) {
          related.set(f, "data flow");
        }
      }
    }
  }

  return Array.from(related.entries()).map(([filePath, relationship]) => ({
    filePath,
    relationship,
  }));
}
