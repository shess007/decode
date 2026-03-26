"use client";

import { useDecodeStore } from "@/stores/decode-store";
import { useAuthStore } from "@/stores/auth-store";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
import { TopBar } from "@/components/report/topbar";
import { Sidebar } from "@/components/report/sidebar";
import { OverviewCard } from "@/components/report/overview-card";
import { PhaseHeader } from "@/components/report/phase-header";
import { FileCard } from "@/components/report/file-card";
import { DiffPanel } from "@/components/report/diff-panel";

export default function ReportPage() {
  const { report, reportContext, selectedPR, selectedWorkspace, selectedRepo, decoding, error } =
    useDecodeStore();
  const { user, loading, fetchSession } = useAuthStore();
  const router = useRouter();

  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [diffFile, setDiffFile] = useState<string | null>(null);
  const [focusIndex, setFocusIndex] = useState<number>(-1);
  const mainRef = useRef<HTMLElement>(null);

  // Ordered list of all file paths in review order
  const allFiles = report?.reviewOrder.phases.flatMap((p) => p.files) ?? [];

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [loading, user, router]);

  // Intersection observer for scroll sync
  useEffect(() => {
    if (!report || !mainRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const filePath = decodeURIComponent(
              entry.target.id.replace("file-", "")
            );
            setActiveFile(filePath);
          }
        }
      },
      {
        root: mainRef.current,
        rootMargin: "-20% 0px -60% 0px",
        threshold: 0,
      }
    );

    const cards = mainRef.current.querySelectorAll("[id^='file-']");
    cards.forEach((card) => observer.observe(card));

    return () => observer.disconnect();
  }, [report]);

  // Keyboard navigation
  useEffect(() => {
    if (!report) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      switch (e.key) {
        case "j": {
          e.preventDefault();
          const next = Math.min(focusIndex + 1, allFiles.length - 1);
          setFocusIndex(next);
          scrollToFile(allFiles[next]);
          break;
        }
        case "k": {
          e.preventDefault();
          const prev = Math.max(focusIndex - 1, 0);
          setFocusIndex(prev);
          scrollToFile(allFiles[prev]);
          break;
        }
        case "Enter":
        case " ": {
          if (focusIndex >= 0 && focusIndex < allFiles.length) {
            e.preventDefault();
            toggleExpand(allFiles[focusIndex]);
          }
          break;
        }
        case "Escape": {
          e.preventDefault();
          setExpandedFiles(new Set());
          setDiffFile(null);
          break;
        }
        default: {
          const num = parseInt(e.key, 10);
          if (num >= 1 && num <= report.reviewOrder.phases.length) {
            e.preventDefault();
            const phase = report.reviewOrder.phases[num - 1];
            if (phase.files.length > 0) {
              scrollToFile(phase.files[0]);
            }
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [report, focusIndex, allFiles]);

  const toggleExpand = useCallback(
    (filePath: string) => {
      setExpandedFiles((prev) => {
        const next = new Set(prev);
        if (next.has(filePath)) {
          next.delete(filePath);
          // If collapsing the file whose diff is shown, clear the diff
          if (diffFile === filePath) setDiffFile(null);
        } else {
          next.add(filePath);
          // Show diff when expanding
          setDiffFile(filePath);
        }
        return next;
      });
    },
    [diffFile]
  );

  const scrollToFile = useCallback(
    (filePath: string) => {
      setActiveFile(filePath);
      setFocusIndex(allFiles.indexOf(filePath));

      // Expand if collapsed
      setExpandedFiles((prev) => {
        if (prev.has(filePath)) return prev;
        const next = new Set(prev);
        next.add(filePath);
        return next;
      });

      // Show diff
      setDiffFile(filePath);

      // Scroll to card
      const el = document.getElementById(
        `file-${encodeURIComponent(filePath)}`
      );
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    },
    [allFiles]
  );

  const toggleAll = useCallback(() => {
    if (expandedFiles.size === allFiles.length) {
      setExpandedFiles(new Set());
      setDiffFile(null);
    } else {
      setExpandedFiles(new Set(allFiles));
    }
  }, [expandedFiles, allFiles]);

  const buildBitbucketUrl = (filePath: string) => {
    if (!reportContext) return undefined;
    return `https://bitbucket.org/${reportContext.workspace}/${reportContext.repo}/pull-requests/${reportContext.prId}/diff#chg-${filePath}`;
  };

  // Loading state
  if (loading || decoding) {
    return (
      <div className="flex flex-col min-h-screen" style={{ background: "var(--bg-base)" }}>
        <TopBar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center" style={{ color: "var(--text-secondary)" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                border: "2px solid var(--accent)",
                borderTopColor: "transparent",
                borderRadius: "50%",
                margin: "0 auto 16px",
                animation: "spin 1s linear infinite",
              }}
            />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <p>Analyzing pull request...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col min-h-screen" style={{ background: "var(--bg-base)" }}>
        <TopBar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p style={{ color: "var(--coral)", marginBottom: "16px" }}>{error}</p>
            <button
              onClick={() => router.push("/dashboard")}
              style={{ color: "var(--accent)", background: "none", border: "none", cursor: "pointer", fontSize: "13px" }}
            >
              Back to dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No report
  if (!report) {
    return (
      <div className="flex flex-col min-h-screen" style={{ background: "var(--bg-base)" }}>
        <TopBar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p style={{ color: "var(--text-secondary)", marginBottom: "16px" }}>No report loaded.</p>
            <button
              onClick={() => router.push("/dashboard")}
              style={{ color: "var(--accent)", background: "none", border: "none", cursor: "pointer", fontSize: "13px" }}
            >
              Back to dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Build annotation lookup
  const annotationMap = new Map(
    report.fileAnnotations.map((a) => [a.filePath, a])
  );

  const hasDiffPanel = diffFile !== null && reportContext !== null;

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "var(--bg-base)" }}>
      <TopBar
        workspace={reportContext?.workspace ?? selectedWorkspace ?? undefined}
        repo={reportContext?.repo ?? selectedRepo ?? undefined}
        prId={reportContext?.prId ?? selectedPR?.id}
        prTitle={selectedPR?.title}
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: hasDiffPanel
            ? "260px minmax(0, 1fr) minmax(300px, 1fr)"
            : "260px minmax(0, 1fr)",
          flex: 1,
          transition: "grid-template-columns var(--transition-normal)",
        }}
      >
        <Sidebar
          report={report}
          activeFile={activeFile}
          onFileClick={scrollToFile}
        />

        <main
          ref={mainRef}
          style={{
            padding: "32px 40px",
            overflowY: "auto",
            height: "calc(100vh - 49px)",
          }}
        >
          <OverviewCard
            overview={report.overview}
            author={selectedPR?.author.display_name}
            fileCount={report.fileAnnotations.length}
          />

          {/* Expand/Collapse all toggle */}
          <div className="flex justify-end" style={{ marginBottom: "8px" }}>
            <button
              onClick={toggleAll}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                color: "var(--accent)",
                background: "none",
                border: "none",
                cursor: "pointer",
                opacity: 0.8,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.8")}
            >
              {expandedFiles.size === allFiles.length
                ? "Collapse all"
                : "Expand all"}
            </button>
          </div>

          {report.reviewOrder.phases.map((phase, phaseIndex) => (
            <div key={phaseIndex}>
              <PhaseHeader number={phaseIndex + 1} label={phase.label} />

              {phase.files.map((filePath) => {
                const annotation = annotationMap.get(filePath);
                if (!annotation) return null;

                return (
                  <FileCard
                    key={filePath}
                    filePath={filePath}
                    annotation={annotation}
                    isExpanded={expandedFiles.has(filePath)}
                    isActive={activeFile === filePath}
                    onToggle={() => toggleExpand(filePath)}
                    bitbucketUrl={buildBitbucketUrl(filePath)}
                  />
                );
              })}
            </div>
          ))}

          {/* Review order reasoning */}
          <div
            style={{
              marginTop: "40px",
              paddingTop: "20px",
              borderTop: "1px solid var(--border-default)",
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
              Why This Order
            </div>
            <p
              style={{
                fontSize: "12px",
                color: "var(--text-secondary)",
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              {report.reviewOrder.reasoning}
            </p>
          </div>
        </main>

        {/* Diff Panel — third column */}
        {hasDiffPanel && (
          <div
            style={{
              borderLeft: "1px solid var(--border-default)",
              background: "var(--bg-surface)",
              height: "calc(100vh - 49px)",
              position: "sticky",
              top: "49px",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Close button */}
            <div
              style={{
                position: "absolute",
                top: "8px",
                right: "12px",
                zIndex: 10,
              }}
            >
              <button
                onClick={() => setDiffFile(null)}
                style={{
                  background: "var(--bg-muted)",
                  border: "none",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--text-tertiary)",
                  cursor: "pointer",
                  fontSize: "12px",
                  padding: "2px 8px",
                  transition: "color var(--transition-fast)",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.color = "var(--text-primary)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = "var(--text-tertiary)")
                }
              >
                ✕
              </button>
            </div>

            <DiffPanel
              filePath={diffFile}
              workspace={reportContext!.workspace}
              repo={reportContext!.repo}
              prId={reportContext!.prId}
            />
          </div>
        )}
      </div>
    </div>
  );
}
