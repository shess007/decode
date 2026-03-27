"use client";

import { TopBar } from "@/components/report/topbar";
import { useAuthStore } from "@/stores/auth-store";
import { useDecodeStore, type PreflightResult } from "@/stores/decode-store";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";

interface ReviewPR {
  id: number;
  title: string;
  author: {
    display_name: string;
    links?: { avatar?: { href: string } };
  };
  source: { branch: { name: string }; repository: { full_name: string } };
  destination: { branch: { name: string } };
  created_on: string;
  updated_on: string;
  comment_count: number;
  links: { html: { href: string } };
}

interface RecentReport {
  key: string;
  workspace: string;
  repo: string;
  prId: number;
  goal: string;
}

export default function DashboardPage() {
  const { user, loading, fetchSession } = useAuthStore();
  const { decode, decodeFromUrl, runPreflight, runPreflightFromUrl, clearPreflight, preflight, preflighting } = useDecodeStore();
  const router = useRouter();

  const [reviews, setReviews] = useState<ReviewPR[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [recentReports, setRecentReports] = useState<RecentReport[]>([]);
  const [prUrl, setPrUrl] = useState("");
  const [decoding, setDecoding] = useState<number | null>(null);
  const [decodingUrl, setDecodingUrl] = useState(false);

  // Pending decode info (for preflight confirmation)
  const [pendingDecode, setPendingDecode] = useState<{
    type: "pr" | "url";
    workspace?: string;
    repo?: string;
    prId?: number;
    url?: string;
    model: string;
  } | null>(null);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [loading, user, router]);

  // Fetch review queue
  useEffect(() => {
    if (!user) return;
    setLoadingReviews(true);
    fetch("/api/reviews")
      .then((res) => res.json())
      .then((data) => {
        setReviews(data.values || []);
      })
      .catch(() => {})
      .finally(() => setLoadingReviews(false));
  }, [user]);

  // Fetch recent decodes
  useEffect(() => {
    if (!user) return;
    fetch("/api/decode/recent")
      .then((res) => res.json())
      .then((data) => {
        setRecentReports(data.reports || []);
      })
      .catch(() => {});
  }, [user]);

  const handleDecodePR = useCallback(
    async (pr: ReviewPR, model: string) => {
      const fullName = pr.source.repository.full_name;
      const [workspace, repo] = fullName.split("/");

      // Run preflight
      const result = await runPreflight(workspace, repo, pr.id);
      if (!result) return;

      if (result.cached || !result.warning) {
        setDecoding(pr.id);
        await decode(workspace, repo, pr.id, model);
        router.push("/decode/report");
      } else {
        // Show warning, store pending decode
        setPendingDecode({ type: "pr", workspace, repo, prId: pr.id, model });
      }
    },
    [decode, runPreflight, router]
  );

  const handleDecodeUrl = useCallback(async (model: string) => {
    if (!prUrl.trim()) return;

    const result = await runPreflightFromUrl(prUrl.trim());
    if (!result) return;

    if (result.cached || !result.warning) {
      setDecodingUrl(true);
      await decodeFromUrl(prUrl.trim(), model);
      router.push("/decode/report");
    } else {
      setPendingDecode({ type: "url", url: prUrl.trim(), model });
    }
  }, [prUrl, decodeFromUrl, runPreflightFromUrl, router]);

  const handleConfirmPending = useCallback(async () => {
    if (!pendingDecode) return;
    clearPreflight();
    if (pendingDecode.type === "pr" && pendingDecode.workspace && pendingDecode.repo && pendingDecode.prId) {
      setDecoding(pendingDecode.prId);
      await decode(pendingDecode.workspace, pendingDecode.repo, pendingDecode.prId, pendingDecode.model);
    } else if (pendingDecode.type === "url" && pendingDecode.url) {
      setDecodingUrl(true);
      await decodeFromUrl(pendingDecode.url, pendingDecode.model);
    }
    setPendingDecode(null);
    router.push("/decode/report");
  }, [pendingDecode, decode, decodeFromUrl, clearPreflight, router]);

  const handleCancelPending = useCallback(() => {
    clearPreflight();
    setPendingDecode(null);
  }, [clearPreflight]);

  const handleOpenRecent = useCallback(
    async (report: RecentReport) => {
      await decode(report.workspace, report.repo, report.prId, "gemini");
      router.push("/decode/report");
    },
    [decode, router]
  );

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return "just now";
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "1 day ago";
    return `${days} days ago`;
  };

  if (loading) {
    return (
      <div
        className="flex items-center justify-center min-h-screen"
        style={{ background: "var(--bg-base)" }}
      >
        <p
          style={{
            color: "var(--text-tertiary)",
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        >
          Loading...
        </p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div
      className="flex flex-col min-h-screen"
      style={{ background: "var(--bg-base)" }}
    >
      <TopBar />
      <main
        className="flex-1"
        style={{ padding: "40px 20px", maxWidth: "900px", margin: "0 auto", width: "100%" }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 340px",
            gap: "40px",
            alignItems: "start",
          }}
        >
          {/* Left: Review Queue */}
          <div>
            <SectionLabel>Your Reviews</SectionLabel>

            {loadingReviews ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="skeleton-line"
                    style={{ height: "72px", borderRadius: "var(--radius-lg)" }}
                  />
                ))}
              </div>
            ) : reviews.length === 0 ? (
              <p style={{ fontSize: "13px", color: "var(--text-tertiary)" }}>
                No open PRs assigned to you for review.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {reviews.map((pr) => {
                  const fullName = pr.source.repository.full_name;
                  return (
                    <div
                      key={`${fullName}-${pr.id}`}
                      className="flex items-start justify-between"
                      style={{
                        padding: "14px 16px",
                        background: "var(--bg-surface)",
                        border: "1px solid var(--border-default)",
                        borderRadius: "var(--radius-lg)",
                        transition: "border-color var(--transition-fast)",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.borderColor = "var(--border-hover)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.borderColor = "var(--border-default)")
                      }
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="flex items-center" style={{ gap: "8px", marginBottom: "4px" }}>
                          <span
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontSize: "11px",
                              color: "var(--text-tertiary)",
                            }}
                          >
                            {fullName} #{pr.id}
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: "13.5px",
                            fontWeight: 500,
                            color: "var(--text-primary)",
                            marginBottom: "6px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {pr.title}
                        </div>
                        <div
                          className="flex items-center"
                          style={{ gap: "10px", fontSize: "11px", color: "var(--text-tertiary)" }}
                        >
                          <span className="flex items-center" style={{ gap: "4px" }}>
                            {pr.author.links?.avatar?.href && (
                              <img
                                src={pr.author.links.avatar.href}
                                alt=""
                                style={{ width: "14px", height: "14px", borderRadius: "50%" }}
                              />
                            )}
                            {pr.author.display_name}
                          </span>
                          <span>{timeAgo(pr.updated_on)}</span>
                          <span
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontSize: "10px",
                            }}
                          >
                            {pr.source.branch.name} → {pr.destination.branch.name}
                          </span>
                        </div>
                      </div>
                      <div className="flex" style={{ gap: "4px", flexShrink: 0, marginLeft: "12px", alignSelf: "center" }}>
                        <button
                          onClick={() => handleDecodePR(pr, "gemini")}
                          disabled={decoding === pr.id || preflighting}
                          style={{
                            padding: "7px 12px",
                            background: "var(--accent)",
                            color: "#fff",
                            fontWeight: 500,
                            fontSize: "11px",
                            borderRadius: "var(--radius-sm)",
                            border: "none",
                            cursor: decoding === pr.id || preflighting ? "not-allowed" : "pointer",
                            opacity: decoding === pr.id || preflighting ? 0.5 : 1,
                          }}
                        >
                          {decoding === pr.id ? "..." : preflighting ? "..." : "Gemini"}
                        </button>
                        <button
                          onClick={() => handleDecodePR(pr, "sonnet")}
                          disabled={decoding === pr.id || preflighting}
                          style={{
                            padding: "7px 12px",
                            background: "transparent",
                            color: "var(--text-secondary)",
                            fontWeight: 500,
                            fontSize: "11px",
                            borderRadius: "var(--radius-sm)",
                            border: "1px solid var(--border-default)",
                            cursor: decoding === pr.id || preflighting ? "not-allowed" : "pointer",
                            opacity: decoding === pr.id || preflighting ? 0.5 : 1,
                          }}
                        >
                          Sonnet
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: URL paste + Recent */}
          <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
            {/* URL Paste */}
            <div>
              <SectionLabel>Decode a PR</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <input
                  type="url"
                  placeholder="Paste a Bitbucket PR URL..."
                  value={prUrl}
                  onChange={(e) => setPrUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleDecodeUrl("gemini");
                  }}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    background: "var(--bg-muted)",
                    border: "1px solid var(--border-default)",
                    borderRadius: "var(--radius-md)",
                    color: "var(--text-primary)",
                    fontSize: "12px",
                    fontFamily: "var(--font-mono)",
                    outline: "none",
                  }}
                  onFocus={(e) =>
                    (e.currentTarget.style.borderColor = "var(--accent)")
                  }
                  onBlur={(e) =>
                    (e.currentTarget.style.borderColor = "var(--border-default)")
                  }
                />
                <div className="flex" style={{ gap: "6px" }}>
                  <button
                    onClick={() => handleDecodeUrl("gemini")}
                    disabled={!prUrl.trim() || decodingUrl || preflighting}
                    style={{
                      padding: "10px 16px",
                      background: "var(--accent)",
                      color: "#fff",
                      fontWeight: 500,
                      fontSize: "12px",
                      borderRadius: "var(--radius-md)",
                      border: "none",
                      cursor: !prUrl.trim() || decodingUrl || preflighting ? "not-allowed" : "pointer",
                      opacity: !prUrl.trim() || decodingUrl || preflighting ? 0.5 : 1,
                      flex: 1,
                    }}
                  >
                    {preflighting ? "Checking..." : decodingUrl ? "Decoding..." : "Gemini"}
                  </button>
                  <button
                    onClick={() => handleDecodeUrl("sonnet")}
                    disabled={!prUrl.trim() || decodingUrl || preflighting}
                    style={{
                      padding: "10px 16px",
                      background: "transparent",
                      color: "var(--text-secondary)",
                      fontWeight: 500,
                      fontSize: "12px",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--border-default)",
                      cursor: !prUrl.trim() || decodingUrl || preflighting ? "not-allowed" : "pointer",
                      opacity: !prUrl.trim() || decodingUrl || preflighting ? 0.5 : 1,
                      flex: 1,
                    }}
                  >
                    Sonnet
                  </button>
                </div>
              </div>
            </div>

            {/* Browse repos link */}
            <div>
              <button
                onClick={() => router.push("/dashboard/browse")}
                style={{
                  fontSize: "12px",
                  color: "var(--accent)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  opacity: 0.8,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.8")}
              >
                Browse workspaces & repos →
              </button>
            </div>

            {/* Recent Decodes */}
            {recentReports.length > 0 && (
              <div>
                <SectionLabel>Recently Decoded</SectionLabel>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  {recentReports.map((report) => (
                    <button
                      key={report.key}
                      onClick={() => handleOpenRecent(report)}
                      className="flex items-center w-full text-left"
                      style={{
                        padding: "8px 10px",
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
                          fontFamily: "var(--font-mono)",
                          fontSize: "11px",
                          color: "var(--text-tertiary)",
                          flexShrink: 0,
                        }}
                      >
                        {report.repo} #{report.prId}
                      </span>
                      <span
                        style={{
                          fontSize: "12px",
                          color: "var(--text-secondary)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          flex: 1,
                          minWidth: 0,
                        }}
                      >
                        {report.goal
                          ? report.goal.split(".")[0]
                          : ""}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Preflight warning */}
        {preflight && !preflight.cached && preflight.warning && pendingDecode && (
          <div
            style={{
              marginTop: "24px",
              background: "var(--bg-surface)",
              border: `1px solid ${preflight.warning === "large" ? "var(--coral)" : "var(--orange)"}`,
              borderRadius: "var(--radius-xl)",
              padding: "20px",
            }}
          >
            <div
              style={{
                fontSize: "13px",
                fontWeight: 600,
                color: preflight.warning === "large" ? "var(--coral)" : "var(--orange)",
                marginBottom: "10px",
              }}
            >
              {preflight.warning === "large" ? "Very large PR" : "Large PR"} — est. ~${preflight.estimatedCost?.toFixed(3)} AI cost
            </div>
            <div
              className="flex"
              style={{ gap: "16px", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "14px" }}
            >
              <span>{preflight.files?.included} of {preflight.files?.total} files</span>
              <span>{preflight.diff?.filteredLines.toLocaleString()} diff lines</span>
              <span>~{Math.round((preflight.estimatedInputTokens || 0) / 1000)}k tokens</span>
            </div>
            <div className="flex" style={{ gap: "8px" }}>
              <button
                onClick={handleConfirmPending}
                disabled={decoding !== null || decodingUrl}
                style={{
                  padding: "10px 20px",
                  background: "var(--accent)",
                  color: "#fff",
                  fontWeight: 500,
                  fontSize: "12px",
                  borderRadius: "var(--radius-md)",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Proceed with {pendingDecode.model === "sonnet" ? "Sonnet" : "Gemini"}
              </button>
              <button
                onClick={handleCancelPending}
                style={{
                  padding: "10px 20px",
                  background: "transparent",
                  color: "var(--text-secondary)",
                  fontWeight: 500,
                  fontSize: "12px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-default)",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: "10px",
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "1.2px",
        color: "var(--text-tertiary)",
        marginBottom: "12px",
      }}
    >
      {children}
    </div>
  );
}
