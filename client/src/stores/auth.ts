import { defineStore } from "pinia";
import { apiClient, disableAuthRefresh, enableAuthRefresh } from "../lib/api";

type User = {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  role?: "USER" | "ADMIN";
  mustChangePassword?: boolean;
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
          enableAuthRefresh();
        }
        if (data?.user) {
          this.user = data.user;
          localStorage.setItem("authUser", JSON.stringify(data.user));
        }
        return data;
      } catch (e: any) {
        const serverMessage = e?.response?.data?.message ?? e?.message ?? "Login failed";
        if (serverMessage === "User account is deactivated") {
          this.error = "User account is deactivated. Contact administrator.";
        } else {
          this.error = serverMessage;
        }
        throw e;
      } finally {
        this.loading = false;
      }
    },

    async changePassword(payload: { oldPassword: string; newPassword: string }) {
      this.loading = true;
      this.error = null;
      try {
        const { data } = await apiClient.post("/auth/change-password", payload);
        if (this.user) {
          this.user = { ...this.user, mustChangePassword: false };
          localStorage.setItem("authUser", JSON.stringify(this.user));
        }
        return data;
      } catch (e: any) {
        this.error = e?.response?.data?.message ?? e?.message ?? "Password change failed";
        throw e;
      } finally {
        this.loading = false;
      }
    },

    logout() {
      disableAuthRefresh();
      this.accessToken = null;
      this.user = null;
      localStorage.removeItem("accessToken");
      localStorage.removeItem("authUser");
    },
  },
});
