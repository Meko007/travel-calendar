<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { createTrip, fetchAdminTrips, fetchTrips, type AdminTrip, type ModeType, type TripStatus } from "../lib/api";
import { useAuthStore } from "../stores/auth";

type Props = {
  year: number; // e.g. 2026
  month: number; // 1-12
};

type DayDecor = {
  tone?: "lavender" | "sand" | "sky" | "rose";
  note?: string;
};

const props = defineProps<Props>();
const emit = defineEmits<{
  (event: "bookingCreated"): void;
}>();

const auth = useAuthStore();

type CalendarTrip = {
  id: string;
  destination: string;
  tripDateTime: string;
  returnTripDateTime: string;
  mode: ModeType;
  returnMode?: ModeType | null;
  status: TripStatus;
  rejectionReason?: string | null;
  user?: AdminTrip["user"];
};

const trips = ref<CalendarTrip[]>([]);
const tripsLoading = ref(false);
const tripsError = ref("");

const monthName = computed(() =>
  new Date(props.year, props.month - 1, 1)
    .toLocaleString(undefined, { month: "long" })
    .toUpperCase()
);

const daysOfWeek = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

const dayDecorations: Record<number, DayDecor> = {
  1: { tone: "lavender" },
  9: { tone: "sand" },
  11: { tone: "sky" },
  13: { tone: "rose" },
  17: { tone: "lavender" },
  21: { tone: "sky" },
  30: { tone: "rose" },
};

const today = new Date();
today.setHours(0, 0, 0, 0);

function toDateKeyFromDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toDateKeyFromTrip(raw: string) {
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return raw.split("T")[0];
  }
  return toDateKeyFromDate(date);
}

function summarizeTrips(items: CalendarTrip[]) {
  if (items.length === 0) {
    return "";
  }
  const destinations = Array.from(new Set(items.map((trip) => trip.destination)));
  if (destinations.length === 1) {
    return items.length === 1 ? destinations[0] : `${destinations[0]} +${items.length - 1}`;
  }
  return `${destinations[0]} +${destinations.length - 1}`;
}

const monthTrips = computed(() =>
  trips.value.filter((trip) => {
    const date = new Date(trip.tripDateTime);
    if (Number.isNaN(date.getTime())) {
      return false;
    }
    return date.getFullYear() === props.year && date.getMonth() + 1 === props.month;
  })
);

const tripsByDate = computed(() => {
  const map: Record<string, CalendarTrip[]> = {};
  for (const trip of monthTrips.value) {
    const key = toDateKeyFromTrip(trip.tripDateTime);
    const k = String(key);
    if (!map[k]) {
      map[k] = [];
    }
    map[k].push(trip);
  }
  return map;
});

const isFormOpen = ref(false);
const selectedDate = ref<Date | null>(null);
const formState = reactive({
  modeOfTravel: "",
  timeHour: "",
  timeMinute: "",
  timeMeridiem: "",
  destination: "",
  returnDate: "",
  returnHour: "",
  returnMinute: "",
  returnMeridiem: "",
  returnModeOfTravel: "",
});
const submitError = ref("");
const isSubmitting = ref(false);
const successMessage = ref("");

function daysInMonth(year: number, month1to12: number) {
  return new Date(year, month1to12, 0).getDate();
}

function startDayIndex(year: number, month1to12: number) {
  // 0=Sun...6=Sat
  return new Date(year, month1to12 - 1, 1).getDay();
}

function getPrevMonth(year: number, month1to12: number) {
  if (month1to12 === 1) {
    return { year: year - 1, month: 12 };
  }
  return { year, month: month1to12 - 1 };
}

function getNextMonth(year: number, month1to12: number) {
  if (month1to12 === 12) {
    return { year: year + 1, month: 1 };
  }
  return { year, month: month1to12 + 1 };
}

const cells = computed(() => {
  const dim = daysInMonth(props.year, props.month);
  const start = startDayIndex(props.year, props.month);
  const weeks = Math.ceil((start + dim) / 7);
  const totalCells = weeks * 7;
  const prev = getPrevMonth(props.year, props.month);
  const next = getNextMonth(props.year, props.month);
  const prevDim = daysInMonth(prev.year, prev.month);

  const arr: {
    day: number;
    inMonth: boolean;
    decor?: DayDecor;
    date: Date;
    isBookable: boolean;
    tripSummary?: string;
    tripCount?: number;
  }[] = [];
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - start + 1;
    let day = dayNum;
    let inMonth = true;
    let cellYear = props.year;
    let cellMonth = props.month;

    if (dayNum < 1) {
      day = prevDim + dayNum;
      inMonth = false;
      cellYear = prev.year;
      cellMonth = prev.month;
    } else if (dayNum > dim) {
      day = dayNum - dim;
      inMonth = false;
      cellYear = next.year;
      cellMonth = next.month;
    }

    const date = new Date(cellYear, cellMonth - 1, day);
    const isBookable = inMonth && date >= today;
    const decor = inMonth ? dayDecorations[day] : undefined;
    const tripKey = toDateKeyFromDate(date);
    const dayTrips = tripsByDate.value[tripKey] ?? [];
    const tripSummary = summarizeTrips(dayTrips);
    arr.push({ day, inMonth, decor, date, isBookable, tripSummary, tripCount: dayTrips.length });
  }
  return arr;
});

function formatDay(day: number) {
  return String(day).padStart(2, "0");
}

const selectedDateLabel = computed(() => {
  if (!selectedDate.value) {
    return "";
  }
  return selectedDate.value.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
});

const selectedDateKey = computed(() => (selectedDate.value ? formatIsoDate(selectedDate.value) : ""));

const selectedTrips = computed(() => {
  if (!selectedDate.value) {
    return [];
  }
  return tripsByDate.value[selectedDateKey.value] ?? [];
});

const canBookSelected = computed(() => !!selectedDate.value && selectedDate.value >= today);

function openForm(date: Date) {
  selectedDate.value = date;
  formState.modeOfTravel = "";
  formState.timeHour = "";
  formState.timeMinute = "";
  formState.timeMeridiem = "";
  formState.destination = "";
  formState.returnDate = "";
  formState.returnHour = "";
  formState.returnMinute = "";
  formState.returnMeridiem = "";
  formState.returnModeOfTravel = "";
  submitError.value = "";
  isFormOpen.value = true;
}

function closeForm() {
  isFormOpen.value = false;
}

function openFormForSelected() {
  if (!selectedDate.value) {
    return;
  }
  openForm(selectedDate.value);
}

function clearSelectedDate() {
  selectedDate.value = null;
}

function handleDayClick(cell: (typeof cells)["value"][number]) {
  if (!cell.inMonth) {
    return;
  }
  if (selectedDate.value && formatIsoDate(selectedDate.value) === formatIsoDate(cell.date)) {
    selectedDate.value = null;
    return;
  }
  selectedDate.value = cell.date;
}

function formatIsoDate(date: Date) {
  return toDateKeyFromDate(date);
}

function formatDateTime(dateStr: string) {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) {
    return dateStr;
  }
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const hourOptions = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
const minuteOptions = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));
const meridiemOptions = ["AM", "PM"];

function normalizeTimeTo24Hour(hours: string, minutes: string, meridiem: string) {
  if (!hours || !minutes || !meridiem) {
    return "";
  }
  const parsedHours = Number(hours);
  const parsedMinutes = Number(minutes);

  if (parsedHours < 1 || parsedHours > 12 || parsedMinutes > 59) {
    return "";
  }

  let normalizedHours = parsedHours % 12;
  if (meridiem === "PM") {
    normalizedHours += 12;
  }

  return `${String(normalizedHours).padStart(2, "0")}:${String(parsedMinutes).padStart(2, "0")}`;
}

function buildLocalDateTime(dateStr: string, time24: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hours, minutes] = time24.split(":").map(Number);
  if (
    !year ||
    !month ||
    !day ||
    Number.isNaN(hours) ||
    Number.isNaN(minutes)
  ) {
    return null;
  }
  return new Date(year, month - 1, day, hours, minutes, 0, 0);
}

async function loadTrips() {
  tripsLoading.value = true;
  tripsError.value = "";
  try {
    if (auth.isAdmin) {
      const data = await fetchAdminTrips({ status: "APPROVED", page: 1, limit: 500 });
      trips.value = data;
    } else {
      const data = await fetchTrips({ status: "APPROVED", page: 1, limit: 500 });
      trips.value = data;
    }
  } catch (error) {
    tripsError.value =
      error instanceof Error ? error.message : "Unable to load approved trips.";
  } finally {
    tripsLoading.value = false;
  }
}

onMounted(loadTrips);
watch(
  () => [props.year, props.month, auth.isAdmin],
  () => {
    loadTrips();
  }
);

watch(
  formState,
  () => {
    if (submitError.value) {
      submitError.value = "";
    }
  },
  { deep: true }
);

async function submitBooking() {
  if (!selectedDate.value) {
    return;
  }
  submitError.value = "";
  isSubmitting.value = true;
  try {
    const isoDate = formatIsoDate(selectedDate.value);
    if (!isoDate) {
      submitError.value = "Invalid date format";
      return;
    }
    const outboundTime = normalizeTimeTo24Hour(
      formState.timeHour,
      formState.timeMinute,
      formState.timeMeridiem
    );
    if (!outboundTime) {
      submitError.value = "Please select a departure time.";
      return;
    }

    if (!formState.returnDate || !formState.returnHour || !formState.returnMinute || !formState.returnMeridiem) {
      submitError.value = "Please provide a return date and time.";
      return;
    }
    if (formState.returnDate < isoDate) {
      submitError.value = "Return date must be on or after the departure date.";
      return;
    }

    const returnTimeNormalized = normalizeTimeTo24Hour(
      formState.returnHour,
      formState.returnMinute,
      formState.returnMeridiem
    );
    if (!returnTimeNormalized) {
      submitError.value = "Please select a return time.";
      return;
    }

    const now = new Date();
    const outboundDateTime = buildLocalDateTime(isoDate, outboundTime);
    if (!outboundDateTime) {
      submitError.value = "Invalid departure date/time.";
      return;
    }
    if (outboundDateTime < now) {
      submitError.value = "Departure time has already passed.";
      return;
    }

    const returnDateTime = buildLocalDateTime(formState.returnDate, returnTimeNormalized);
    if (!returnDateTime) {
      submitError.value = "Invalid return date/time.";
      return;
    }
    if (returnDateTime < now) {
      submitError.value = "Return time has already passed.";
      return;
    }
    if (returnDateTime < outboundDateTime) {
      submitError.value = "Return time must be on or after the departure time.";
      return;
    }

    await createTrip({
      destination: formState.destination,
      tripDateTime: `${isoDate}T${outboundTime}:00`,
      returnTripDateTime: `${formState.returnDate}T${returnTimeNormalized}:00`,
      mode: formState.modeOfTravel as "LAND" | "AIR" | "SEA",
      returnMode: (formState.returnModeOfTravel || formState.modeOfTravel) as
        | "LAND"
        | "AIR"
        | "SEA",
    });

    isFormOpen.value = false;
    successMessage.value = "Trip sent for approval.";
    setTimeout(() => {
      successMessage.value = "";
    }, 2400);
    emit("bookingCreated");
  } catch (error) {
    submitError.value =
      error instanceof Error ? error.message : "Unable to submit booking.";
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <section class="calendar-page">
    <header class="calendar-header">
      <div class="brand">
        <svg class="brand-mark" viewBox="0 0 64 64" aria-hidden="true">
          <circle cx="32" cy="10" r="9" />
          <circle cx="50" cy="22" r="9" />
          <circle cx="50" cy="42" r="9" />
          <circle cx="32" cy="54" r="9" />
          <circle cx="14" cy="42" r="9" />
          <circle cx="14" cy="22" r="9" />
          <circle cx="32" cy="32" r="6" />
        </svg>
        <div class="brand-name">OILDATA</div>
      </div>

      <div class="month-block">
        <div class="month">{{ monthName }}</div>
        <div class="year">{{ year }}</div>
      </div>

      <div class="calendar-title">Monthly Travels Calendar</div>
    </header>

    <div class="calendar-body">
      <div class="calendar-grid">
        <div class="weekday-row">
          <div v-for="d in daysOfWeek" :key="d" class="weekday-cell">{{ d }}</div>
        </div>

        <div class="days-grid">
          <button
            v-for="(c, idx) in cells"
            :key="idx"
            type="button"
            class="day-card"
            :class="[
              c.inMonth ? 'in-month' : 'out-month',
              c.decor?.tone ? `tone-${c.decor.tone}` : '',
              c.isBookable ? 'is-bookable' : 'is-readonly',
              selectedDateKey && formatIsoDate(c.date) === selectedDateKey ? 'is-selected' : '',
            ]"
            :disabled="!c.inMonth"
            @click="handleDayClick(c)"
          >
            <div class="day-number">{{ formatDay(c.day) }}</div>
            <div v-if="c.tripCount" class="day-summary">
              <span class="day-summary-text">{{ c.tripSummary }}</span>
              <span class="day-summary-count">{{ c.tripCount }}</span>
            </div>
            <div v-else-if="c.decor?.note" class="day-note">
              <span
                v-for="(line, lineIdx) in c.decor.note.split('\n')"
                :key="lineIdx"
                class="day-note-line"
              >
                {{ line }}
              </span>
            </div>
          </button>
        </div>
      </div>

      <div v-if="selectedDate && !isFormOpen" class="meta-overlay" @click.self="clearSelectedDate">
        <aside class="meta-card">
          <div class="meta-header">
            <div>
              <div class="meta-title">Trips for</div>
              <div class="meta-date">{{ selectedDateLabel }}</div>
            </div>
            <button type="button" class="meta-close" @click="clearSelectedDate">
              Close
            </button>
          </div>

          <p v-if="tripsLoading" class="meta-loading">Loading approved trips...</p>
          <p v-else-if="selectedTrips.length === 0" class="meta-empty">
            No approved trips for this date.
          </p>

          <div v-else class="meta-list">
            <article v-for="trip in selectedTrips" :key="trip.id" class="meta-trip">
              <div class="meta-line">DESTINATION : <span>{{ trip.destination }}</span></div>
              <div class="meta-line">MODE : <span>{{ trip.mode }}</span></div>
              <div class="meta-line">OUTBOUND : <span>{{ formatDateTime(trip.tripDateTime) }}</span></div>
              <div class="meta-line">RETURN : <span>{{ formatDateTime(trip.returnTripDateTime) }}</span></div>
              <div v-if="auth.isAdmin && trip.user" class="meta-line">
                TRAVELER : <span>{{ trip.user.firstName }} {{ trip.user.lastName }}</span>
              </div>
            </article>
          </div>

          <p v-if="tripsError" class="meta-error">{{ tripsError }}</p>

          <div v-if="canBookSelected" class="meta-actions">
            <button type="button" class="primary-button" @click="openFormForSelected">
              Book travel
            </button>
          </div>

          <div class="meta-cutout" aria-hidden="true"></div>
        </aside>
      </div>
    </div>

    <div v-if="isFormOpen" class="booking-overlay" @click.self="closeForm">
      <form class="booking-card" @submit.prevent="submitBooking">
        <div class="booking-header">
          <div class="booking-title">Book travel</div>
          <button type="button" class="booking-close" @click="closeForm">
            Close
          </button>
        </div>
        <div class="booking-date">{{ selectedDateLabel }}</div>

        <label class="booking-field">
          <span>Mode of travel</span>
          <select v-model="formState.modeOfTravel" required>
            <option value="" disabled>Select mode</option>
            <option value="LAND">Land</option>
            <option value="AIR">Air</option>
            <option value="SEA">Sea</option>
          </select>
        </label>

        <label class="booking-field">
          <span>Time of departure</span>
          <div class="time-selects">
            <select v-model="formState.timeHour" required>
              <option value="" disabled>HH</option>
              <option v-for="hour in hourOptions" :key="hour" :value="hour">
                {{ hour }}
              </option>
            </select>
            <span class="time-separator">:</span>
            <select v-model="formState.timeMinute" required>
              <option value="" disabled>MM</option>
              <option v-for="minute in minuteOptions" :key="minute" :value="minute">
                {{ minute }}
              </option>
            </select>
            <select v-model="formState.timeMeridiem" required>
              <option value="" disabled>AM/PM</option>
              <option v-for="meridiem in meridiemOptions" :key="meridiem" :value="meridiem">
                {{ meridiem }}
              </option>
            </select>
          </div>
        </label>

        <label class="booking-field">
          <span>Destination</span>
          <input v-model="formState.destination" type="text" placeholder="City, country" required />
        </label>

        <div class="return-fields">
          <label class="booking-field">
            <span>Return mode of travel</span>
            <select v-model="formState.returnModeOfTravel">
              <option value="">Same as outbound</option>
              <option value="LAND">Land</option>
              <option value="AIR">Air</option>
              <option value="SEA">Sea</option>
            </select>
          </label>

          <label class="booking-field">
            <span>Return date</span>
            <input
              v-model="formState.returnDate"
              type="date"
              :min="selectedDate ? formatIsoDate(selectedDate) : undefined"
              required
            />
          </label>

          <label class="booking-field">
            <span>Return time</span>
            <div class="time-selects">
              <select v-model="formState.returnHour" required>
                <option value="" disabled>HH</option>
                <option v-for="hour in hourOptions" :key="hour" :value="hour">
                  {{ hour }}
                </option>
              </select>
              <span class="time-separator">:</span>
              <select v-model="formState.returnMinute" required>
                <option value="" disabled>MM</option>
                <option v-for="minute in minuteOptions" :key="minute" :value="minute">
                  {{ minute }}
                </option>
              </select>
              <select v-model="formState.returnMeridiem" required>
                <option value="" disabled>AM/PM</option>
                <option v-for="meridiem in meridiemOptions" :key="meridiem" :value="meridiem">
                  {{ meridiem }}
                </option>
              </select>
            </div>
          </label>
        </div>

        <p v-if="submitError" class="booking-error">{{ submitError }}</p>

        <div class="booking-actions">
          <button type="button" class="ghost-button" @click="closeForm">
            Cancel
          </button>
          <button type="submit" class="primary-button" :disabled="isSubmitting">
            {{ isSubmitting ? "Sending..." : "Submit" }}
          </button>
        </div>
      </form>
    </div>

    <div v-if="successMessage" class="toast">
      {{ successMessage }}
    </div>
  </section>
</template>

<style scoped>
.calendar-page {
  padding: 32px 28px 40px;
  max-width: 1080px;
  margin: 0 auto;
  color: var(--ink);
}

.calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 170px;
}

.brand-mark {
  width: 48px;
  height: 48px;
  stroke: var(--ink);
  fill: none;
  stroke-width: 2;
}

.brand-name {
  font-family: var(--font-title);
  font-size: 14px;
  letter-spacing: 0.32em;
  font-weight: 600;
}

.month-block {
  text-align: center;
  flex: 1;
}

.month {
  font-family: var(--font-title);
  font-size: 28px;
  letter-spacing: 0.2em;
  font-weight: 700;
}

.year {
  font-family: var(--font-title);
  font-size: 22px;
  letter-spacing: 0.2em;
  font-weight: 600;
  margin-top: 2px;
}

.calendar-title {
  font-size: 14px;
  letter-spacing: 0.05em;
  min-width: 170px;
  text-align: right;
}

.calendar-body {
  display: flex;
  align-items: flex-start;
  gap: 28px;
  margin-top: 20px;
}

.calendar-grid {
  flex: 1;
}

.weekday-row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 14px;
  margin-bottom: 12px;
}

.weekday-cell {
  text-align: center;
  font-size: 12px;
  letter-spacing: 0.1em;
  color: var(--ink);
  font-weight: 600;
}

.days-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 14px;
}

.day-card {
  position: relative;
  height: 76px;
  padding: 10px 10px 8px;
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 8px 16px rgba(64, 52, 40, 0.08);
  display: flex;
  flex-direction: column;
  gap: 8px;
  border: none;
  text-align: left;
}

.day-number {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.08em;
}

.day-note {
  font-size: 11px;
  line-height: 1.25;
  margin-top: auto;
}

.day-note-line {
  display: block;
}

.out-month {
  color: #b5ada6;
  box-shadow: none;
  background: #f9f6f2;
}

.is-bookable {
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.is-bookable:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(64, 52, 40, 0.12);
}

.is-readonly {
  cursor: pointer;
}

.is-selected {
  outline: 2px solid #3c3a37;
  outline-offset: 2px;
}

.day-summary {
  margin-top: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  font-size: 10px;
  line-height: 1.2;
  color: #6c625a;
}

.day-summary-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.day-summary-count {
  border-radius: 999px;
  padding: 2px 6px;
  font-size: 10px;
  background: #efe7df;
  color: #3c3a37;
}

.tone-lavender {
  background: var(--tone-lavender);
}

.tone-sand {
  background: var(--tone-sand);
}

.tone-sky {
  background: var(--tone-sky);
}

.tone-rose {
  background: var(--tone-rose);
}

.meta-card {
  width: 200px;
  min-height: 170px;
  background: #ffffff;
  border-radius: 22px;
  padding: 22px 18px 36px;
  position: relative;
  box-shadow: 0 10px 20px rgba(64, 52, 40, 0.12);
  font-size: 12px;
  letter-spacing: 0.04em;
}

.meta-overlay {
  display: block;
}

.meta-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.meta-title {
  font-family: var(--font-title);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 11px;
  color: #7a6d63;
}

.meta-date {
  margin-top: 6px;
  font-size: 13px;
  color: var(--ink);
  font-weight: 600;
}

.meta-close {
  border: none;
  background: transparent;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  cursor: pointer;
  color: #7a6d63;
}

.meta-line {
  margin-bottom: 12px;
}

.meta-line span {
  font-weight: 600;
}

.meta-list {
  display: grid;
  gap: 14px;
  margin-bottom: 10px;
}

.meta-trip {
  border: 1px solid #efe7df;
  border-radius: 14px;
  padding: 12px;
  background: #fffdfb;
}

.meta-loading,
.meta-empty,
.meta-error {
  font-size: 12px;
  color: #6c625a;
  margin: 0 0 10px;
}

.meta-error {
  color: #b24c4c;
}

.meta-actions {
  margin-top: 10px;
  display: flex;
  justify-content: flex-end;
}

.meta-cutout {
  position: absolute;
  left: 18px;
  bottom: 12px;
  width: 28px;
  height: 14px;
  border-top-left-radius: 30px;
  border-top-right-radius: 30px;
  background: #f1dcc1;
}

.booking-overlay {
  position: fixed;
  inset: 0;
  background: rgba(50, 40, 35, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  z-index: 10;
}

.booking-card {
  width: min(420px, 100%);
  background: #fffdfb;
  border-radius: 18px;
  padding: 20px 20px 18px;
  box-shadow: 0 14px 32px rgba(50, 40, 35, 0.18);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.booking-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.booking-title {
  font-family: var(--font-title);
  font-size: 16px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.booking-close {
  border: none;
  background: transparent;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  cursor: pointer;
  color: #7a6d63;
}

.booking-date {
  font-size: 13px;
  color: #6c625a;
}

.booking-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.booking-field input,
.booking-field select {
  border: 1px solid #d7cec6;
  background: #ffffff;
  border-radius: 10px;
  padding: 8px 10px;
  font-size: 13px;
  font-family: inherit;
  color: var(--ink);
  text-transform: none;
}

.time-selects {
  display: flex;
  align-items: center;
  gap: 6px;
}

.time-selects select {
  min-width: 72px;
}

.time-separator {
  font-size: 12px;
  color: #8a8077;
}

.booking-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.booking-check {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.booking-check input {
  accent-color: #3c3a37;
}

.return-fields {
  display: grid;
  gap: 12px;
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

.primary-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.ghost-button {
  background: transparent;
  border-color: #d7cec6;
  color: #5b5149;
}

.booking-error {
  color: #b24c4c;
  font-size: 12px;
  margin: 0;
}

.toast {
  position: fixed;
  right: 24px;
  bottom: 24px;
  background: #3c3a37;
  color: #f7f2ee;
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 12px;
  letter-spacing: 0.04em;
  box-shadow: 0 12px 24px rgba(50, 40, 35, 0.2);
  z-index: 20;
}

@media (max-width: 900px) {
  .calendar-body {
    flex-direction: column;
  }

  .calendar-title {
    text-align: center;
  }

  .meta-card {
    width: 100%;
    max-width: 320px;
  }
}

@media (max-width: 700px) {
  .calendar-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .month-block {
    width: 100%;
  }

  .calendar-title {
    width: 100%;
  }

  .weekday-row,
  .days-grid {
    gap: 10px;
  }

  .day-card {
    height: 70px;
  }

  .meta-overlay {
    position: fixed;
    inset: 0;
    background: rgba(50, 40, 35, 0.25);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    z-index: 30;
  }

  .meta-overlay .meta-card {
    width: min(360px, 100%);
    max-width: 360px;
  }
}
</style>
