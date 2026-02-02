import { test, expect, Page, type Route } from "@playwright/test";

type TripState = {
  trip: any | null;
  nextId: number;
};

async function setupApi(page: Page, state: TripState) {
  const getJsonBody = (route: Route) => {
    const raw = route.request().postData();
    if (!raw) return {};
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  };

  await page.route("**/auth/login", async (route) => {
    const body = getJsonBody(route);
    const email = body?.email ?? "";
    const isAdmin = email.includes("admin");
    const user = isAdmin
      ? {
          id: "admin-1",
          email,
          firstName: "Admin",
          role: "ADMIN",
          mustChangePassword: false,
        }
      : {
          id: "user-1",
          email,
          firstName: "Obi",
          lastName: "Akindele",
          role: "USER",
          mustChangePassword: false,
        };

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ accessToken: isAdmin ? "admin-token" : "user-token", user }),
    });
  });

  await page.route("**/notifications**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
  });

  await page.route("**/admin/trips/*/approve", async (route) => {
    if (state.trip) {
      state.trip = { ...state.trip, status: "APPROVED", rejectionReason: null };
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(state.trip ?? { status: "APPROVED" }),
    });
  });

  await page.route("**/admin/trips/*/reject", async (route) => {
    const body = getJsonBody(route);
    const reason = body?.reason ?? "Rejected";
    if (state.trip) {
      state.trip = { ...state.trip, status: "REJECTED", rejectionReason: reason };
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(state.trip ?? { status: "REJECTED", rejectionReason: reason }),
    });
  });

  await page.route("**/admin/trips**", async (route) => {
    const urlString = route.request().url();
    if (urlString.includes("/approve") || urlString.includes("/reject") || route.request().method() !== "GET") {
      await route.fallback();
      return;
    }
    const url = new URL(route.request().url());
    const status = (url.searchParams.get("status") ?? "").toUpperCase();
    const list =
      state.trip && (status === "" || state.trip.status === status) ? [state.trip] : [];
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(list),
    });
  });

  await page.route("**/trips**", async (route) => {
    if (route.request().url().includes("/admin/trips")) {
      await route.fallback();
      return;
    }
    const method = route.request().method();
    if (method === "POST") {
      const payload = getJsonBody(route);
      const id = `trip-${state.nextId++}`;
      state.trip = {
        id,
        destination: payload.destination ?? "",
        tripDateTime: payload.tripDateTime ?? "",
        returnTripDateTime: payload.returnTripDateTime ?? "",
        mode: payload.mode ?? "LAND",
        returnMode: payload.returnMode ?? payload.mode ?? "LAND",
        status: "PENDING",
        rejectionReason: null,
        user: {
          id: "user-1",
          firstName: "Obi",
          lastName: "Akindele",
          email: "obi@example.com",
        },
      };
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ id }),
      });
      return;
    }

    await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
  });
}

async function bookTrip(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill("obi@example.com");
  await page.locator("#login-password").fill("password123");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page).toHaveURL(/\/calendar/);

  await page.getByRole("button", { name: "Next" }).click();

  const dayCard = page.locator(".day-card.in-month.is-bookable").first();
  await expect(dayCard).toBeVisible();
  await dayCard.click();

  const bookButton = page.getByRole("button", { name: /book travel/i });
  await expect(bookButton).toBeVisible();
  await bookButton.click();
  await expect(page.locator(".booking-card")).toBeVisible();

  await page.locator('label:has-text("Mode of travel") select').first().selectOption("LAND");

  const departureTime = page.locator('label:has-text("Time of departure") select');
  await departureTime.nth(0).selectOption("10");
  await departureTime.nth(1).selectOption("00");
  await departureTime.nth(2).selectOption("AM");

  await page.getByLabel("Destination").fill("Ibadan, Nigeria");

  const returnDateInput = page.getByLabel("Return date");
  const minDate = await returnDateInput.getAttribute("min");
  if (!minDate) {
    throw new Error("Expected return date min attribute to be set");
  }
  await returnDateInput.fill(minDate);

  const returnTime = page.locator('label:has-text("Return time") select');
  await returnTime.nth(0).selectOption("02");
  await returnTime.nth(1).selectOption("00");
  await returnTime.nth(2).selectOption("PM");

  await page.getByRole("button", { name: /submit/i }).click();
  await expect(page.getByText("Trip sent for approval.")).toBeVisible();

  await page.getByRole("button", { name: "Logout" }).click();
  await expect(page).toHaveURL(/\/login/);
}

async function adminLogin(page: Page) {
  await page.getByLabel("Email", { exact: true }).fill("admin@example.com");
  await page.locator("#login-password").fill("adminpass123");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page).toHaveURL(/\/admin/);
}

test("user books a trip then admin approves", async ({ page }) => {
  const state: TripState = { trip: null, nextId: 1 };
  await setupApi(page, state);

  await bookTrip(page);
  await adminLogin(page);

  await expect(page.getByText(/pending approvals/i)).toBeVisible();
  const reviewLink = page.getByRole("link", { name: "Review" }).first();
  await expect(reviewLink).toBeVisible();
  await reviewLink.click();

  await expect(page).toHaveURL(/\/admin\/trips\/trip-/);
  const approveResponse = page.waitForResponse("**/admin/trips/*/approve");
  await page.getByRole("button", { name: /approve/i }).click();
  await approveResponse;

  await expect(page.locator(".status-pill")).toHaveText(/approved/i);
});

test("user books a trip then admin rejects", async ({ page }) => {
  const state: TripState = { trip: null, nextId: 1 };
  await setupApi(page, state);

  await bookTrip(page);
  await adminLogin(page);

  await expect(page.getByText(/pending approvals/i)).toBeVisible();
  const reviewLink = page.getByRole("link", { name: "Review" }).first();
  await expect(reviewLink).toBeVisible();
  await reviewLink.click();

  await expect(page).toHaveURL(/\/admin\/trips\/trip-/);

  const reasonInput = page.getByLabel(/rejection reason/i);
  await reasonInput.fill("Missing policy");

  const rejectResponse = page.waitForResponse("**/admin/trips/*/reject");
  await page.getByRole("button", { name: /reject/i }).click();
  await rejectResponse;

  await expect(page.locator(".status-pill")).toHaveText(/rejected/i);
});
