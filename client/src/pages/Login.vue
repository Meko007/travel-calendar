<script setup lang="ts">
import { ref } from "vue";
import { useRouter, useRoute, RouterLink } from "vue-router";
import { useAuthStore } from "../stores/auth";

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

const email = ref("");
const password = ref("");
const showPassword = ref(false);

const submit = async () => {
  await auth.login({ email: email.value.trim(), password: password.value });
  if (auth.user?.mustChangePassword) {
    const next = (route.query.next as string) || "/calendar";
    router.push({ path: "/change-password", query: { next } });
    return;
  }
  const next = (route.query.next as string) || (auth.isAdmin ? "/admin" : "/calendar");
  router.push(next);
};
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-6">
    <div class="w-full max-w-md rounded-2xl border p-6 shadow-sm">
      <h1 class="text-2xl font-semibold">Login</h1>
      <p class="text-sm opacity-70 mt-1">Access your travel calendar.</p>

      <form class="mt-6 space-y-4" @submit.prevent="submit">
        <div>
          <label class="text-sm font-medium" for="login-email">Email</label>
          <input id="login-email" v-model="email" type="email" required
            class="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring" />
        </div>

        <div>
          <label class="text-sm font-medium" for="login-password">Password</label>
          <div class="relative">
            <input
              v-model="password"
              id="login-password"
              :type="showPassword ? 'text' : 'password'"
              required
              class="mt-1 w-full rounded-xl border px-3 py-2 pr-20 outline-none focus:ring"
            />
            <button
              type="button"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-700 hover:text-slate-900"
              @click="showPassword = !showPassword"
              :aria-label="showPassword ? 'Hide password' : 'Show password'"
            >
              <svg
                v-if="!showPassword"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="h-5 w-5"
                aria-hidden="true"
              >
                <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              <svg
                v-else
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="h-5 w-5"
                aria-hidden="true"
              >
                <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" />
                <circle cx="12" cy="12" r="3" />
                <path d="M4 4l16 16" />
              </svg>
            </button>
          </div>
        </div>

        <p v-if="auth.error" class="text-sm text-red-600">{{ auth.error }}</p>

        <button
          class="w-full rounded-xl border px-4 py-2 font-medium hover:opacity-90 disabled:opacity-50"
          :disabled="auth.loading"
        >
          {{ auth.loading ? "Signing in..." : "Login" }}
        </button>
        <p class="text-xs opacity-70">
          Forgot Password? Please contact your administrator for a reset.
        </p>
      </form>

      <p class="text-sm mt-4">
        Don't have an account?
        <RouterLink
          class="text-blue-600! underline! underline-offset-2 decoration-blue-600 hover:text-blue-700!"
          to="/signup"
        >
          Sign up
        </RouterLink>
      </p>
    </div>
  </div>
</template>
