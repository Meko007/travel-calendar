import { render, fireEvent, screen, waitFor } from "@testing-library/vue";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import { describe, expect, it, vi } from "vitest";
import Signup from "../src/pages/Signup.vue";
import { useAuthStore } from "../src/stores/auth";

function setupRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/signup", component: Signup },
      { path: "/calendar", component: { template: "<div>Calendar</div>" } },
      { path: "/login", component: { template: "<div>Login</div>" } },
    ],
  });
}

describe("Signup", () => {
  it("submits matching credentials and navigates to login", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);

    const router = setupRouter();
    await router.push("/signup");
    await router.isReady();

    const auth = useAuthStore();
    const signupSpy = vi.spyOn(auth, "signup").mockResolvedValue({});
    const pushSpy = vi.spyOn(router, "push");

    const { getByLabelText, container } = render(Signup, {
      global: { plugins: [pinia, router] },
    });

    await fireEvent.update(getByLabelText(/first name/i), "Obi");
    await fireEvent.update(getByLabelText(/last name/i), "Akindele");
    await fireEvent.update(getByLabelText(/email/i), "obi@example.com");
    await fireEvent.update(getByLabelText(/^password$/i), "password123");
    await fireEvent.update(getByLabelText(/confirm password/i), "password123");

    const form = container.querySelector("form");
    if (!form) {
      throw new Error("Signup form not found");
    }
    await fireEvent.submit(form);

    await waitFor(() => expect(signupSpy).toHaveBeenCalled());
    expect(signupSpy).toHaveBeenCalledWith({
      firstName: "Obi",
      lastName: "Akindele",
      email: "obi@example.com",
      password: "password123",
    });

    await waitFor(() => {
      expect(pushSpy).toHaveBeenCalledWith("/login");
    });
  });

  it("shows an error when passwords do not match", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);

    const router = setupRouter();
    await router.push("/signup");
    await router.isReady();

    const auth = useAuthStore();
    const signupSpy = vi.spyOn(auth, "signup").mockResolvedValue({});

    const { getByLabelText, container } = render(Signup, {
      global: { plugins: [pinia, router] },
    });

    await fireEvent.update(getByLabelText(/first name/i), "Obi");
    await fireEvent.update(getByLabelText(/last name/i), "Akindele");
    await fireEvent.update(getByLabelText(/email/i), "obi@example.com");
    await fireEvent.update(getByLabelText(/^password$/i), "password123");
    await fireEvent.update(getByLabelText(/confirm password/i), "password456");

    const form = container.querySelector("form");
    if (!form) {
      throw new Error("Signup form not found");
    }
    await fireEvent.submit(form);

    expect(signupSpy).not.toHaveBeenCalled();
    expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument();
  });
});
