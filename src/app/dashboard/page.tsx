"use client";

import { TopBar } from "@/components/report/topbar";
import { useAuthStore } from "@/stores/auth-store";
import { useDecodeStore } from "@/stores/decode-store";
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
  const { decode, decodeFromUrl } = useDecodeStore();
  const router = useRouter();

  const [reviews, setReviews] = useState<ReviewPR[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [recentReports, setRecentReports] = useState<RecentReport[]>([]);
  const [prUrl, setPrUrl] = useState("");
  const [decoding, setDecoding] = useState<number | null>(null);
  const [decodingUrl, setDecodingUrl] = useState(false);

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
    async (pr: ReviewPR) => {
      const fullName = pr.source.repository.full_name;
      const [workspace, repo] = fullName.split("/");
      setDecoding(pr.id);
      await decode(workspace, repo, pr.id, "gemini");
      router.push("/decode/report");
    },
    [decode, router]
  );

  const handleDecodeUrl = useCallback(async () => {
    if (!prUrl.trim()) return;
    setDecodingUrl(true);
    await decodeFromUrl(prUrl.trim(), "gemini");
    router.push("/decode/report");
  }, [prUrl, decodeFromUrl, router]);

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
                      <button
                        onClick={() => handleDecodePR(pr)}
                        disabled={decoding === pr.id}
                        style={{
                          padding: "8px 16px",
                          background: "var(--accent)",
                          color: "#fff",
                          fontWeight: 500,
                          fontSize: "12px",
                          borderRadius: "var(--radius-md)",
                          border: "none",
                          cursor: decoding === pr.id ? "not-allowed" : "pointer",
                          opacity: decoding === pr.id ? 0.5 : 1,
                          flexShrink: 0,
                          marginLeft: "12px",
                          alignSelf: "center",
                        }}
                      >
                        {decoding === pr.id ? "..." : "Decode"}
                      </button>
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
                    if (e.key === "Enter") handleDecodeUrl();
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
                <button
                  onClick={handleDecodeUrl}
                  disabled={!prUrl.trim() || decodingUrl}
                  style={{
                    padding: "10px",
                    background: "var(--accent)",
                    color: "#fff",
                    fontWeight: 500,
                    fontSize: "12px",
                    borderRadius: "var(--radius-md)",
                    border: "none",
                    cursor: !prUrl.trim() || decodingUrl ? "not-allowed" : "pointer",
                    opacity: !prUrl.trim() || decodingUrl ? 0.5 : 1,
                  }}
                >
                  {decodingUrl ? "Decoding..." : "Decode"}
                </button>
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
