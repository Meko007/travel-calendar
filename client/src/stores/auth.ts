import { defineStore } from "pinia";
import { apiClient } from "../lib/api";

type User = {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  role?: "USER" | "ADMIN";
};

function getStoredUser(): User | null {
  const raw = localStorage.getItem("authUser");
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export const useAuthStore = defineStore("auth", {
  state: () => ({
    accessToken: localStorage.getItem("accessToken") as string | null,
    user: getStoredUser(),
    loading: false,
    error: null as string | null,
  }),

  getters: {
    isAuthed: (s) => !!s.accessToken,
    isAdmin: (s) => s.user?.role === "ADMIN",
  },

  actions: {
    async signup(payload: { firstName: string; lastName: string; email: string; password: string }) {
      this.loading = true;
      this.error = null;
      try {
        const { data } = await apiClient.post("/auth/signup", payload);
        if (data?.user) {
          this.user = data.user;
          localStorage.setItem("authUser", JSON.stringify(data.user));
        }
        return data;
      } catch (e: any) {
        this.error = e?.response?.data?.message ?? e?.message ?? "Signup failed";
        throw e;
      } finally {
        this.loading = false;
      }
    },

    async login(payload: { email: string; password: string }) {
      this.loading = true;
      this.error = null;
      try {
        const { data } = await apiClient.post("/auth/login", payload);
        if (data?.accessToken) {
          this.accessToken = data.accessToken;
          localStorage.setItem("accessToken", data.accessToken);
        }
        if (data?.user) {
          this.user = data.user;
          localStorage.setItem("authUser", JSON.stringify(data.user));
        }
        return data;
      } catch (e: any) {
        this.error = e?.response?.data?.message ?? e?.message ?? "Login failed";
        throw e;
      } finally {
        this.loading = false;
      }
    },

    logout() {
      this.accessToken = null;
      this.user = null;
      localStorage.removeItem("accessToken");
      localStorage.removeItem("authUser");
    },
  },
});
