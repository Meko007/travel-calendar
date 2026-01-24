<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter, RouterLink } from "vue-router";
import MonthlyCalendar from "../components/MonthlyCalendar.vue";
import { useAuthStore } from "../stores/auth";
import { fetchUserNotifications } from "../lib/api";

const today = new Date();
const selectedYear = ref(today.getFullYear());
const selectedMonth = ref(today.getMonth() + 1);
const auth = useAuthStore();
const router = useRouter();
const unreadCount = ref(0);

const selectedMonthInput = computed({
  get() {
    return `${selectedYear.value}-${String(selectedMonth.value).padStart(2, "0")}`;
  },
  set(value: string) {
    if (!value) {
      return;
    }
    const [year, month] = value.split("-").map(Number);
    if (year !== undefined && month !== undefined && !Number.isNaN(year) && !Number.isNaN(month)) {
      selectedYear.value = year;
      selectedMonth.value = month;
    }
  },
});

function goToPrevMonth() {
  if (selectedMonth.value === 1) {
    selectedMonth.value = 12;
    selectedYear.value -= 1;
  } else {
    selectedMonth.value -= 1;
  }
}

function goToNextMonth() {
  if (selectedMonth.value === 12) {
    selectedMonth.value = 1;
    selectedYear.value += 1;
  } else {
    selectedMonth.value += 1;
  }
}

const greetingName = computed(() => {
  const raw =
    auth.user?.firstName ||
    auth.user?.name ||
    auth.user?.email ||
    "";
  if (!raw) {
    return "there";
  }
  if (raw.includes("@")) {
    return raw.split("@")[0];
  }
  return raw.split(" ")[0];
});

function handleLogout() {
  auth.logout();
  router.push("/login");
}

async function loadUnreadNotifications() {
  if (auth.isAdmin) {
    unreadCount.value = 0;
    return;
  }
  try {
    const notes = await fetchUserNotifications({ unread: true, page: 1, limit: 200 });
    unreadCount.value = notes.length;
  } catch (err) {
    unreadCount.value = 0;
  }
}

onMounted(() => {
  loadUnreadNotifications();
});
</script>

<template>
  <div class="calendar-shell">
    <div class="calendar-topbar">
      <div class="greeting-block">
        <div class="greeting">Hi, <span>{{ greetingName }}</span></div>
        <button type="button" class="nav-button logout-button" @click="handleLogout">
          Logout
        </button>
      </div>
      <div class="topbar-actions">
        <RouterLink v-if="!auth.isAdmin" class="nav-button notify-button" to="/notifications">
          Notifications
          <span v-if="unreadCount > 0" class="notify-badge">{{ unreadCount }}</span>
        </RouterLink>
        <RouterLink v-if="auth.isAdmin" class="nav-button" to="/admin">
          Admin
        </RouterLink>
      </div>
    </div>

    <div class="month-controls">
      <button type="button" class="nav-button" @click="goToPrevMonth">
        Prev
      </button>
      <label class="month-picker">
        <span>Month</span>
        <input type="month" v-model="selectedMonthInput" />
      </label>
      <button type="button" class="nav-button" @click="goToNextMonth">
        Next
      </button>
    </div>

    <MonthlyCalendar :year="selectedYear" :month="selectedMonth" />
  </div>
</template>

<style scoped>
.calendar-shell {
  padding-top: 12px;
}

.calendar-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 28px;
  margin-bottom: 8px;
  color: var(--ink);
}

.topbar-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.greeting-block {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}

.greeting {
  font-family: var(--font-title);
  font-size: 14px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.greeting span {
  font-weight: 600;
}

.month-controls {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding: 0 28px;
  margin-bottom: 12px;
  color: var(--ink);
}

.month-picker {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.month-picker input {
  border: 1px solid #d7cec6;
  background: #fffdfb;
  padding: 6px 10px;
  border-radius: 10px;
  font-family: var(--font-title);
  font-size: 12px;
  color: var(--ink);
}

.nav-button {
  border: 1px solid #d7cec6;
  background: #fffdfb;
  padding: 6px 12px;
  border-radius: 10px;
  font-family: var(--font-title);
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
}

.notify-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.notify-badge {
  min-width: 18px;
  height: 18px;
  padding: 0 6px;
  border-radius: 999px;
  background: #3c3a37;
  color: #f7f2ee;
  font-size: 10px;
  line-height: 18px;
  text-align: center;
  font-weight: 600;
}

.nav-button:hover {
  border-color: #c8b9ae;
}

@media (max-width: 700px) {
  .calendar-topbar {
    flex-direction: column;
    align-items: flex-start;
  }

  .topbar-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .month-controls {
    justify-content: center;
    flex-wrap: wrap;
  }
}
</style>
