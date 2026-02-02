import { render, screen } from "@testing-library/vue";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import { describe, expect, it, vi } from "vitest";
import Calendar from "../src/pages/Calendar.vue";
import { useAuthStore } from "../src/stores/auth";
import { fetchUserNotifications } from "../src/lib/api";

vi.mock("../src/lib/api", async () => {
  const actual = await vi.importActual<typeof import("../src/lib/api")>("../src/lib/api");
  return {
    ...actual,
    fetchUserNotifications: vi.fn(),
  };
});

const mockedFetchUserNotifications = vi.mocked(fetchUserNotifications);

function setupRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/calendar", component: Calendar },
      { path: "/notifications", component: { template: "<div>Notifications</div>" } },
      { path: "/login", component: { template: "<div>Login</div>" } },
    ],
  });
}

describe("Calendar", () => {
  it("loads unread notifications for users and displays the badge", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);

    const auth = useAuthStore();
    auth.accessToken = "token";
    auth.user = { id: "user-1", email: "obi@example.com", firstName: "Obi", role: "USER" };

    mockedFetchUserNotifications.mockResolvedValue([
      {
        id: "note-1",
        tripId: "trip-1",
        type: "TRIP_APPROVED",
        message: "Approved",
        createdAt: "2026-01-01T00:00:00Z",
        trip: {
          id: "trip-1",
          destination: "Ibadan, Nigeria",
          tripDateTime: "2026-02-01T10:00:00Z",
          returnTripDateTime: "2026-02-05T10:00:00Z",
          mode: "LAND",
          status: "APPROVED",
        },
      },
      {
        id: "note-2",
        tripId: "trip-2",
        type: "TRIP_REJECTED",
        message: "Rejected",
        createdAt: "2026-01-02T00:00:00Z",
        trip: {
          id: "trip-2",
          destination: "Benin, Nigeria",
          tripDateTime: "2026-03-01T10:00:00Z",
          returnTripDateTime: "2026-03-05T10:00:00Z",
          mode: "LAND",
          status: "REJECTED",
          rejectionReason: "Missing details",
        },
      },
    ]);

    const router = setupRouter();
    await router.push("/calendar");
    await router.isReady();

    render(Calendar, {
      global: {
        plugins: [pinia, router],
        stubs: {
          MonthlyCalendar: { template: "<div data-testid=\"calendar-stub\" />" },
        },
      },
    });

    expect(await screen.findByText("2", { selector: ".notify-badge" })).toBeInTheDocument();
    expect(
      screen.getByText((_, element) => {
        if (!element || !element.classList.contains("greeting")) {
          return false;
        }
        return element.textContent?.includes("Hi,") && element.textContent?.includes("Obi");
      })
    ).toBeInTheDocument();

    expect(mockedFetchUserNotifications).toHaveBeenCalledWith({
      unread: true,
      page: 1,
      limit: 200,
    });
  });
});
