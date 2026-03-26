"use client";

import { useDecodeStore } from "@/stores/decode-store";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function PRPicker() {
  const {
    workspaces,
    repositories,
    pullRequests,
    selectedWorkspace,
    selectedRepo,
    selectedPR,
    loadingWorkspaces,
    loadingRepos,
    loadingPRs,
    decoding,
    error,
    fetchWorkspaces,
    selectWorkspace,
    selectRepo,
    selectPR,
    decode,
    decodeFromUrl,
  } = useDecodeStore();

  const router = useRouter();
  const [prUrl, setPrUrl] = useState("");
  const [mode, setMode] = useState<"browse" | "url">("browse");
  const [repoFilter, setRepoFilter] = useState("");

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  const filteredRepos = repositories.filter((r) =>
    r.name.toLowerCase().includes(repoFilter.toLowerCase())
  );

  const handleDecode = async () => {
    if (mode === "url" && prUrl) {
      await decodeFromUrl(prUrl);
      router.push("/decode/report");
    } else if (selectedWorkspace && selectedRepo && selectedPR) {
      await decode(selectedWorkspace, selectedRepo, selectedPR.id);
      router.push("/decode/report");
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "10px 14px",
    background: "var(--bg-muted)",
    border: "1px solid var(--border-default)",
    borderRadius: "var(--radius-md)",
    color: "var(--text-primary)",
    fontSize: "13px",
    outline: "none",
  };

  const labelStyle = {
    display: "block" as const,
    fontSize: "10px",
    textTransform: "uppercase" as const,
    letterSpacing: "0.8px",
    color: "var(--text-tertiary)",
    marginBottom: "6px",
    fontWeight: 600,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div>
        <h2
          style={{
            fontSize: "18px",
            fontWeight: 600,
            color: "var(--text-primary)",
            marginBottom: "4px",
          }}
        >
          Select a Pull Request
        </h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "13px" }}>
          Browse your workspaces or paste a PR URL.
        </p>
      </div>

      {/* Mode Toggle */}
      <div className="flex" style={{ gap: "8px" }}>
        {(["browse", "url"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            style={{
              padding: "6px 14px",
              fontSize: "12px",
              borderRadius: "var(--radius-md)",
              border: "none",
              cursor: "pointer",
              transition: "all var(--transition-fast)",
              background: mode === m ? "var(--accent)" : "var(--bg-surface)",
              color: mode === m ? "#fff" : "var(--text-secondary)",
            }}
          >
            {m === "browse" ? "Browse" : "Paste URL"}
          </button>
        ))}
      </div>

      {mode === "url" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <input
            type="url"
            placeholder="https://bitbucket.org/workspace/repo/pull-requests/42"
            value={prUrl}
            onChange={(e) => setPrUrl(e.target.value)}
            style={{
              ...inputStyle,
              fontFamily: "var(--font-mono)",
              fontSize: "12px",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-default)")}
          />
          <button
            onClick={handleDecode}
            disabled={!prUrl || decoding}
            style={{
              padding: "12px 24px",
              background: "var(--accent)",
              color: "#fff",
              fontWeight: 500,
              fontSize: "13px",
              borderRadius: "var(--radius-md)",
              border: "none",
              cursor: !prUrl || decoding ? "not-allowed" : "pointer",
              opacity: !prUrl || decoding ? 0.5 : 1,
              alignSelf: "flex-start",
            }}
          >
            {decoding ? "Decoding..." : "Decode this PR"}
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Workspace */}
          <div>
            <label style={labelStyle}>Workspace</label>
            {loadingWorkspaces ? (
              <div className="skeleton-line" style={{ width: "200px" }} />
            ) : (
              <select
                value={selectedWorkspace || ""}
                onChange={(e) => selectWorkspace(e.target.value)}
                style={{
                  ...inputStyle,
                  cursor: "pointer",
                }}
              >
                <option value="">Select a workspace</option>
                {workspaces.map((ws) => (
                  <option key={ws.uuid} value={ws.slug}>
                    {ws.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Repository */}
          {selectedWorkspace && (
            <div>
              <label style={labelStyle}>Repository</label>
              {loadingRepos ? (
                <div className="skeleton-line" style={{ width: "200px" }} />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <input
                    type="text"
                    placeholder="Filter repositories..."
                    value={repoFilter}
                    onChange={(e) => setRepoFilter(e.target.value)}
                    style={{ ...inputStyle, fontSize: "12px" }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-default)")}
                  />
                  <div
                    style={{
                      maxHeight: "200px",
                      overflowY: "auto",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--border-default)",
                    }}
                  >
                    {filteredRepos.length === 0 ? (
                      <p
                        style={{
                          fontSize: "12px",
                          color: "var(--text-tertiary)",
                          padding: "12px",
                        }}
                      >
                        No repositories found
                      </p>
                    ) : (
                      filteredRepos.map((repo) => (
                        <button
                          key={repo.uuid}
                          onClick={() => selectRepo(repo.slug)}
                          className="w-full text-left"
                          style={{
                            padding: "10px 14px",
                            fontSize: "12px",
                            borderBottom: "1px solid var(--border-default)",
                            transition: "background var(--transition-fast)",
                            background:
                              selectedRepo === repo.slug
                                ? "var(--accent-dim)"
                                : "transparent",
                            color:
                              selectedRepo === repo.slug
                                ? "var(--accent)"
                                : "var(--text-primary)",
                            border: "none",
                            cursor: "pointer",
                            display: "block",
                            width: "100%",
                          }}
                          onMouseEnter={(e) => {
                            if (selectedRepo !== repo.slug)
                              e.currentTarget.style.background = "var(--bg-elevated)";
                          }}
                          onMouseLeave={(e) => {
                            if (selectedRepo !== repo.slug)
                              e.currentTarget.style.background = "transparent";
                          }}
                        >
                          <span style={{ fontFamily: "var(--font-mono)" }}>
                            {repo.slug}
                          </span>
                          {repo.description && (
                            <span
                              style={{
                                display: "block",
                                fontSize: "11px",
                                color: "var(--text-tertiary)",
                                marginTop: "2px",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {repo.description}
                            </span>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Pull Requests */}
          {selectedRepo && (
            <div>
              <label style={labelStyle}>Open Pull Requests</label>
              {loadingPRs ? (
                <div className="skeleton-line" style={{ width: "200px" }} />
              ) : pullRequests.length === 0 ? (
                <p style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>
                  No open pull requests.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {pullRequests.map((pr) => (
                    <button
                      key={pr.id}
                      onClick={() => selectPR(pr)}
                      className="w-full text-left"
                      style={{
                        padding: "12px 14px",
                        borderRadius: "var(--radius-lg)",
                        border: `1px solid ${
                          selectedPR?.id === pr.id
                            ? "var(--accent)"
                            : "var(--border-default)"
                        }`,
                        background:
                          selectedPR?.id === pr.id
                            ? "var(--accent-dim)"
                            : "transparent",
                        cursor: "pointer",
                        transition: "all var(--transition-fast)",
                      }}
                      onMouseEnter={(e) => {
                        if (selectedPR?.id !== pr.id)
                          e.currentTarget.style.borderColor = "var(--border-hover)";
                      }}
                      onMouseLeave={(e) => {
                        if (selectedPR?.id !== pr.id)
                          e.currentTarget.style.borderColor = "var(--border-default)";
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          style={{
                            color: "var(--text-tertiary)",
                            fontSize: "12px",
                            fontFamily: "var(--font-mono)",
                          }}
                        >
                          #{pr.id}
                        </span>
                        <span
                          style={{
                            fontSize: "13px",
                            fontWeight: 500,
                            color: "var(--text-primary)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {pr.title}
                        </span>
                      </div>
                      <div
                        className="flex items-center"
                        style={{
                          gap: "12px",
                          marginTop: "4px",
                          fontSize: "11px",
                          color: "var(--text-tertiary)",
                        }}
                      >
                        <span>{pr.author.display_name}</span>
                        <span style={{ fontFamily: "var(--font-mono)" }}>
                          {pr.source.branch.name} → {pr.destination.branch.name}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Decode button */}
          {selectedPR && (
            <button
              onClick={handleDecode}
              disabled={decoding}
              style={{
                padding: "12px 24px",
                background: "var(--accent)",
                color: "#fff",
                fontWeight: 500,
                fontSize: "13px",
                borderRadius: "var(--radius-md)",
                border: "none",
                cursor: decoding ? "not-allowed" : "pointer",
                opacity: decoding ? 0.5 : 1,
                alignSelf: "flex-start",
              }}
            >
              {decoding ? "Decoding..." : `Decode PR #${selectedPR.id}`}
            </button>
          )}
        </div>
      )}

      {error && (
        <div
          style={{
            padding: "10px 14px",
            background: "var(--coral-bg)",
            border: "1px solid rgba(240, 123, 110, 0.2)",
            borderRadius: "var(--radius-md)",
            color: "var(--coral)",
            fontSize: "12px",
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
