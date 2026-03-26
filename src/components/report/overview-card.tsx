"use client";

import type { DecodeReport } from "@/lib/types";

interface OverviewCardProps {
  overview: DecodeReport["overview"];
  author?: string;
  fileCount?: number;
}

export function OverviewCard({ overview, author, fileCount }: OverviewCardProps) {
  // Truncate goal to max 2 sentences
  const goalSentences = overview.goal.match(/[^.!?]+[.!?]+/g) || [
    overview.goal,
  ];
  const truncatedGoal = goalSentences.slice(0, 2).join(" ");

  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-xl)",
        padding: "24px",
        marginBottom: "24px",
      }}
    >
      {/* Section label */}
      <div
        style={{
          fontSize: "10px",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "1.2px",
          color: "var(--text-tertiary)",
          marginBottom: "14px",
        }}
      >
        PR Overview
      </div>

      {/* Goal */}
      <p
        style={{
          fontSize: "15px",
          lineHeight: 1.6,
          color: "var(--text-primary)",
          margin: 0,
        }}
      >
        {truncatedGoal}
      </p>

      {/* Meta row */}
      <div
        className="flex flex-wrap"
        style={{ gap: "24px", marginTop: "16px" }}
      >
        <MetaItem
          label="Scope"
          value={`${overview.scopeAssessment}${fileCount ? ` · ${fileCount} files` : ""}`}
        />
        <MetaItem label="Approach" value={truncateToSentence(overview.approach)} />
        {author && <MetaItem label="Author" value={author} />}
      </div>

      {/* Decision tags */}
      {overview.keyDecisions.length > 0 && (
        <div
          className="flex flex-wrap"
          style={{ gap: "6px", marginTop: "14px" }}
        >
          {overview.keyDecisions.map((d, i) => (
            <span
              key={i}
              style={{
                fontSize: "11px",
                background: "var(--bg-muted)",
                color: "var(--text-secondary)",
                padding: "4px 10px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-default)",
              }}
            >
              {d}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col" style={{ gap: "2px" }}>
      <span
        style={{
          fontSize: "10px",
          textTransform: "uppercase",
          letterSpacing: "0.8px",
          color: "var(--text-tertiary)",
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
        {value}
      </span>
    </div>
  );
}

function truncateToSentence(text: string): string {
  const match = text.match(/^[^.!?]+[.!?]/);
  return match ? match[0] : text;
}
