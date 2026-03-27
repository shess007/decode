"use client";

import { useAuthStore } from "@/stores/auth-store";

interface TopBarProps {
  workspace?: string;
  repo?: string;
  prId?: number;
  prTitle?: string;
  prAuthor?: string;
  prAuthorAvatar?: string;
  sourceBranch?: string;
  destinationBranch?: string;
  createdOn?: string;
}

export function TopBar({
  workspace,
  repo,
  prId,
  prTitle,
  prAuthor,
  prAuthorAvatar,
  sourceBranch,
  destinationBranch,
  createdOn,
}: TopBarProps) {
  const { user, logout } = useAuthStore();

  const formattedDate = createdOn
    ? new Date(createdOn).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <header
      className="flex items-center justify-between"
      style={{
        padding: "14px 20px",
        background: "var(--bg-surface)",
        borderBottom: "1px solid var(--border-card)",
        fontSize: "12px",
        color: "var(--text-secondary)",
        flexShrink: 0,
      }}
    >
      <div className="flex items-center" style={{ gap: "10px", minWidth: 0, flex: 1 }}>
        {/* Logo — sans-serif, weighted */}
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "15px",
            fontWeight: 700,
            color: "var(--accent)",
            flexShrink: 0,
          }}
        >
          {"{decode}"}
        </span>

        {workspace && repo && (
          <>
            <span style={{ color: "var(--text-tertiary)", fontSize: "14px" }}>/</span>
            <span style={{ fontWeight: 500, color: "var(--text-secondary)" }}>
              {workspace}/{repo}
            </span>
          </>
        )}

        {prId && prTitle && (
          <>
            <span style={{ color: "var(--text-tertiary)", fontSize: "14px" }}>/</span>
            <span
              style={{
                color: "var(--text-primary)",
                fontWeight: 500,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                minWidth: 0,
              }}
            >
              #{prId} {prTitle}
            </span>
            {/* Open status badge */}
            <span
              style={{
                background: "var(--green-bg)",
                color: "var(--green)",
                fontSize: "10px",
                fontWeight: 600,
                padding: "2px 10px",
                borderRadius: "999px",
                border: "1px solid var(--green-border)",
                flexShrink: 0,
              }}
            >
              Open
            </span>
          </>
        )}

        {/* Branch + meta */}
        {sourceBranch && destinationBranch && (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              color: "var(--text-tertiary)",
              flexShrink: 0,
              background: "var(--bg-muted)",
              padding: "2px 8px",
              borderRadius: "var(--radius-sm)",
            }}
          >
            {sourceBranch} → {destinationBranch}
          </span>
        )}

        {prAuthor && (
          <span
            className="flex items-center"
            style={{ gap: "5px", flexShrink: 0, color: "var(--text-tertiary)", fontSize: "11px" }}
          >
            {prAuthorAvatar && (
              <img
                src={prAuthorAvatar}
                alt={prAuthor}
                style={{
                  width: "18px",
                  height: "18px",
                  borderRadius: "50%",
                }}
              />
            )}
            {prAuthor}
          </span>
        )}

        {formattedDate && (
          <span style={{ color: "var(--text-tertiary)", fontSize: "11px", flexShrink: 0 }}>
            {formattedDate}
          </span>
        )}
      </div>

      {user && (
        <div className="flex items-center gap-3" style={{ flexShrink: 0, marginLeft: "16px" }}>
          <div className="flex items-center gap-2">
            {user.avatarUrl && (
              <img
                src={user.avatarUrl}
                alt={user.displayName}
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  background: "var(--bg-muted)",
                }}
              />
            )}
            <span style={{ fontSize: "12px" }}>{user.displayName}</span>
          </div>
          <button
            onClick={logout}
            style={{
              fontSize: "11px",
              color: "var(--text-tertiary)",
              cursor: "pointer",
              background: "none",
              border: "none",
              transition: "color var(--transition-fast)",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = "var(--text-secondary)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = "var(--text-tertiary)")
            }
          >
            Sign out
          </button>
        </div>
      )}
    </header>
  );
}
