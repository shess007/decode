"use client";

import { useState } from "react";
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
  const [overviewOpen, setOverviewOpen] = useState(true);
  const annotationMap = new Map(
    report.fileAnnotations.map((a) => [a.filePath, a])
  );

  return (
    <aside
      style={{
        background: "var(--bg-surface)",
        borderRight: "1px solid var(--border-default)",
        overflowY: "auto",
        padding: "16px 0",
      }}
    >
      {/* PR Overview — collapsible */}
      <div style={{ padding: "0 16px 0" }}>
        <button
          onClick={() => setOverviewOpen(!overviewOpen)}
          className="flex items-center justify-between w-full"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "0 0 10px",
          }}
        >
          <span
            style={{
              fontSize: "10px",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "1.2px",
              color: "var(--text-tertiary)",
            }}
          >
            PR Overview
          </span>
          <span
            style={{
              fontSize: "12px",
              color: "var(--text-tertiary)",
              transition: "transform var(--transition-normal)",
              transform: overviewOpen ? "rotate(90deg)" : "rotate(0deg)",
            }}
          >
            ›
          </span>
        </button>

        <div
          style={{
            display: "grid",
            gridTemplateRows: overviewOpen ? "1fr" : "0fr",
            transition: "grid-template-rows var(--transition-normal)",
          }}
        >
          <div style={{ overflow: "hidden" }}>
            <div style={{ paddingBottom: "16px" }}>
              <p
                style={{
                  fontSize: "12.5px",
                  color: "var(--text-primary)",
                  lineHeight: 1.6,
                  margin: "0 0 10px",
                }}
              >
                {truncateToSentences(report.overview.goal, 2)}
              </p>
              {report.overview.keyDecisions.length > 0 && (
                <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                  {report.overview.keyDecisions.slice(0, 5).map((d, i) => (
                    <li
                      key={i}
                      className="flex"
                      style={{
                        fontSize: "11px",
                        color: "var(--text-secondary)",
                        lineHeight: 1.5,
                        marginBottom: "4px",
                        gap: "8px",
                      }}
                    >
                      <span
                        style={{
                          color: "var(--accent)",
                          flexShrink: 0,
                          fontSize: "14px",
                          lineHeight: "16px",
                        }}
                      >
                        •
                      </span>
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      <div style={{ borderTop: "1px solid var(--border-default)", marginBottom: "12px" }} />

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

function truncateToSentences(text: string, max: number): string {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  return sentences.slice(0, max).join(" ");
}
