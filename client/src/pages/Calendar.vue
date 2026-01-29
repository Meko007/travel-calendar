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
const menuOpen = ref(false);

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

function toggleMenu() {
  menuOpen.value = !menuOpen.value;
}

function closeMenu() {
  menuOpen.value = false;
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
      </div>
      <div class="menu-wrap">
        <button type="button" class="menu-toggle" @click="toggleMenu" aria-label="Toggle menu">
          &#9776;
        </button>
        <nav class="topbar-actions" :class="{ 'is-open': menuOpen }">
          <RouterLink
            v-if="!auth.isAdmin"
            class="nav-button notify-button"
            to="/notifications"
            @click="closeMenu"
          >
            Notifications
            <span v-if="unreadCount > 0" class="notify-badge">{{ unreadCount }}</span>
          </RouterLink>
        <RouterLink v-if="auth.isAdmin" class="nav-button" to="/admin" @click="closeMenu">
          Admin
        </RouterLink>
        <button type="button" class="nav-button logout-button" @click="handleLogout">
          Logout
        </button>
        </nav>
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
  position: relative;
}

.topbar-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.menu-wrap {
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

.logout-button {
  color: #b00020;
  border-color: #b00020;
}

.logout-button:hover {
  color: #fff5f5;
  background: #b00020;
  border-color: #8a0018;
}

.nav-button:hover {
  border-color: #c8b9ae;
}

.menu-toggle {
  display: none;
  background: transparent;
  border: 1px solid #d7cec6;
  border-radius: 10px;
  padding: 6px 10px;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  color: #3c3a37;
}

@media (max-width: 700px) {
  .calendar-topbar {
    align-items: flex-start;
  }

  .menu-wrap {
    margin-left: auto;
    position: relative;
  }

  .topbar-actions {
    position: absolute;
    top: 100%;
    right: 0;
    flex-direction: column;
    align-items: stretch;
    background: #fffdfb;
    border: 1px solid #d7cec6;
    border-radius: 12px;
    padding: 10px;
    box-shadow: 0 12px 24px rgba(60, 58, 55, 0.12);
    margin-top: 6px;
    opacity: 0;
    pointer-events: none;
    transform: translateY(6px);
    transition: opacity 0.2s ease, transform 0.2s ease;
    z-index: 5;
    min-width: 180px;
    text-align: left;
  }

  .topbar-actions.is-open {
    opacity: 1;
    pointer-events: auto;
    transform: translateY(0);
  }

  .menu-toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 32px;
  }

  .topbar-actions .nav-button {
    display: flex;
    justify-content: center;
    width: 100%;
    text-align: center;
  }

  .nav-button {
    width: 100%;
  }

  .month-controls {
    justify-content: center;
    flex-wrap: wrap;
  }
}
</style>
