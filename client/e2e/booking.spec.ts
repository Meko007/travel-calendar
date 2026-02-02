import { test, expect } from "@playwright/test";

test("book travel from the calendar", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("accessToken", "token");
    localStorage.setItem(
      "authUser",
      JSON.stringify({
        id: "user-1",
        email: "obi@example.com",
        firstName: "Obi",
        lastName: "Akindele",
        role: "USER",
        mustChangePassword: false,
      })
    );
  });

  await page.route("**/notifications**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
  });

  await page.route("**/trips**", async (route) => {
    const method = route.request().method();
    if (method === "POST") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ id: "trip-new" }),
      });
      return;
    }

    await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
  });

  await page.goto("/calendar");
  await page.getByRole("button", { name: "Next" }).click();

  const dayCard = page.locator(".day-card.in-month.is-bookable").first();
  await expect(dayCard).toBeVisible();
  await dayCard.click();

  const bookButton = page.getByRole("button", { name: /book travel/i });
  await expect(bookButton).toBeVisible();
  await bookButton.click();
  await expect(page.locator(".booking-card")).toBeVisible();

  await page.locator('label:has-text("Mode of travel") select').first().selectOption("AIR");

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
});
