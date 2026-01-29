<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

const oldPassword = ref("");
const newPassword = ref("");
const confirmPassword = ref("");
const localError = ref("");
const showOldPassword = ref(false);
const showNewPassword = ref(false);
const showConfirmPassword = ref(false);

const passwordsMatch = computed(
  () => newPassword.value.length > 0 && newPassword.value === confirmPassword.value
);

const submit = async () => {
  localError.value = "";
  if (newPassword.value === oldPassword.value) {
    localError.value = "New password must be different from current password.";
    return;
  }
  if (!passwordsMatch.value) {
    localError.value = "Passwords do not match.";
    return;
  }
  await auth.changePassword({
    oldPassword: oldPassword.value,
    newPassword: newPassword.value,
  });
  const next = (route.query.next as string) || (auth.isAdmin ? "/admin" : "/calendar");
  router.push(next);
};
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-6">
    <div class="w-full max-w-md rounded-2xl border p-6 shadow-sm">
      <h1 class="text-2xl font-semibold">Change password</h1>
      <p class="text-sm opacity-70 mt-1">
        You must set a new password before continuing.
      </p>

      <form class="mt-6 space-y-4" @submit.prevent="submit">
        <div>
          <label class="text-sm font-medium">Current Password</label>
          <div class="relative">
            <input
              v-model="oldPassword"
              :type="showOldPassword ? 'text' : 'password'"
              required
              class="mt-1 w-full rounded-xl border px-3 py-2 pr-20 outline-none focus:ring"
            />
            <button
              type="button"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-700 hover:text-slate-900"
              @click="showOldPassword = !showOldPassword"
              :aria-label="showOldPassword ? 'Hide password' : 'Show password'"
            >
              <svg
                v-if="!showOldPassword"
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

        <div>
          <label class="text-sm font-medium">New Password</label>
          <div class="relative">
            <input
              v-model="newPassword"
              :type="showNewPassword ? 'text' : 'password'"
              required
              minlength="8"
              class="mt-1 w-full rounded-xl border px-3 py-2 pr-20 outline-none focus:ring"
            />
            <button
              type="button"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-700 hover:text-slate-900"
              @click="showNewPassword = !showNewPassword"
              :aria-label="showNewPassword ? 'Hide password' : 'Show password'"
            >
              <svg
                v-if="!showNewPassword"
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

        <div>
          <label class="text-sm font-medium">Confirm New Password</label>
          <div class="relative">
            <input
              v-model="confirmPassword"
              :type="showConfirmPassword ? 'text' : 'password'"
              required
              minlength="8"
              class="mt-1 w-full rounded-xl border px-3 py-2 pr-20 outline-none focus:ring"
            />
            <button
              type="button"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-700 hover:text-slate-900"
              @click="showConfirmPassword = !showConfirmPassword"
              :aria-label="showConfirmPassword ? 'Hide password' : 'Show password'"
            >
              <svg
                v-if="!showConfirmPassword"
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

        <p v-if="localError" class="text-sm text-red-600">{{ localError }}</p>
        <p v-if="auth.error" class="text-sm text-red-600">{{ auth.error }}</p>

        <button
          class="w-full rounded-xl border px-4 py-2 font-medium hover:opacity-90 disabled:opacity-50"
          :disabled="auth.loading || !passwordsMatch"
        >
          {{ auth.loading ? "Updating..." : "Update password" }}
        </button>
      </form>
    </div>
  </div>
</template>
