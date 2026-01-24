<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import { fetchAdminTrips, type AdminTrip } from "../lib/api";
import { useAuthStore } from "../stores/auth";

const auth = useAuthStore();
const loading = ref(true);
const error = ref("");
const pendingTrips = ref<AdminTrip[]>([]);

const greetingName = computed(() => {
  const raw =
    auth.user?.firstName ||
    auth.user?.name ||
    auth.user?.email ||
    "";
  if (!raw) {
    return "Admin";
  }
  if (raw.includes("@")) {
    return raw.split("@")[0];
  }
  return raw.split(" ")[0];
});

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

async function loadDashboard() {
  loading.value = true;
  error.value = "";
  try {
    pendingTrips.value = await fetchAdminTrips({ status: "PENDING", page: 1, limit: 6 });
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Failed to load admin dashboard.";
  } finally {
    loading.value = false;
  }
}

onMounted(loadDashboard);
</script>

<template>
  <div class="admin-shell">
    <header class="admin-header">
      <div>
        <div class="admin-title">Admin Dashboard</div>
        <div class="admin-subtitle">Welcome back, {{ greetingName }}.</div>
      </div>
      <div class="admin-actions">
        <RouterLink class="primary-button" to="/calendar">Calendar</RouterLink>
      </div>
    </header>

    <section class="admin-stats">
      <div class="stat-card">
        <div class="stat-label">Pending trips</div>
        <div class="stat-value">{{ pendingTrips.length }}</div>
      </div>
    </section>

    <p v-if="error" class="admin-error">{{ error }}</p>

    <section class="admin-grid" v-if="!loading">
      <div class="panel">
        <div class="panel-header">
          <h2>Pending approvals</h2>
        </div>
        <div v-if="pendingTrips.length === 0" class="panel-empty">
          No pending trips right now.
        </div>
        <div v-else class="panel-list">
          <article v-for="trip in pendingTrips" :key="trip.id" class="panel-card">
            <div class="panel-top">
              <div class="panel-title">{{ trip.destination }}</div>
              <div class="panel-meta">{{ formatDate(trip.tripDateTime) }}</div>
            </div>
            <div class="panel-body">
              <div class="panel-row">
                <span>Traveler</span>
                <strong>{{ trip.user.firstName }} {{ trip.user.lastName }}</strong>
              </div>
              <div class="panel-row">
                <span>Return</span>
                <strong>{{ formatDate(trip.returnTripDateTime) }}</strong>
              </div>
            </div>
            <RouterLink class="panel-action" :to="`/admin/trips/${trip.id}`">Review</RouterLink>
          </article>
        </div>
      </div>

    </section>

    <div v-if="loading" class="admin-loading">Loading dashboard...</div>
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

.admin-stats {
  margin-top: 22px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.stat-card {
  background: #fffdfb;
  border-radius: 16px;
  padding: 14px 16px;
  box-shadow: 0 8px 20px rgba(64, 52, 40, 0.08);
}

.stat-label {
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #7a6d63;
}

.stat-value {
  font-size: 22px;
  font-weight: 600;
  margin-top: 8px;
}

.admin-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 18px;
  margin-top: 22px;
}

.panel {
  background: #ffffff;
  border-radius: 20px;
  padding: 18px;
  box-shadow: 0 10px 24px rgba(64, 52, 40, 0.1);
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 320px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
}

.panel-header h2 {
  margin: 0;
  font-size: 14px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-family: var(--font-title);
}

.panel-link {
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #6d6157;
}

.panel-list {
  display: grid;
  gap: 12px;
}

.panel-card {
  border: 1px solid #efe7df;
  border-radius: 16px;
  padding: 12px 14px;
  display: grid;
  gap: 8px;
}

.panel-top {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
  letter-spacing: 0.04em;
}

.panel-title {
  font-weight: 600;
}

.panel-meta {
  color: #7a6d63;
}

.panel-body {
  display: grid;
  gap: 6px;
  font-size: 12px;
}

.panel-row {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  color: #6d6157;
}

.panel-row strong {
  color: var(--ink);
  font-weight: 600;
}

.panel-action {
  justify-self: flex-start;
  border-radius: 999px;
  border: 1px solid #d7cec6;
  padding: 6px 12px;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #5b5149;
}

.panel-empty {
  font-size: 12px;
  color: #7a6d63;
  padding: 16px 10px;
  text-align: center;
}

.admin-loading {
  margin-top: 20px;
  font-size: 12px;
  color: #7a6d63;
}

.admin-error {
  margin-top: 16px;
  color: #b24c4c;
  font-size: 12px;
}

@media (max-width: 720px) {
  .admin-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .admin-actions {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>
