import { render, fireEvent, screen, waitFor } from "@testing-library/vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { describe, expect, it, vi } from "vitest";
import AdminTripReview from "../src/pages/AdminTripReview.vue";
import { approveTrip, fetchAdminTrips, rejectTrip, type AdminTrip } from "../src/lib/api";

vi.mock("../src/lib/api", async () => {
  const actual = await vi.importActual<typeof import("../src/lib/api")>("../src/lib/api");
  return {
    ...actual,
    fetchAdminTrips: vi.fn(),
    approveTrip: vi.fn(),
    rejectTrip: vi.fn(),
  };
});

const mockFetchAdminTrips = vi.mocked(fetchAdminTrips);
const mockApproveTrip = vi.mocked(approveTrip);
const mockRejectTrip = vi.mocked(rejectTrip);

function setupRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/admin/trips/:id", component: AdminTripReview },
      { path: "/admin", component: { template: "<div>Dashboard</div>" } },
      { path: "/calendar", component: { template: "<div>Calendar</div>" } },
    ],
  });
}

const baseTrip: AdminTrip = {
  id: "trip-1",
  destination: "Ibadan, Nigeria",
  tripDateTime: "2099-01-10T10:00:00Z",
  returnTripDateTime: "2099-01-12T10:00:00Z",
  mode: "AIR",
  returnMode: "AIR",
  status: "PENDING",
  rejectionReason: null,
  user: {
    id: "user-1",
    firstName: "Obi",
    lastName: "Akindele",
    email: "obi@example.com",
  },
};

describe("AdminTripReview", () => {
  it("approves a pending trip", async () => {
    mockFetchAdminTrips.mockImplementation(async (params) => {
      return params?.status === "PENDING" ? [baseTrip] : [];
    });
    mockApproveTrip.mockResolvedValue({ status: "APPROVED", rejectionReason: null } as any);

    const router = setupRouter();
    await router.push("/admin/trips/trip-1");
    await router.isReady();

    render(AdminTripReview, { global: { plugins: [router] } });

    await screen.findByText("Ibadan, Nigeria");

    await fireEvent.click(await screen.findByRole("button", { name: /^approve$/i }));

    await waitFor(() => expect(mockApproveTrip).toHaveBeenCalledWith("trip-1"));
    await waitFor(() => expect(screen.getByText("APPROVED")).toBeInTheDocument());
  });

  it("rejects a pending trip with a reason", async () => {
    mockFetchAdminTrips.mockImplementation(async (params) => {
      return params?.status === "PENDING" ? [baseTrip] : [];
    });
    mockRejectTrip.mockResolvedValue({ status: "REJECTED", rejectionReason: "Missing policy" } as any);

    const router = setupRouter();
    await router.push("/admin/trips/trip-1");
    await router.isReady();

    render(AdminTripReview, { global: { plugins: [router] } });

    await screen.findByText("Ibadan, Nigeria");

    await fireEvent.update(
      await screen.findByPlaceholderText(/give a clear reason for rejection/i),
      "Missing policy"
    );

    await fireEvent.click(await screen.findByRole("button", { name: /^reject$/i }));

    await waitFor(() => expect(mockRejectTrip).toHaveBeenCalledWith("trip-1", "Missing policy"));
    await waitFor(() => expect(screen.getByText("REJECTED")).toBeInTheDocument());
  });
});
