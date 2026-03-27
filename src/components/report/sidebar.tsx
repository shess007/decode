"use client";

import { useState } from "react";
import type { DecodeReport } from "@/lib/types";
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
        borderRight: "1px solid var(--border-card)",
        overflowY: "auto",
        padding: "16px 0",
      }}
    >
      {/* PR Overview — collapsible card */}
      <div style={{ padding: "0 10px", marginBottom: "14px" }}>
        <div
          style={{
            background: "var(--bg-elevated)",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border-default)",
            overflow: "hidden",
          }}
        >
          <button
            onClick={() => setOverviewOpen(!overviewOpen)}
            className="flex items-center justify-between w-full"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "10px 12px",
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

          {/* Goal — always visible */}
          <div style={{ padding: "0 12px 12px" }}>
            <p
              style={{
                fontSize: "12.5px",
                color: "var(--text-primary)",
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              {truncateToSentences(report.overview.goal, 2)}
            </p>
          </div>

          {/* Key decisions — collapsible */}
          {report.overview.keyDecisions.length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateRows: overviewOpen ? "1fr" : "0fr",
                transition: "grid-template-rows var(--transition-normal)",
              }}
            >
              <div style={{ overflow: "hidden" }}>
                <div style={{ padding: "0 12px 12px" }}>
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
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Review Order */}
      <div style={{ padding: "0 10px" }}>
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
          <div
            key={i}
            style={{
              marginBottom: "20px",
              paddingBottom: "16px",
              borderBottom: i < report.reviewOrder.phases.length - 1 ? "1px solid var(--border-default)" : "none",
            }}
          >
            {/* Phase header — circular number + label */}
            <div
              className="flex items-start"
              style={{ gap: "8px", marginBottom: "6px", padding: "0 6px" }}
            >
              <span
                className="flex items-center justify-center"
                style={{
                  width: "22px",
                  height: "22px",
                  borderRadius: "50%",
                  background: "var(--bg-muted)",
                  border: "1px solid var(--border-default)",
                  fontSize: "11px",
                  fontWeight: 500,
                  color: "var(--text-secondary)",
                  flexShrink: 0,
                }}
              >
                {i + 1}
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
                    padding: "5px 8px 5px 36px",
                    borderRadius: "var(--radius-md)",
                    cursor: "pointer",
                    transition: "all var(--transition-fast)",
                    background: isActive ? "var(--accent-dim)" : "transparent",
                    borderLeft: isActive
                      ? "2px solid var(--accent)"
                      : "2px solid transparent",
                    border: "none",
                    borderLeftWidth: "2px",
                    borderLeftStyle: "solid",
                    borderLeftColor: isActive ? "var(--accent)" : "transparent",
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
                      fontFamily: "var(--font-sans)",
                      fontSize: "12px",
                      color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
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

      {/* Connections — mini-card */}
      {report.crossFileMap.dataFlows.length > 0 && (
        <div style={{ padding: "0 10px", marginTop: "12px" }}>
          <div
            style={{
              background: "var(--bg-elevated)",
              borderRadius: "var(--radius-lg)",
              padding: "12px",
              border: "1px solid var(--border-default)",
            }}
          >
            <div
              style={{
                fontSize: "10px",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "1.2px",
                color: "var(--text-tertiary)",
                marginBottom: "8px",
              }}
            >
              Connections
            </div>
            {report.crossFileMap.dataFlows.slice(0, 3).map((flow, i) => (
              <div
                key={i}
                style={{
                  fontSize: "11px",
                  lineHeight: "1.55",
                  color: "var(--text-secondary)",
                  marginBottom: "4px",
                }}
              >
                {flow.description}
              </div>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}

function truncateToSentences(text: string, max: number): string {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  return sentences.slice(0, max).join(" ");
}
