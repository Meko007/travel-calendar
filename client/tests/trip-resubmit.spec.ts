import { render, fireEvent, screen, waitFor, within } from "@testing-library/vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { describe, expect, it, vi } from "vitest";
import TripResubmit from "../src/pages/TripResubmit.vue";
import { fetchTrip, resubmitTrip } from "../src/lib/api";

vi.mock("../src/lib/api", async () => {
  const actual = await vi.importActual<typeof import("../src/lib/api")>("../src/lib/api");
  return {
    ...actual,
    fetchTrip: vi.fn(),
    resubmitTrip: vi.fn(),
  };
});

const mockFetchTrip = vi.mocked(fetchTrip);
const mockResubmitTrip = vi.mocked(resubmitTrip);

function setupRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/trips/:id/resubmit", component: TripResubmit },
      { path: "/notifications", component: { template: "<div>Notifications</div>" } },
      { path: "/calendar", component: { template: "<div>Calendar</div>" } },
    ],
  });
}

describe("TripResubmit", () => {
  it("resubmits a rejected trip with updated details", async () => {
    mockFetchTrip.mockResolvedValue({
      id: "trip-1",
      destination: "Benin, Nigeria",
      tripDateTime: "2099-01-10T10:00:00Z",
      returnTripDateTime: "2099-01-12T10:00:00Z",
      mode: "AIR",
      returnMode: "AIR",
      status: "REJECTED",
      rejectionReason: "Missing details",
    });
    mockResubmitTrip.mockResolvedValue({});

    const router = setupRouter();
    await router.push("/trips/trip-1/resubmit");
    await router.isReady();

    render(TripResubmit, { global: { plugins: [router] } });

    const destinationInput = await screen.findByPlaceholderText(/city, country/i);
    await fireEvent.update(destinationInput, "Lagos, Nigeria");

    const modeLabel = screen.getByText(/^mode of travel$/i).closest("label") as HTMLElement | null;
    if (!modeLabel) throw new Error("Mode of travel label not found");
    await fireEvent.update(within(modeLabel).getByRole("combobox"), "LAND");

    const returnModeLabel = screen.getByText(/^return mode of travel$/i).closest("label") as HTMLElement | null;
    if (!returnModeLabel) throw new Error("Return mode label not found");
    await fireEvent.update(within(returnModeLabel).getByRole("combobox"), "LAND");

    const departureDateLabel = screen.getByText(/^departure date$/i).closest("label") as HTMLElement | null;
    if (!departureDateLabel) throw new Error("Departure date label not found");
    const departureDateInput = departureDateLabel.querySelector("input");
    if (!departureDateInput) throw new Error("Departure date input not found");
    await fireEvent.update(departureDateInput, "2099-03-05");

    const departureLabel = screen.getByText(/departure time/i).closest("label") as HTMLElement | null;
    if (!departureLabel) throw new Error("Departure time label not found");
    const departureSelects = within(departureLabel).getAllByRole("combobox") as HTMLSelectElement[];
    await fireEvent.update(departureSelects[0], "09");
    await fireEvent.update(departureSelects[1], "00");
    await fireEvent.update(departureSelects[2], "AM");

    const returnDateLabel = screen.getByText(/^return date$/i).closest("label") as HTMLElement | null;
    if (!returnDateLabel) throw new Error("Return date label not found");
    const returnDateInput = returnDateLabel.querySelector("input");
    if (!returnDateInput) throw new Error("Return date input not found");
    await fireEvent.update(returnDateInput, "2099-03-07");

    const returnLabel = screen.getByText(/return time/i).closest("label") as HTMLElement | null;
    if (!returnLabel) throw new Error("Return time label not found");
    const returnSelects = within(returnLabel).getAllByRole("combobox") as HTMLSelectElement[];
    await fireEvent.update(returnSelects[0], "02");
    await fireEvent.update(returnSelects[1], "30");
    await fireEvent.update(returnSelects[2], "PM");

    await fireEvent.click(screen.getByRole("button", { name: /resubmit/i }));

    await waitFor(() => {
      expect(mockResubmitTrip).toHaveBeenCalledWith("trip-1", {
        destination: "Lagos, Nigeria",
        tripDateTime: "2099-03-05T09:00:00",
        returnTripDateTime: "2099-03-07T14:30:00",
        mode: "LAND",
        returnMode: "LAND",
      });
    });

    expect(screen.getByText(/trip resubmitted for approval/i)).toBeInTheDocument();
  });
});
