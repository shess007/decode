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
        year: "numeric",
      })
    : null;

  return (
    <header
      className="flex items-center justify-between"
      style={{
        padding: "10px 20px",
        background: "var(--bg-surface)",
        borderBottom: "1px solid var(--border-default)",
        fontSize: "12px",
        color: "var(--text-secondary)",
        flexShrink: 0,
      }}
    >
      <div className="flex items-center" style={{ gap: "8px", minWidth: 0, flex: 1 }}>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "14px",
            color: "var(--accent)",
            letterSpacing: "-0.5px",
            opacity: 0.9,
            flexShrink: 0,
          }}
        >
          {"{decode}"}
        </span>

        {workspace && repo && (
          <>
            <span style={{ color: "var(--text-tertiary)" }}>·</span>
            <span style={{ flexShrink: 0 }}>
              {workspace}/{repo}
            </span>
          </>
        )}

        {prId && prTitle && (
          <>
            <span style={{ color: "var(--text-tertiary)" }}>·</span>
            <span
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                minWidth: 0,
              }}
            >
              #{prId}{" "}
              <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                {prTitle}
              </span>
            </span>
          </>
        )}

        {/* PR meta */}
        {(prAuthor || sourceBranch || formattedDate) && (
          <>
            <span style={{ color: "var(--text-tertiary)" }}>·</span>
            <div
              className="flex items-center"
              style={{ gap: "8px", flexShrink: 0, fontSize: "11px", color: "var(--text-tertiary)" }}
            >
              {prAuthor && (
                <span className="flex items-center" style={{ gap: "4px" }}>
                  {prAuthorAvatar && (
                    <img
                      src={prAuthorAvatar}
                      alt={prAuthor}
                      style={{
                        width: "16px",
                        height: "16px",
                        borderRadius: "50%",
                      }}
                    />
                  )}
                  {prAuthor}
                </span>
              )}
              {sourceBranch && destinationBranch && (
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px" }}>
                  {sourceBranch} → {destinationBranch}
                </span>
              )}
              {formattedDate && <span>{formattedDate}</span>}
            </div>
          </>
        )}
      </div>

      {user && (
        <div className="flex items-center gap-3" style={{ flexShrink: 0, marginLeft: "12px" }}>
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
            <span>{user.displayName}</span>
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
