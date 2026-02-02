import { render, fireEvent, screen, waitFor, within } from "@testing-library/vue";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import { describe, expect, it, vi } from "vitest";
import ViewUsers from "../src/pages/ViewUsers.vue";
import { useAuthStore } from "../src/stores/auth";
import { fetchUsers, setTemporaryPassword } from "../src/lib/api";

vi.mock("../src/lib/api", async () => {
  const actual = await vi.importActual<typeof import("../src/lib/api")>("../src/lib/api");
  return {
    ...actual,
    fetchUsers: vi.fn(),
    setTemporaryPassword: vi.fn(),
    deactivateUser: vi.fn(),
    activateUser: vi.fn(),
  };
});

const mockFetchUsers = vi.mocked(fetchUsers);
const mockSetTemporaryPassword = vi.mocked(setTemporaryPassword);

function setupRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/admin/users", component: ViewUsers },
      { path: "/admin", component: { template: "<div>Dashboard</div>" } },
      { path: "/calendar", component: { template: "<div>Calendar</div>" } },
      { path: "/login", component: { template: "<div>Login</div>" } },
    ],
  });
}

describe("ViewUsers", () => {
  it("loads users and shows load more when there are more results", async () => {
    mockFetchUsers.mockResolvedValue({
      data: [
        {
          id: "user-1",
          firstName: "Obi",
          lastName: "Akindele",
          email: "obi@example.com",
          role: "USER",
          mustChangePassword: false,
          isActive: true,
          createdAt: "2026-01-01T00:00:00Z",
        },
      ],
      total: 2,
      page: 1,
      limit: 20,
    });

    const pinia = createPinia();
    setActivePinia(pinia);
    const auth = useAuthStore();
    auth.user = { id: "admin-1", email: "admin@example.com", role: "ADMIN" };

    const router = setupRouter();
    await router.push("/admin/users");
    await router.isReady();

    render(ViewUsers, { global: { plugins: [pinia, router] } });

    expect(await screen.findByText("Obi Akindele")).toBeInTheDocument();
    expect(screen.getByText("obi@example.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /load more/i })).toBeInTheDocument();
  });

  it("sets a temporary password for a user", async () => {
    mockFetchUsers.mockResolvedValue({
      data: [
        {
          id: "user-2",
          firstName: "Grace",
          lastName: "Chinda",
          email: "grace@example.com",
          role: "USER",
          mustChangePassword: false,
          isActive: true,
          createdAt: "2026-01-02T00:00:00Z",
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    });
    mockSetTemporaryPassword.mockResolvedValue({});

    const pinia = createPinia();
    setActivePinia(pinia);
    const auth = useAuthStore();
    auth.user = { id: "admin-1", email: "admin@example.com", role: "ADMIN" };

    const router = setupRouter();
    await router.push("/admin/users");
    await router.isReady();

    render(ViewUsers, { global: { plugins: [pinia, router] } });

    await screen.findByText("Grace Chinda");

    await fireEvent.click(screen.getByRole("button", { name: /set temp password/i }));

    const tempPanel = screen.getByText("Temporary password").closest("label") as HTMLElement | null;
    if (!tempPanel) {
      throw new Error("Temporary password panel not found");
    }

    const input = within(tempPanel).getByPlaceholderText(/enter temporary password/i);
    await fireEvent.update(input, "Temp1234!");

    await fireEvent.click(screen.getByRole("button", { name: /set temporary password/i }));

    await waitFor(() => {
      expect(mockSetTemporaryPassword).toHaveBeenCalledWith("user-2", "Temp1234!");
    });

    expect(
      screen.getByText(/temporary password set\. user must change it on next login\./i)
    ).toBeInTheDocument();
  });
});
