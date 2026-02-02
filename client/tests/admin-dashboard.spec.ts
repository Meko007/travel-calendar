import { render, screen, within } from "@testing-library/vue";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import { describe, expect, it, vi } from "vitest";
import AdminDashboard from "../src/pages/AdminDashboard.vue";
import { fetchAdminTrips } from "../src/lib/api";
import { useAuthStore } from "../src/stores/auth";

vi.mock("../src/lib/api", async () => {
  const actual = await vi.importActual<typeof import("../src/lib/api")>("../src/lib/api");
  return {
    ...actual,
    fetchAdminTrips: vi.fn(),
  };
});

const mockFetchAdminTrips = vi.mocked(fetchAdminTrips);

function setupRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/admin", component: AdminDashboard },
      { path: "/admin/trips/:id", component: { template: "<div>Trip Review</div>" } },
      { path: "/admin/users", component: { template: "<div>Users</div>" } },
      { path: "/calendar", component: { template: "<div>Calendar</div>" } },
    ],
  });
}

describe("AdminDashboard", () => {
  it("shows pending trips and greeting", async () => {
    mockFetchAdminTrips.mockResolvedValue([
      {
        id: "trip-1",
        destination: "Ibadan, Nigeria",
        tripDateTime: "2099-01-10T10:00:00Z",
        returnTripDateTime: "2099-01-12T10:00:00Z",
        mode: "LAND",
        status: "PENDING",
        rejectionReason: null,
        user: {
          id: "user-1",
          firstName: "Obi",
          lastName: "Akindele",
          email: "obi@example.com",
        },
      },
      {
        id: "trip-2",
        destination: "Benin, Nigeria",
        tripDateTime: "2099-02-01T10:00:00Z",
        returnTripDateTime: "2099-02-04T10:00:00Z",
        mode: "LAND",
        status: "PENDING",
        rejectionReason: null,
        user: {
          id: "user-2",
          firstName: "Grace",
          lastName: "Chinda",
          email: "grace@example.com",
        },
      },
    ]);

    const pinia = createPinia();
    setActivePinia(pinia);
    const auth = useAuthStore();
    auth.user = { id: "admin-1", email: "admin@example.com", firstName: "Admin", role: "ADMIN" };

    const router = setupRouter();
    await router.push("/admin");
    await router.isReady();

    render(AdminDashboard, { global: { plugins: [pinia, router] } });

    expect(await screen.findByText(/welcome back, Admin\./i)).toBeInTheDocument();
    expect(await screen.findByText("Ibadan, Nigeria")).toBeInTheDocument();
    expect(await screen.findByText("Benin, Nigeria")).toBeInTheDocument();

    const statCard = screen.getByText(/pending trips/i).closest(".stat-card") as HTMLElement | null;
    if (!statCard) {
      throw new Error("Pending trips stat card not found");
    }
    expect(within(statCard).getByText("2")).toBeInTheDocument();
  });
});
