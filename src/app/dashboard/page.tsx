"use client";

import { TopBar } from "@/components/report/topbar";
import { PRPicker } from "@/components/pr-picker/pr-picker";
import { useAuthStore } from "@/stores/auth-store";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardPage() {
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
          <PRPicker />
        </div>
      </main>
    </div>
  );
}
