<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { RouterLink, useRouter } from "vue-router";
import { activateUser, deactivateUser, fetchUsers, setTemporaryPassword, type User } from "../lib/api";
import { useAuthStore } from "../stores/auth";

const users = ref<User[]>([]);
const loading = ref(true);
const error = ref("");
const search = ref("");
const page = ref(1);
const limit = 20;
const total = ref(0);
const isSearching = ref(false);
let searchTimer: number | undefined;
const router = useRouter();
const auth = useAuthStore();

const activeUserId = ref<string | null>(null);
const tempPassword = ref("");
const showTempPassword = ref(false);
const tempSubmitting = ref(false);
const tempMessage = ref("");
const tempMessageType = ref<"success" | "error" | "">("");
const statusTargetId = ref<string | null>(null);
const statusSubmitting = ref(false);
const statusMessage = ref("");
const statusMessageType = ref<"success" | "error" | "">("");
let searchRequestId = 0;

const hasMore = computed(() => users.value.length < total.value);
const displayUsers = computed(() => {
  const term = search.value.trim().toLowerCase();
  if (!term) {
    return users.value;
  }
  return users.value.filter((user) => {
    const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
    return (
      user.email.toLowerCase().includes(term) ||
      fullName.includes(term) ||
      user.firstName.toLowerCase().includes(term) ||
      user.lastName.toLowerCase().includes(term)
    );
  });
});

async function loadUsers(reset = false) {
  loading.value = true;
  error.value = "";
  const targetPage = reset ? 1 : page.value;
  try {
    const response = await fetchUsers({
      search: search.value.trim() || undefined,
      page: targetPage,
      limit,
    });
    if (reset) {
      users.value = response.data;
    } else {
      users.value = [...users.value, ...response.data];
    }
    total.value = response.total;
    page.value = targetPage + 1;
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Failed to load users.";
  } finally {
    loading.value = false;
  }
}

function resetTempPanel() {
  activeUserId.value = null;
  tempPassword.value = "";
  tempMessage.value = "";
  tempMessageType.value = "";
}

function resetStatusState() {
  statusTargetId.value = null;
  statusMessage.value = "";
  statusMessageType.value = "";
}

async function searchUsers() {
  const requestId = ++searchRequestId;
  isSearching.value = true;
  error.value = "";
  try {
    const response = await fetchUsers({
      search: search.value.trim() || undefined,
      page: 1,
      limit,
    });
    if (requestId !== searchRequestId) {
      return;
    }
    users.value = response.data;
    total.value = response.total;
    page.value = 2;
  } catch (err) {
    if (requestId === searchRequestId) {
      error.value = err instanceof Error ? err.message : "Failed to load users.";
    }
  } finally {
    if (requestId === searchRequestId) {
      isSearching.value = false;
    }
  }
}

function handleSearch() {
  if (searchTimer !== undefined) {
    clearTimeout(searchTimer);
  }
  resetTempPanel();
  resetStatusState();
  page.value = 1;
  searchUsers();
}

function clearSearch() {
  search.value = "";
  handleSearch();
}

function toggleTempPanel(userId: string) {
  if (activeUserId.value === userId) {
    activeUserId.value = null;
    tempPassword.value = "";
    tempMessage.value = "";
    tempMessageType.value = "";
    return;
  }
  activeUserId.value = userId;
  tempPassword.value = "";
  showTempPassword.value = false;
  tempMessage.value = "";
  tempMessageType.value = "";
}

async function handleToggleActive(userId: string) {
  const target = users.value.find((item) => item.id === userId);
  if (!target) return;
  resetTempPanel();
  const isDeactivating = target.isActive;
  const confirmMessage = isDeactivating
    ? "Deactivate this user? They will be logged out and cannot sign in."
    : "Activate this user? They will be able to sign in again.";
  if (!window.confirm(confirmMessage)) {
    return;
  }
  statusSubmitting.value = true;
  statusTargetId.value = userId;
  statusMessage.value = "";
  statusMessageType.value = "";
  try {
    if (isDeactivating) {
      await deactivateUser(userId);
    } else {
      await activateUser(userId);
    }
    const index = users.value.findIndex((item) => item.id === userId);
    if (index >= 0) {
      users.value[index] = { ...users.value[index], isActive: !isDeactivating } as User;
    }
    statusMessage.value = isDeactivating
      ? "User deactivated successfully."
      : "User activated successfully.";
    statusMessageType.value = "success";
    if (isDeactivating && auth.user?.id === userId) {
      auth.logout();
      router.push("/login");
    }
  } catch (err) {
    statusMessage.value = err instanceof Error ? err.message : "Failed to update user status.";
    statusMessageType.value = "error";
  } finally {
    statusSubmitting.value = false;
  }
}

async function handleSetTemporaryPassword() {
  if (!activeUserId.value) return;
  const value = tempPassword.value.trim();
  if (!value) {
    tempMessage.value = "Enter a temporary password.";
    tempMessageType.value = "error";
    return;
  }
  tempSubmitting.value = true;
  tempMessage.value = "";
  tempMessageType.value = "";
  try {
    await setTemporaryPassword(activeUserId.value, value);
    const index = users.value.findIndex((item) => item.id === activeUserId.value);
    if (index >= 0) {
      users.value[index] = { ...users.value[index], mustChangePassword: true } as User;
    }
    tempMessage.value = "Temporary password set. User must change it on next login.";
    tempMessageType.value = "success";
    tempPassword.value = "";
  } catch (err) {
    tempMessage.value = err instanceof Error ? err.message : "Failed to set temporary password.";
    tempMessageType.value = "error";
  } finally {
    tempSubmitting.value = false;
  }
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

onMounted(() => loadUsers(true));

watch(search, () => {
  resetTempPanel();
  resetStatusState();
  if (searchTimer !== undefined) {
    clearTimeout(searchTimer);
  }
  isSearching.value = true;
  searchTimer = window.setTimeout(() => {
    searchUsers();
  }, 300);
});
</script>

<template>
  <div class="admin-shell">
    <header class="admin-header">
      <div>
        <div class="admin-title">User Directory</div>
        <div class="admin-subtitle">Manage users and reset passwords.</div>
      </div>
      <div class="admin-actions">
        <RouterLink class="ghost-button" to="/admin">Dashboard</RouterLink>
        <RouterLink class="primary-button" to="/calendar">Calendar</RouterLink>
      </div>
    </header>

    <section class="user-filters">
      <div class="filter-input">
        <label class="filter-label">
          Search
          <span v-if="isSearching" class="searching-indicator">
            Searching
            <span class="searching-dots">
              <span></span>
              <span></span>
              <span></span>
            </span>
          </span>
        </label>
        <input
          v-model="search"
          type="text"
          placeholder="Name or email"
          @keydown.enter="handleSearch"
        />
      </div>
      <div class="filter-actions">
        <button class="ghost-button" @click="handleSearch" :disabled="loading">
          {{ loading ? "Searching..." : "Search" }}
        </button>
        <button class="ghost-button" @click="clearSearch" :disabled="loading || !search">
          Clear
        </button>
      </div>
    </section>

    <p v-if="error" class="admin-error">{{ error }}</p>

    <section class="user-list">
      <div v-if="loading && users.length === 0" class="admin-loading">Loading users...</div>
      <div v-else-if="!isSearching && displayUsers.length === 0" class="panel-empty">
        No users found.
      </div>

      <article v-for="user in displayUsers" :key="user.id" class="user-card">
        <div class="user-main">
          <div class="user-name">{{ user.firstName }} {{ user.lastName }}</div>
          <div class="user-email">{{ user.email }}</div>
          <div class="user-date">Joined {{ formatDate(user.createdAt) }}</div>
        </div>
        <div class="user-meta">
          <span class="role-pill">{{ user.role }}</span>
          <span class="status-pill" :class="user.isActive ? 'is-active' : 'is-inactive'">
            {{ user.isActive ? "Active" : "Deactivated" }}
          </span>
          <span v-if="user.mustChangePassword" class="flag-pill">Must change</span>
        </div>
        <div class="user-actions">
          <button class="ghost-button" @click="toggleTempPanel(user.id)">
            {{ activeUserId === user.id ? "Close" : "Set temp password" }}
          </button>
          <button
            class="ghost-button"
            :class="user.isActive ? 'danger-button' : 'success-button'"
            :disabled="statusSubmitting && statusTargetId === user.id"
            @click="handleToggleActive(user.id)"
          >
            {{
              statusSubmitting && statusTargetId === user.id
                ? user.isActive
                  ? "Deactivating..."
                  : "Activating..."
                : user.isActive
                  ? "Deactivate"
                  : "Activate"
            }}
          </button>
        </div>

        <p
          v-if="statusTargetId === user.id && statusMessage"
          class="temp-message"
          :class="`message-${statusMessageType}`"
        >
          {{ statusMessage }}
        </p>

        <div v-if="activeUserId === user.id" class="temp-panel">
          <label class="temp-label">
            Temporary password
            <div class="temp-row">
              <input
                v-model="tempPassword"
                :type="showTempPassword ? 'text' : 'password'"
                placeholder="Enter temporary password"
              />
              <button
                type="button"
                class="ghost-button"
                @click="showTempPassword = !showTempPassword"
              >
                {{ showTempPassword ? "Hide" : "Show" }}
              </button>
            </div>
          </label>
          <p class="temp-help">This will force the user to change their password on next login.</p>
          <p v-if="tempMessage" class="temp-message" :class="`message-${tempMessageType}`">
            {{ tempMessage }}
          </p>
          <div class="temp-actions">
            <button
              class="primary-button"
              :disabled="tempSubmitting || !tempPassword.trim()"
              @click="handleSetTemporaryPassword"
            >
              {{ tempSubmitting ? "Setting..." : "Set temporary password" }}
            </button>
          </div>
        </div>
      </article>
    </section>

    <div class="load-more">
      <button class="ghost-button" v-if="hasMore && !loading && !isSearching" @click="loadUsers()">
        Load more
      </button>
    </div>
  </div>
</template>

<style scoped>
.admin-shell {
  max-width: 1100px;
  margin: 0 auto;
  padding: 28px 28px 40px;
  color: var(--ink);
}

.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.admin-title {
  font-family: var(--font-title);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  font-size: 18px;
}

.admin-subtitle {
  margin-top: 4px;
  font-size: 13px;
  letter-spacing: 0.04em;
  color: #6d6157;
}

.admin-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.primary-button,
.ghost-button {
  border-radius: 10px;
  padding: 8px 14px;
  font-size: 12px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  cursor: pointer;
  border: 1px solid transparent;
  font-family: var(--font-title);
}

.primary-button {
  background: #3c3a37;
  color: #f7f2ee;
}

.ghost-button {
  background: transparent;
  border-color: #d7cec6;
  color: #5b5149;
}

.danger-button {
  border-color: #e1b8b8;
  color: #b24c4c;
}

.danger-button:hover {
  border-color: #c98f8f;
  color: #8f2d2d;
}

.success-button {
  border-color: #cfe3d2;
  color: #2e3c2f;
}

.success-button:hover {
  border-color: #9fc7a6;
  color: #1f2c20;
}

.user-filters {
  margin-top: 20px;
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  align-items: flex-end;
}

.filter-input {
  display: grid;
  gap: 6px;
  min-width: 240px;
}

.filter-label {
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #7a6d63;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.filter-input input {
  border: 1px solid #d7cec6;
  background: #fffdfb;
  padding: 8px 12px;
  border-radius: 12px;
  font-family: inherit;
  font-size: 13px;
  color: var(--ink);
}

.filter-actions {
  display: flex;
  gap: 10px;
}

.searching-indicator {
  font-size: 10px;
  text-transform: none;
  letter-spacing: 0.02em;
  color: #8a7f75;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.searching-dots {
  display: inline-flex;
  gap: 4px;
  align-items: center;
}

.searching-dots span {
  width: 4px;
  height: 4px;
  border-radius: 999px;
  background: #8a7f75;
  opacity: 0.35;
  animation: pulseDot 1s infinite ease-in-out;
}

.searching-dots span:nth-child(2) {
  animation-delay: 0.2s;
}

.searching-dots span:nth-child(3) {
  animation-delay: 0.4s;
}

.user-list {
  margin-top: 22px;
  display: grid;
  gap: 14px;
}

.user-card {
  background: #ffffff;
  border-radius: 18px;
  padding: 16px;
  box-shadow: 0 10px 24px rgba(64, 52, 40, 0.1);
  display: grid;
  gap: 12px;
}

.user-main {
  display: grid;
  gap: 6px;
}

.user-name {
  font-size: 14px;
  font-weight: 600;
}

.user-email {
  font-size: 12px;
  color: #6d6157;
}

.user-date {
  font-size: 11px;
  color: #7a6d63;
}

.user-meta {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.role-pill,
.flag-pill {
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  border: 1px solid #d7cec6;
  color: #7a6d63;
}

.status-pill {
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  border: 1px solid #d7cec6;
  color: #7a6d63;
}

.status-pill.is-active {
  background: #edf5ee;
  color: #2e3c2f;
  border-color: #cfe3d2;
}

.status-pill.is-inactive {
  background: #f1d6d6;
  color: #6b2d2d;
  border-color: #e1b8b8;
}

.flag-pill {
  background: #f1d6d6;
  color: #6b2d2d;
  border-color: #e1b8b8;
}

.user-actions {
  display: flex;
  gap: 10px;
}

.temp-panel {
  border-top: 1px solid #efe7df;
  padding-top: 12px;
  display: grid;
  gap: 10px;
}

.temp-label {
  font-size: 12px;
  color: #6d6157;
  display: grid;
  gap: 6px;
}

.temp-row {
  display: flex;
  gap: 10px;
  align-items: center;
}

.temp-row input {
  flex: 1;
  border: 1px solid #d7cec6;
  border-radius: 12px;
  padding: 8px 12px;
  font-family: inherit;
  font-size: 12px;
  color: var(--ink);
}

.temp-help {
  font-size: 11px;
  color: #7a6d63;
}

.temp-message {
  font-size: 12px;
}

.message-success {
  color: #2e3c2f;
}

.message-error {
  color: #b24c4c;
}

.temp-actions {
  display: flex;
  justify-content: flex-end;
}

.panel-empty {
  font-size: 12px;
  color: #7a6d63;
  padding: 16px 10px;
  text-align: center;
}

.admin-loading {
  font-size: 12px;
  color: #7a6d63;
}

.admin-error {
  margin-top: 16px;
  color: #b24c4c;
  font-size: 12px;
}

.load-more {
  margin-top: 18px;
  display: flex;
  justify-content: center;
}

@keyframes pulseDot {
  0%,
  80%,
  100% {
    opacity: 0.35;
    transform: translateY(0);
  }
  40% {
    opacity: 1;
    transform: translateY(-3px);
  }
}

@media (max-width: 720px) {
  .admin-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .filter-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .temp-row {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
