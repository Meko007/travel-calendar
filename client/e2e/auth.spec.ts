import { test, expect } from "@playwright/test";

test("login redirects to calendar", async ({ page }) => {
  await page.route("**/auth/login", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        accessToken: "token",
        user: {
          id: "user-1",
          email: "obi@example.com",
          firstName: "Obi",
          lastName: "Akindele",
          role: "USER",
          mustChangePassword: false,
        },
      }),
    });
  });

  await page.route("**/notifications**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
  });

  await page.route("**/trips**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
  });

  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill("obi@example.com");
  await page.locator("#login-password").fill("password123");
  await page.getByRole("button", { name: "Login" }).click();

  await expect(page).toHaveURL(/\/calendar/);
  await expect(page.getByText(/hi,\s*obi/i)).toBeVisible();
});
