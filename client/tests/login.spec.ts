import { render, fireEvent, waitFor } from "@testing-library/vue";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import { describe, expect, it, vi } from "vitest";
import Login from "../src/pages/Login.vue";
import { useAuthStore } from "../src/stores/auth";

function setupRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/login", component: Login },
      { path: "/signup", component: { template: "<div>Signup</div>" } },
      { path: "/calendar", component: { template: "<div>Calendar</div>" } },
      { path: "/change-password", component: { template: "<div>Change Password</div>" } },
    ],
  });
}

describe("Login", () => {
  it("submits credentials and redirects to change-password when required", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);

    const router = setupRouter();
    await router.push({ path: "/login", query: { next: "/calendar" } });
    await router.isReady();

    const auth = useAuthStore();
    auth.user = { id: "user-1", email: "obi@example.com", role: "USER", mustChangePassword: true };

    const loginSpy = vi.spyOn(auth, "login").mockResolvedValue({});
    const pushSpy = vi.spyOn(router, "push");

    const { getByLabelText, getByRole } = render(Login, {
      global: { plugins: [pinia, router] },
    });

    await fireEvent.update(getByLabelText(/email/i), "  obi@example.com ");
    await fireEvent.update(getByLabelText("Password", { selector: "input" }), "secret123");

    await fireEvent.click(getByRole("button", { name: /login/i }));

    await waitFor(() => expect(loginSpy).toHaveBeenCalled());
    expect(loginSpy).toHaveBeenCalledWith({
      email: "obi@example.com",
      password: "secret123",
    });

    await waitFor(() => {
      expect(pushSpy).toHaveBeenCalledWith({
        path: "/change-password",
        query: { next: "/calendar" },
      });
    });
  });
});
