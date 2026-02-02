import { render, fireEvent, screen, waitFor } from "@testing-library/vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { describe, expect, it, vi, afterEach } from "vitest";
import UserNotifications from "../src/pages/UserNotifications.vue";
import { deleteNotification, fetchUserNotifications, markNotificationRead } from "../src/lib/api";

vi.mock("../src/lib/api", async () => {
  const actual = await vi.importActual<typeof import("../src/lib/api")>("../src/lib/api");
  return {
    ...actual,
    fetchUserNotifications: vi.fn(),
    markNotificationRead: vi.fn(),
    deleteNotification: vi.fn(),
  };
});

const mockFetchUserNotifications = vi.mocked(fetchUserNotifications);
const mockMarkNotificationRead = vi.mocked(markNotificationRead);
const mockDeleteNotification = vi.mocked(deleteNotification);

function setupRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/notifications", component: UserNotifications },
      { path: "/calendar", component: { template: "<div>Calendar</div>" } },
      { path: "/trips/:id/resubmit", component: { template: "<div>Resubmit</div>" } },
    ],
  });
}

describe("UserNotifications", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("marks a notification as read", async () => {
    mockFetchUserNotifications.mockResolvedValue([
      {
        id: "note-1",
        tripId: "trip-1",
        type: "TRIP_APPROVED",
        message: "Approved",
        createdAt: "2026-01-01T00:00:00Z",
        readAt: null,
        trip: {
          id: "trip-1",
          destination: "Ibadan, Nigeria",
          tripDateTime: "2099-01-10T10:00:00Z",
          returnTripDateTime: "2099-01-12T10:00:00Z",
          mode: "AIR",
          status: "APPROVED",
          rejectionReason: null,
        },
      },
    ]);
    mockMarkNotificationRead.mockResolvedValue({} as any);

    const router = setupRouter();
    await router.push("/notifications");
    await router.isReady();

    render(UserNotifications, { global: { plugins: [router] } });

    await screen.findByText("Ibadan, Nigeria");

    const markReadButton = screen.getByRole("button", { name: /mark read/i });
    await fireEvent.click(markReadButton);

    await waitFor(() => expect(mockMarkNotificationRead).toHaveBeenCalledWith("note-1"));
    expect(screen.getByRole("button", { name: /read/i })).toBeDisabled();
  });

  it("deletes a notification", async () => {
    mockFetchUserNotifications.mockResolvedValue([
      {
        id: "note-2",
        tripId: "trip-2",
        type: "TRIP_REJECTED",
        message: "Rejected",
        createdAt: "2026-01-02T00:00:00Z",
        readAt: null,
        reason: "Missing details",
        trip: {
          id: "trip-2",
          destination: "Benin, Nigeria",
          tripDateTime: "2099-02-01T10:00:00Z",
          returnTripDateTime: "2099-02-03T10:00:00Z",
          mode: "LAND",
          status: "REJECTED",
          rejectionReason: "Missing details",
        },
      },
    ]);
    mockDeleteNotification.mockResolvedValue({} as any);
    vi.spyOn(window, "confirm").mockReturnValue(true);

    const router = setupRouter();
    await router.push("/notifications");
    await router.isReady();

    render(UserNotifications, { global: { plugins: [router] } });

    await screen.findByText("Benin, Nigeria");

    await fireEvent.click(screen.getByRole("button", { name: /delete/i }));

    await waitFor(() => expect(mockDeleteNotification).toHaveBeenCalledWith("note-2"));
    await waitFor(() => expect(screen.queryByText("Benin, Nigeria")).not.toBeInTheDocument());
  });
});
