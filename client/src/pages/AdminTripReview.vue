<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, RouterLink, useRouter } from "vue-router";
import { approveTrip, fetchAdminTrips, rejectTrip, type AdminTrip, type TripStatus } from "../lib/api";

const route = useRoute();
const router = useRouter();
const trip = ref<AdminTrip | null>(null);
const loading = ref(true);
const error = ref("");
const submitting = ref(false);
const rejectReason = ref("");
const activeAction = ref<"approve" | "reject" | "">("");

const tripId = computed(() => route.params.id as string);

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

async function fetchTripByStatus(status: TripStatus) {
  const list = await fetchAdminTrips({ status, page: 1, limit: 100 });
  return list.find((item) => item.id === tripId.value) ?? null;
}

async function refreshTrip() {
  const statuses: TripStatus[] = ["PENDING", "APPROVED", "REJECTED"];
  for (const status of statuses) {
    const match = await fetchTripByStatus(status);
    if (match) {
      trip.value = match;
      rejectReason.value = "";
      return true;
    }
  }
  return false;
}

async function loadTrip() {
  loading.value = true;
  error.value = "";
  try {
    const found = await refreshTrip();
    if (!found) {
      error.value = "Trip not found. It may have been resolved already.";
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Failed to load trip.";
  } finally {
    loading.value = false;
  }
}

async function handleApprove() {
  if (!trip.value) return;
  const previous = trip.value;
  const previousUser = trip.value.user;
  submitting.value = true;
  activeAction.value = "approve";
  error.value = "";
  trip.value = { ...trip.value, status: "APPROVED", rejectionReason: null };
  try {
    const updated = await withTimeout(approveTrip(previous.id), 8000);
    trip.value = { ...previous, ...updated, user: previousUser };
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Failed to approve trip.";
    await refreshTrip();
  } finally {
    submitting.value = false;
    activeAction.value = "";
  }
}

async function handleReject() {
  if (!trip.value) return;
  if (!rejectReason.value.trim()) {
    error.value = "Please provide a rejection reason.";
    return;
  }
  const previous = trip.value;
  const previousUser = trip.value.user;
  submitting.value = true;
  activeAction.value = "reject";
  error.value = "";
  trip.value = {
    ...trip.value,
    status: "REJECTED",
    rejectionReason: rejectReason.value.trim(),
  };
  try {
    const updated = await withTimeout(rejectTrip(previous.id, rejectReason.value.trim()), 8000);
    trip.value = { ...previous, ...updated, user: previousUser };
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Failed to reject trip.";
    await refreshTrip();
  } finally {
    submitting.value = false;
    activeAction.value = "";
  }
}

function returnToDashboard() {
  router.push("/admin");
}

onMounted(loadTrip);
</script>

<template>
  <div class="review-shell">
    <header class="review-header">
      <div>
        <div class="review-title">Trip Review</div>
        <div class="review-subtitle">Approve or reject a pending trip.</div>
      </div>
      <div class="review-actions">
        <RouterLink class="ghost-button" to="/admin">Dashboard</RouterLink>
        <RouterLink class="primary-button" to="/calendar">Calendar</RouterLink>
      </div>
    </header>

    <p v-if="error" class="review-error">{{ error }}</p>
    <div v-if="loading" class="review-loading">Loading trip...</div>

    <section v-else-if="trip" class="review-card">
      <div class="review-row">
        <span>Destination</span>
        <strong>{{ trip.destination }}</strong>
      </div>
      <div class="review-row">
        <span>Traveler</span>
        <strong>{{ trip.user.firstName }} {{ trip.user.lastName }}</strong>
      </div>
      <div class="review-row">
        <span>Outbound</span>
        <strong>{{ formatDate(trip.tripDateTime) }}</strong>
      </div>
      <div class="review-row">
        <span>Return</span>
        <strong>{{ formatDate(trip.returnTripDateTime) }}</strong>
      </div>
      <div class="review-row">
        <span>Mode</span>
        <strong>{{ trip.mode }}</strong>
      </div>
      <div class="review-row">
        <span>Status</span>
        <strong class="status-pill" :class="`status-${trip.status.toLowerCase()}`">
          {{ trip.status }}
        </strong>
      </div>

      <div v-if="trip.status === 'PENDING'" class="review-field">
        <label>
          <span>Rejection reason (required if rejecting)</span>
          <textarea v-model="rejectReason" rows="3" placeholder="Give a clear reason for rejection."></textarea>
        </label>
      </div>

      <div v-if="trip.status === 'PENDING'" class="review-controls">
        <button class="ghost-button" :disabled="submitting || !rejectReason.trim()" @click="handleReject">
          {{ submitting && activeAction === "reject" ? "Working..." : "Reject" }}
        </button>
        <button class="primary-button" :disabled="submitting" @click="handleApprove">
          {{ submitting && activeAction === "approve" ? "Working..." : "Approve" }}
        </button>
      </div>

      <div v-else class="review-controls">
        <button class="ghost-button" @click="returnToDashboard">Back to dashboard</button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.review-shell {
  max-width: 980px;
  margin: 0 auto;
  padding: 28px 28px 40px;
  color: var(--ink);
}

.review-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.review-title {
  font-family: var(--font-title);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  font-size: 18px;
}

.review-subtitle {
  margin-top: 4px;
  font-size: 13px;
  letter-spacing: 0.04em;
  color: #6d6157;
}

.review-actions {
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

.review-card {
  margin-top: 20px;
  background: #ffffff;
  border-radius: 20px;
  padding: 22px;
  box-shadow: 0 12px 30px rgba(64, 52, 40, 0.12);
  display: grid;
  gap: 14px;
}

.review-row {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  font-size: 13px;
  letter-spacing: 0.04em;
  color: #6d6157;
}

.review-row strong {
  color: var(--ink);
  font-weight: 600;
}

.status-pill {
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  border: 1px solid #d7cec6;
  color: #7a6d63;
}

.status-pending {
  background: #efe7df;
  color: #3c3a37;
}

.status-approved {
  background: #dfe8d9;
  color: #2e3c2f;
}

.status-rejected {
  background: #f1d6d6;
  color: #6b2d2d;
}

.review-controls {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 6px;
}

.review-field {
  display: grid;
  gap: 8px;
  font-size: 12px;
  color: #6d6157;
}

.review-field span {
  display: block;
  margin-bottom: 6px;
  letter-spacing: 0.04em;
}

.review-field textarea {
  width: 100%;
  border: 1px solid #d7cec6;
  border-radius: 12px;
  padding: 10px 12px;
  font-family: inherit;
  font-size: 12px;
  color: var(--ink);
  resize: vertical;
}

.review-loading {
  margin-top: 18px;
  font-size: 12px;
  color: #7a6d63;
}

.review-error {
  margin-top: 16px;
  color: #b24c4c;
  font-size: 12px;
}

@media (max-width: 720px) {
  .review-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .review-row {
    flex-direction: column;
  }
}
</style>
