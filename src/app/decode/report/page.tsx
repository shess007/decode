"use client";

import { useDecodeStore } from "@/stores/decode-store";
import { useAuthStore } from "@/stores/auth-store";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
import { TopBar } from "@/components/report/topbar";
import { Sidebar } from "@/components/report/sidebar";
import { DiffPanel } from "@/components/report/diff-panel";
import { ContextPanel } from "@/components/report/context-panel";

export default function ReportPage() {
  const {
    report,
    reportContext,
    selectedPR,
    selectedWorkspace,
    selectedRepo,
    decoding,
    waitingForLocal,
    error,
  } = useDecodeStore();
  const { user, loading, fetchSession } = useAuthStore();
  const router = useRouter();

  // Active file = the file shown in diff + context panel
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [prMeta, setPrMeta] = useState<{
    title: string;
    author: string;
    authorAvatar: string;
    sourceBranch: string;
    destinationBranch: string;
    createdOn: string;
  } | null>(null);
  const mainRef = useRef<HTMLElement>(null);

  // Ordered list of all file paths in review order
  const allFiles = report?.reviewOrder.phases.flatMap((p) => p.files) ?? [];
  const activeIndex = activeFile ? allFiles.indexOf(activeFile) : -1;

  // Auto-select first file when report loads
  useEffect(() => {
    if (report && allFiles.length > 0 && !activeFile) {
      setActiveFile(allFiles[0]);
    }
  }, [report, allFiles, activeFile]);

  // Fetch PR metadata if not available from store
  useEffect(() => {
    if (selectedPR || !reportContext) return;
    if (prMeta) return;

    fetch(
      `/api/bitbucket?path=/repositories/${reportContext.workspace}/${reportContext.repo}/pullrequests/${reportContext.prId}`
    )
      .then((res) => res.json())
      .then((pr) => {
        if (pr.title) {
          setPrMeta({
            title: pr.title,
            author: pr.author?.display_name || "",
            authorAvatar: pr.author?.links?.avatar?.href || "",
            sourceBranch: pr.source?.branch?.name || "",
            destinationBranch: pr.destination?.branch?.name || "",
            createdOn: pr.created_on || "",
          });
        }
      })
      .catch(() => {});
  }, [selectedPR, reportContext, prMeta]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [loading, user, router]);

  const navigateToFile = useCallback(
    (filePath: string) => {
      setActiveFile(filePath);
    },
    []
  );

  const goToPrev = useCallback(() => {
    if (activeIndex > 0) {
      setActiveFile(allFiles[activeIndex - 1]);
    }
  }, [activeIndex, allFiles]);

  const goToNext = useCallback(() => {
    if (activeIndex < allFiles.length - 1) {
      setActiveFile(allFiles[activeIndex + 1]);
    }
  }, [activeIndex, allFiles]);

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
          goToNext();
          break;
        }
        case "k": {
          e.preventDefault();
          goToPrev();
          break;
        }
        default: {
          // 1–9 jump to phase
          const num = parseInt(e.key, 10);
          if (num >= 1 && num <= report.reviewOrder.phases.length) {
            e.preventDefault();
            const phase = report.reviewOrder.phases[num - 1];
            if (phase.files.length > 0) {
              setActiveFile(phase.files[0]);
            }
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [report, goToNext, goToPrev]);

  // Loading state
  if (loading || decoding || waitingForLocal) {
    return (
      <div
        className="flex flex-col min-h-screen"
        style={{ background: "var(--bg-base)" }}
      >
        <TopBar />
        <div className="flex-1 flex items-center justify-center">
          <div
            className="text-center"
            style={{ color: "var(--text-secondary)", maxWidth: "320px" }}
          >
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
            {waitingForLocal ? (
              <>
                <p style={{ marginBottom: "8px" }}>
                  PR data prepared. Waiting for local processing...
                </p>
                <p
                  style={{
                    fontSize: "12px",
                    color: "var(--text-tertiary)",
                    lineHeight: 1.5,
                  }}
                >
                  Ask Claude Code:{" "}
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      color: "var(--accent)",
                    }}
                  >
                    &quot;process pending decodes&quot;
                  </span>
                </p>
              </>
            ) : (
              <p>Analyzing pull request...</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        className="flex flex-col min-h-screen"
        style={{ background: "var(--bg-base)" }}
      >
        <TopBar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p style={{ color: "var(--coral)", marginBottom: "16px" }}>
              {error}
            </p>
            <button
              onClick={() => router.push("/dashboard")}
              style={{
                color: "var(--accent)",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "13px",
              }}
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
      <div
        className="flex flex-col min-h-screen"
        style={{ background: "var(--bg-base)" }}
      >
        <TopBar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p style={{ color: "var(--text-secondary)", marginBottom: "16px" }}>
              No report loaded.
            </p>
            <button
              onClick={() => router.push("/dashboard")}
              style={{
                color: "var(--accent)",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "13px",
              }}
            >
              Back to dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col"
      style={{ background: "var(--bg-base)", height: "100vh" }}
    >
      <TopBar
        workspace={reportContext?.workspace ?? selectedWorkspace ?? undefined}
        repo={reportContext?.repo ?? selectedRepo ?? undefined}
        prId={reportContext?.prId ?? selectedPR?.id}
        prTitle={selectedPR?.title ?? prMeta?.title}
        prAuthor={selectedPR?.author.display_name ?? prMeta?.author}
        prAuthorAvatar={selectedPR?.author.links?.avatar?.href ?? prMeta?.authorAvatar}
        sourceBranch={selectedPR?.source.branch.name ?? prMeta?.sourceBranch}
        destinationBranch={selectedPR?.destination.branch.name ?? prMeta?.destinationBranch}
        createdOn={selectedPR?.created_on ?? prMeta?.createdOn}
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "280px 1fr 360px",
          flex: 1,
          overflow: "hidden",
        }}
      >
        {/* Column 1: Review order sidebar */}
        <Sidebar
          report={report}
          activeFile={activeFile}
          onFileClick={navigateToFile}
        />

        {/* Column 2: Diff viewer (hero) */}
        <div
          ref={mainRef as React.RefObject<HTMLDivElement>}
          style={{
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            borderRight: "1px solid var(--border-default)",
          }}
        >
          {reportContext ? (
            <DiffPanel
              filePath={activeFile}
              workspace={reportContext.workspace}
              repo={reportContext.repo}
              prId={reportContext.prId}
              annotation={activeFile ? report.fileAnnotations.find(a => a.filePath === activeFile) : null}
              onPrev={goToPrev}
              onNext={goToNext}
              currentIndex={activeIndex}
              totalFiles={allFiles.length}
            />
          ) : (
            <div
              className="flex items-center justify-center flex-1"
              style={{ color: "var(--text-tertiary)", fontSize: "12px" }}
            >
              No PR context available for diff loading
            </div>
          )}
        </div>

        {/* Column 3: Context panel */}
        <ContextPanel
          report={report}
          activeFile={activeFile}
          onFileClick={navigateToFile}
        />
      </div>
    </div>
  );
}
