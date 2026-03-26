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

  // Find related files from crossFileMap
  const relatedFiles = activeFile ? getRelatedFiles(report, activeFile) : [];

  return (
    <div
      className="flex flex-col h-full"
      style={{
        background: "var(--bg-surface)",
        borderLeft: "1px solid var(--border-default)",
        overflowY: "auto",
      }}
    >
      {/* File annotation section */}
      {activeFile && annotation ? (
        <div style={{ padding: "20px 16px", flex: 1, minHeight: 0, overflowY: "auto" }}>
          {/* Role in this PR */}
          <Section label="Role in this PR">
            <p style={{ fontSize: "11.5px", color: "var(--text-secondary)", lineHeight: 1.55, margin: 0 }}>
              {annotation.roleInPR}
            </p>
          </Section>

          {/* What changed — skip for trivial */}
          {annotation.complexity !== "trivial" && annotation.whatChanged && (
            <Section label="What changed">
              <p style={{ fontSize: "11.5px", color: "var(--text-secondary)", lineHeight: 1.55, margin: 0 }}>
                {annotation.whatChanged}
              </p>
            </Section>
          )}

          {/* Pay attention to */}
          {annotation.payAttentionTo && annotation.payAttentionTo.trim() !== "" && (
            <div
              style={{
                background: "var(--orange-bg)",
                border: "1px solid var(--orange-border)",
                borderRadius: "var(--radius-lg)",
                padding: "10px 12px",
                fontSize: "11.5px",
                color: "var(--orange)",
                lineHeight: 1.55,
                marginTop: "16px",
              }}
            >
              <span style={{ fontWeight: 600 }}>→ </span>
              {annotation.payAttentionTo}
            </div>
          )}

          {/* Related files */}
          {relatedFiles.length > 0 && (
            <div style={{ marginTop: "20px" }}>
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
                Related files
              </div>
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
                        padding: "5px 8px",
                        borderRadius: "var(--radius-md)",
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                        transition: "background var(--transition-fast)",
                        gap: "8px",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = "var(--bg-elevated)")
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
                          fontFamily: "var(--font-mono)",
                          fontSize: "10px",
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
            </div>
          )}
        </div>
      ) : (
        <div
          className="flex items-center justify-center"
          style={{
            flex: 1,
            color: "var(--text-tertiary)",
            fontSize: "11px",
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


function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginTop: "14px" }}>
      <div
        style={{
          fontSize: "10px",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "1px",
          color: "var(--text-tertiary)",
          marginBottom: "4px",
        }}
      >
        {label}
      </div>
      {children}
    </div>
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

