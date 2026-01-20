<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { createTrip } from "../lib/api";

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

const monthName = computed(() =>
  new Date(props.year, props.month - 1, 1)
    .toLocaleString(undefined, { month: "long" })
    .toUpperCase()
);

const daysOfWeek = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

const dayDecorations: Record<number, DayDecor> = {
  1: { tone: "lavender" },
  9: { tone: "sand" },
  11: { tone: "sky", note: "SBU: care\nAssociate name: Daniel" },
  13: { tone: "rose", note: "R" },
  17: { tone: "lavender" },
  21: { tone: "sky" },
  30: { tone: "rose" },
};

const today = new Date();
today.setHours(0, 0, 0, 0);

const isFormOpen = ref(false);
const selectedDate = ref<Date | null>(null);
const formState = reactive({
  modeOfTravel: "",
  timeHour: "",
  timeMinute: "",
  timeMeridiem: "",
  destination: "",
  addReturnTrip: true,
  returnDate: "",
  returnHour: "",
  returnMinute: "",
  returnMeridiem: "",
  returnModeOfTravel: "",
});
const submitError = ref("");
const isSubmitting = ref(false);

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
    arr.push({ day, inMonth, decor, date, isBookable });
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

function openForm(date: Date) {
  selectedDate.value = date;
  formState.modeOfTravel = "";
  formState.timeHour = "";
  formState.timeMinute = "";
  formState.timeMeridiem = "";
  formState.destination = "";
  formState.addReturnTrip = true;
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

function handleDayClick(cell: (typeof cells)["value"][number]) {
  if (!cell.isBookable) {
    return;
  }
  openForm(cell.date);
}

function formatIsoDate(date: Date) {
  return date.toISOString().split("T")[0];
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

    if (formState.addReturnTrip) {
      if (!formState.returnDate || !formState.returnHour || !formState.returnMinute || !formState.returnMeridiem) {
        submitError.value = "Please provide a return date and time.";
        return;
      }
      if (formState.returnDate < isoDate) {
        submitError.value = "Return date must be on or after the departure date.";
        return;
      }
    }

    const returnTimeNormalized = formState.addReturnTrip
      ? normalizeTimeTo24Hour(
          formState.returnHour,
          formState.returnMinute,
          formState.returnMeridiem
        )
      : "";
    if (formState.addReturnTrip && !returnTimeNormalized) {
      submitError.value = "Please select a return time.";
      return;
    }

    await createTrip({
      date: isoDate,
      modeOfTravel: formState.modeOfTravel,
      timeOfDeparture: outboundTime,
      destination: formState.destination,
    });

    if (formState.addReturnTrip) {
      await createTrip({
        date: formState.returnDate,
        modeOfTravel: formState.returnModeOfTravel || formState.modeOfTravel,
        timeOfDeparture: returnTimeNormalized,
        destination: formState.destination,
      });
    }

    isFormOpen.value = false;
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

      <div class="calendar-title">Monthly travels calendar</div>
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
              c.isBookable ? 'is-bookable' : 'is-disabled',
            ]"
            :disabled="!c.isBookable"
            @click="handleDayClick(c)"
          >
            <div class="day-number">{{ formatDay(c.day) }}</div>
            <div v-if="c.decor?.note" class="day-note">
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

      <aside class="meta-card">
        <div class="meta-line">DESTINATION : <span>LAGOS, NIGERIA</span></div>
        <div class="meta-line">MODE OF TRAVEL : <span>LAND</span></div>
        <div class="meta-line">TIME OF DEPARTURE : <span>10:20:00</span></div>
        <div class="meta-cutout" aria-hidden="true"></div>
      </aside>
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
            <option value="Land">Land</option>
            <option value="Air">Air</option>
            <option value="Sea">Sea</option>
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

        <label class="booking-check">
          <input type="checkbox" v-model="formState.addReturnTrip" />
          <span>Book return trip</span>
        </label>

        <div v-if="formState.addReturnTrip" class="return-fields">
          <label class="booking-field">
            <span>Return mode of travel</span>
            <select v-model="formState.returnModeOfTravel">
              <option value="">Same as outbound</option>
              <option value="Land">Land</option>
              <option value="Air">Air</option>
              <option value="Sea">Sea</option>
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

.is-disabled {
  cursor: not-allowed;
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

.meta-line {
  margin-bottom: 12px;
}

.meta-line span {
  font-weight: 600;
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
}
</style>
