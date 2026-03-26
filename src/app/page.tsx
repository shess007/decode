"use client";

import { useAuthStore } from "@/stores/auth-store";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function LandingPage() {
  const { user, loading, loginError, fetchSession, login } = useAuthStore();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard");
    }
  }, [loading, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const ok = await login(email, apiToken);
    setSubmitting(false);
    if (ok) {
      router.push("/dashboard");
    }
  };

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen px-4"
      style={{ background: "var(--bg-base)" }}
    >
      <div className="w-full max-w-sm" style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
        {/* Logo */}
        <div className="text-center" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <h1
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "32px",
              fontWeight: 600,
              color: "var(--accent)",
              letterSpacing: "-0.5px",
            }}
          >
            {"{decode}"}
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
            Understand every PR before you review it.
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label
              htmlFor="email"
              style={{
                display: "block",
                fontSize: "10px",
                textTransform: "uppercase",
                letterSpacing: "0.8px",
                color: "var(--text-tertiary)",
                marginBottom: "6px",
                fontWeight: 600,
              }}
            >
              Bitbucket email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              style={{
                width: "100%",
                padding: "10px 14px",
                background: "var(--bg-muted)",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-md)",
                color: "var(--text-primary)",
                fontSize: "13px",
                outline: "none",
              }}
              onFocus={(e) =>
                (e.currentTarget.style.borderColor = "var(--accent)")
              }
              onBlur={(e) =>
                (e.currentTarget.style.borderColor = "var(--border-default)")
              }
            />
          </div>

          <div>
            <label
              htmlFor="apiToken"
              style={{
                display: "block",
                fontSize: "10px",
                textTransform: "uppercase",
                letterSpacing: "0.8px",
                color: "var(--text-tertiary)",
                marginBottom: "6px",
                fontWeight: 600,
              }}
            >
              API token
            </label>
            <input
              id="apiToken"
              type="password"
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
              placeholder="Your API token"
              required
              style={{
                width: "100%",
                padding: "10px 14px",
                background: "var(--bg-muted)",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-md)",
                color: "var(--text-primary)",
                fontSize: "13px",
                outline: "none",
              }}
              onFocus={(e) =>
                (e.currentTarget.style.borderColor = "var(--accent)")
              }
              onBlur={(e) =>
                (e.currentTarget.style.borderColor = "var(--border-default)")
              }
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !email || !apiToken}
            style={{
              width: "100%",
              padding: "12px",
              background: "var(--accent)",
              color: "#fff",
              fontWeight: 500,
              fontSize: "13px",
              borderRadius: "var(--radius-md)",
              border: "none",
              cursor: submitting ? "not-allowed" : "pointer",
              opacity: submitting || !email || !apiToken ? 0.5 : 1,
              transition: "opacity var(--transition-fast)",
            }}
          >
            {submitting ? "Connecting..." : "Sign in"}
          </button>

          {loginError && (
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
              {loginError}
            </div>
          )}
        </form>

        {/* Help text */}
        <div style={{ fontSize: "11px", color: "var(--text-tertiary)", lineHeight: 1.6 }}>
          <p>
            Create an API token in{" "}
            <span style={{ color: "var(--text-secondary)" }}>
              Bitbucket → Personal settings → API tokens
            </span>{" "}
            with <span style={{ color: "var(--text-secondary)" }}>Read</span>{" "}
            scopes for Account, Repositories, and Pull Requests.
          </p>
          <p style={{ marginTop: "6px" }}>
            Your credentials are stored in an encrypted server-side session.
          </p>
        </div>

        {loading && (
          <p
            className="text-center"
            style={{
              fontSize: "12px",
              color: "var(--text-tertiary)",
              animation: "pulse 1.5s ease-in-out infinite",
            }}
          >
            Loading...
          </p>
        )}
      </div>
    </div>
  );
}
