import { create } from "zustand";

interface AuthUser {
  displayName: string;
  username: string;
  uuid: string;
  avatarUrl: string;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  loginError: string | null;
  fetchSession: () => Promise<void>;
  login: (email: string, apiToken: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  loginError: null,

  fetchSession: async () => {
    try {
      const res = await fetch("/api/auth/session");
      const data = await res.json();
      set({
        user: data.authenticated ? data.user : null,
        loading: false,
      });
    } catch {
      set({ user: null, loading: false });
    }
  },

  login: async (email: string, apiToken: string) => {
    set({ loginError: null });
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, apiToken }),
      });

      const data = await res.json();

      if (!res.ok) {
        set({ loginError: data.error });
        return false;
      }

      set({ user: data.user, loginError: null });
      return true;
    } catch {
      set({ loginError: "Connection failed" });
      return false;
    }
  },

  logout: async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    set({ user: null });
  },
}));
