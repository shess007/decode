"use client";

interface PhaseHeaderProps {
  number: number;
  label: string;
}

export function PhaseHeader({ number, label }: PhaseHeaderProps) {
  // Strip leading "Phase N — " prefix if the AI included it
  const cleanLabel = label.replace(/^(Phase\s*\d+\s*[·—–-]\s*)/i, "");

  return (
    <div
      style={{
        fontSize: "11px",
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "1.2px",
        color: "var(--text-tertiary)",
        margin: "32px 0 16px",
      }}
    >
      Phase {number} · {cleanLabel}
    </div>
  );
}
