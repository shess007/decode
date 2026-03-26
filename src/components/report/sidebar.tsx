"use client";

import type { DecodeReport, FileAnnotation } from "@/lib/types";
import {
  changeTypeColor,
  splitFilePath,
} from "./change-type-colors";

interface SidebarProps {
  report: DecodeReport;
  activeFile: string | null;
  onFileClick: (filePath: string) => void;
}

export function Sidebar({ report, activeFile, onFileClick }: SidebarProps) {
  const annotationMap = new Map(
    report.fileAnnotations.map((a) => [a.filePath, a])
  );

  return (
    <aside
      style={{
        background: "var(--bg-surface)",
        borderRight: "1px solid var(--border-default)",
        position: "sticky",
        top: 0,
        height: "100vh",
        overflowY: "auto",
        padding: "20px 0",
        width: "260px",
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "14px",
          color: "var(--accent)",
          letterSpacing: "-0.5px",
          opacity: 0.9,
          padding: "0 20px 20px",
        }}
      >
        {"{decode}"}
      </div>

      {/* Review Order */}
      <div style={{ padding: "0 12px" }}>
        <div
          style={{
            fontSize: "10px",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "1.2px",
            color: "var(--text-tertiary)",
            padding: "0 8px",
            marginBottom: "12px",
          }}
        >
          Review Order
        </div>

        {report.reviewOrder.phases.map((phase, i) => (
          <div key={i} style={{ marginBottom: "16px" }}>
            {/* Phase header */}
            <div
              className="flex items-baseline gap-2"
              style={{ marginBottom: "6px", padding: "0 8px" }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "10px",
                  fontWeight: 600,
                  color: "var(--accent)",
                  background: "var(--accent-dim)",
                  padding: "2px 6px",
                  borderRadius: "var(--radius-sm)",
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 500,
                  color: "var(--text-primary)",
                }}
              >
                {phase.label.replace(/^(Phase\s*\d+\s*[·—–-]\s*)/i, "")}
              </span>
            </div>

            {/* Files in phase */}
            {phase.files.map((filePath) => {
              const annotation = annotationMap.get(filePath);
              const { filename } = splitFilePath(filePath);
              const dotColor = annotation
                ? changeTypeColor[annotation.changeType]
                : "var(--text-tertiary)";
              const isActive = activeFile === filePath;

              return (
                <button
                  key={filePath}
                  onClick={() => onFileClick(filePath)}
                  className="flex items-center gap-2 w-full text-left"
                  style={{
                    padding: "4px 8px 4px 24px",
                    borderRadius: "var(--radius-md)",
                    cursor: "pointer",
                    transition: `background var(--transition-fast)`,
                    background: isActive
                      ? "var(--accent-dim)"
                      : "transparent",
                    border: "none",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive)
                      e.currentTarget.style.background = "var(--bg-elevated)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive)
                      e.currentTarget.style.background = "transparent";
                  }}
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
                      fontSize: "11px",
                      color: "var(--text-secondary)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {filename}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Connections */}
      {report.crossFileMap.dataFlows.length > 0 && (
        <div
          style={{
            marginTop: "24px",
            borderTop: "1px solid var(--border-default)",
            paddingTop: "16px",
            padding: "16px 20px 0",
          }}
        >
          <div
            style={{
              fontSize: "10px",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "1.2px",
              color: "var(--text-tertiary)",
              marginBottom: "10px",
            }}
          >
            Connections
          </div>
          {report.crossFileMap.dataFlows.map((flow, i) => (
            <div
              key={i}
              style={{
                fontSize: "11px",
                lineHeight: "1.55",
                color:
                  i === 0
                    ? "var(--text-secondary)"
                    : "var(--text-tertiary)",
                marginBottom: "4px",
              }}
            >
              {flow.description}
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}
