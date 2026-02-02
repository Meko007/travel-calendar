<script setup lang="ts">
import { onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import {
  deleteNotification,
  fetchUserNotifications,
  markNotificationRead,
  type UserNotification,
} from "../lib/api";

const loading = ref(true);
const error = ref("");
const notifications = ref<UserNotification[]>([]);
const deletingId = ref<string | null>(null);

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

async function withTimeout<T>(promise: Promise<T>, ms: number) {
  let timeoutId: number | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(new Error("Request timed out"));
    }, ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
}

async function loadNotifications() {
  loading.value = true;
  error.value = "";
  try {
    notifications.value = await fetchUserNotifications({ page: 1, limit: 50 });
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Failed to load notifications.";
  } finally {
    loading.value = false;
  }
}

async function handleRead(note: UserNotification) {
  if (note.readAt) return;
  const previousReadAt = note.readAt;
  note.readAt = new Date().toISOString();
  try {
    await withTimeout(markNotificationRead(note.id), 8000);
  } catch (err) {
    note.readAt = previousReadAt ?? null;
    error.value = err instanceof Error ? err.message : "Failed to mark as read.";
  }
}

async function handleDelete(note: UserNotification) {
  if (!window.confirm("Delete this notification?")) {
    return;
  }
  deletingId.value = note.id;
  error.value = "";
  try {
    await withTimeout(deleteNotification(note.id), 8000);
    notifications.value = notifications.value.filter((item) => item.id !== note.id);
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Failed to delete notification.";
  } finally {
    deletingId.value = null;
  }
}

onMounted(loadNotifications);
</script>

<template>
  <div class="notify-shell">
    <header class="notify-header">
      <div>
        <div class="notify-title">Your Notifications</div>
        <div class="notify-subtitle">Trip approvals and rejections.</div>
      </div>
      <div class="notify-actions">
        <RouterLink class="ghost-button" to="/calendar">Calendar</RouterLink>
      </div>
    </header>

    <p v-if="error" class="notify-error">{{ error }}</p>
    <div v-if="loading" class="notify-loading">Loading notifications...</div>

    <section v-else class="notify-list">
      <article
        v-for="note in notifications"
        :key="note.id"
        class="notify-card"
        :class="note.readAt ? 'is-read' : 'is-unread'"
      >
        <div class="notify-top">
          <div>
            <div class="notify-status" :class="note.type === 'TRIP_APPROVED' ? 'is-approved' : 'is-rejected'">
              {{ note.type === "TRIP_APPROVED" ? "Approved" : "Rejected" }}
            </div>
            <div class="notify-destination">{{ note.trip.destination }}</div>
            <div class="notify-meta">{{ formatDate(note.createdAt) }}</div>
          </div>
          <span class="notify-badge" :class="note.readAt ? 'is-read' : 'is-unread'">
            {{ note.readAt ? "Read" : "Unread" }}
          </span>
        </div>
        <div class="notify-body">
          <p>{{ note.message }}</p>
          <div v-if="note.type === 'TRIP_REJECTED'" class="notify-reason">
            Reason: <strong>{{ note.reason || note.trip.rejectionReason || "No reason provided" }}</strong>
          </div>
          <div class="notify-row">
            <span>Outbound</span>
            <strong>{{ note.trip.tripDateTime.split("T")[0] }}</strong>
          </div>
          <div class="notify-row">
            <span>Return</span>
            <strong>{{ note.trip.returnTripDateTime.split("T")[0] }}</strong>
          </div>
        </div>
        <div class="notify-actions-row">
          <button
            class="ghost-button"
            type="button"
            :disabled="!!note.readAt"
            @click="handleRead(note)"
          >
            {{ note.readAt ? "Read" : "Mark read" }}
          </button>
          <button
            class="ghost-button danger-button"
            type="button"
            :disabled="deletingId === note.id"
            @click="handleDelete(note)"
          >
            {{ deletingId === note.id ? "Deleting..." : "Delete" }}
          </button>
          <RouterLink
            v-if="note.type === 'TRIP_REJECTED'"
            class="primary-button"
            :to="`/trips/${note.tripId}/resubmit`"
          >
            Update & resubmit
          </RouterLink>
        </div>
      </article>

      <div v-if="notifications.length === 0" class="notify-empty">
        No notifications yet.
      </div>
    </section>
  </div>
</template>

<style scoped>
.notify-shell {
  max-width: 1100px;
  margin: 0 auto;
  padding: 28px 28px 40px;
  color: var(--ink);
}

.notify-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.notify-title {
  font-family: var(--font-title);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  font-size: 18px;
}

.notify-subtitle {
  margin-top: 4px;
  font-size: 13px;
  letter-spacing: 0.04em;
  color: #6d6157;
}

.notify-actions {
  display: flex;
  gap: 10px;
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

.notify-list {
  margin-top: 18px;
  display: grid;
  gap: 12px;
}

.notify-card {
  background: #ffffff;
  border-radius: 18px;
  padding: 16px 18px;
  box-shadow: 0 10px 24px rgba(64, 52, 40, 0.08);
  display: grid;
  gap: 10px;
}

.notify-card.is-unread {
  border: 1px solid #3c3a37;
  background: #fff7f0;
  box-shadow: 0 12px 28px rgba(64, 52, 40, 0.12);
}

.notify-card.is-read {
  opacity: 0.9;
}

.notify-top {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.notify-destination {
  font-weight: 600;
  letter-spacing: 0.06em;
}

.notify-status {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.notify-status.is-approved {
  color: #2e3c2f;
}

.notify-status.is-rejected {
  color: #6b2d2d;
}

.notify-meta {
  font-size: 12px;
  color: #7a6d63;
  margin-top: 4px;
}

.notify-badge {
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  border: 1px solid #d7cec6;
  color: #7a6d63;
}

.notify-badge.is-unread {
  background: #3c3a37;
  color: #f7f2ee;
  border-color: #3c3a37;
}

.notify-body {
  display: grid;
  gap: 8px;
  font-size: 12px;
  color: #6d6157;
}

.notify-body p {
  margin: 0;
}

.notify-row {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.notify-row strong {
  color: var(--ink);
  font-weight: 600;
}

.notify-reason {
  font-size: 12px;
  color: #6b2d2d;
}

.notify-actions-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.notify-empty {
  text-align: center;
  font-size: 12px;
  color: #7a6d63;
  padding: 16px;
}

.notify-loading {
  margin-top: 18px;
  font-size: 12px;
  color: #7a6d63;
}

.notify-error {
  margin-top: 16px;
  color: #b24c4c;
  font-size: 12px;
}

@media (max-width: 720px) {
  .notify-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
