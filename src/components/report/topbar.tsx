"use client";

import { useAuthStore } from "@/stores/auth-store";

interface TopBarProps {
  workspace?: string;
  repo?: string;
  prId?: number;
  prTitle?: string;
}

export function TopBar({ workspace, repo, prId, prTitle }: TopBarProps) {
  const { user, logout } = useAuthStore();

  return (
    <header
      className="flex items-center justify-between"
      style={{
        padding: "12px 20px",
        background: "var(--bg-surface)",
        borderBottom: "1px solid var(--border-default)",
        fontSize: "12px",
        color: "var(--text-secondary)",
      }}
    >
      <div className="flex items-center gap-2">
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "14px",
            color: "var(--accent)",
            letterSpacing: "-0.5px",
            opacity: 0.9,
          }}
        >
          {"{decode}"}
        </span>

        {workspace && repo && (
          <>
            <span style={{ color: "var(--text-tertiary)" }}>·</span>
            <span>
              {workspace}/{repo}
            </span>
          </>
        )}

        {prId && prTitle && (
          <>
            <span style={{ color: "var(--text-tertiary)" }}>·</span>
            <span>
              PR #{prId}:{" "}
              <span
                style={{
                  color: "var(--text-primary)",
                  fontWeight: 500,
                }}
              >
                &ldquo;{prTitle}&rdquo;
              </span>
            </span>
          </>
        )}
      </div>

      {user && (
        <div className="flex items-center gap-3">
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
