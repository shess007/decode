"use client";

import { TopBar } from "@/components/report/topbar";
import { PRPicker } from "@/components/pr-picker/pr-picker";
import { useAuthStore } from "@/stores/auth-store";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function BrowsePage() {
  const { user, loading, fetchSession } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [loading, user, router]);

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
      <main className="flex-1 flex items-start justify-center" style={{ padding: "40px 20px" }}>
        <div className="w-full max-w-2xl">
          <button
            onClick={() => router.push("/dashboard")}
            style={{
              fontSize: "12px",
              color: "var(--accent)",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              marginBottom: "24px",
              opacity: 0.8,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.8")}
          >
            ← Back to dashboard
          </button>
          <PRPicker />
        </div>
      </main>
    </div>
  );
}
