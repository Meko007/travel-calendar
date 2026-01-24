<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { useRoute, useRouter, RouterLink } from "vue-router";
import { fetchTrip, resubmitTrip } from "../lib/api";

const route = useRoute();
const router = useRouter();
const tripId = route.params.id as string;

const loading = ref(true);
const error = ref("");
const success = ref("");
const isSubmitting = ref(false);
const tripStatus = ref<"PENDING" | "APPROVED" | "REJECTED" | "">("");

const formState = reactive({
  destination: "",
  modeOfTravel: "",
  tripDate: "",
  timeHour: "",
  timeMinute: "",
  timeMeridiem: "",
  returnDate: "",
  returnHour: "",
  returnMinute: "",
  returnMeridiem: "",
  returnModeOfTravel: "",
});

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

function splitDateTime(raw: string) {
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return { date: "", hours: "", minutes: "", meridiem: "" };
  }
  const datePart = date.toISOString().split("T")[0];
  const hours24 = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const meridiem = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 || 12;
  return {
    date: datePart,
    hours: String(hours12).padStart(2, "0"),
    minutes,
    meridiem,
  };
}

async function loadTrip() {
  loading.value = true;
  error.value = "";
  try {
    const trip = await fetchTrip(tripId);
    tripStatus.value = trip.status;
    formState.destination = trip.destination;
    formState.modeOfTravel = trip.mode;
    formState.returnModeOfTravel = trip.returnMode ?? trip.mode;

    const outbound = splitDateTime(trip.tripDateTime);
    formState.tripDate = outbound.date;
    formState.timeHour = outbound.hours;
    formState.timeMinute = outbound.minutes;
    formState.timeMeridiem = outbound.meridiem;

    const inbound = splitDateTime(trip.returnTripDateTime);
    formState.returnDate = inbound.date;
    formState.returnHour = inbound.hours;
    formState.returnMinute = inbound.minutes;
    formState.returnMeridiem = inbound.meridiem;
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Failed to load trip.";
  } finally {
    loading.value = false;
  }
}

async function handleSubmit() {
  error.value = "";
  success.value = "";

  if (tripStatus.value && tripStatus.value !== "REJECTED") {
    error.value = "Only rejected trips can be resubmitted.";
    return;
  }

  if (!formState.destination) {
    error.value = "Destination is required.";
    return;
  }

  const outboundTime = normalizeTimeTo24Hour(
    formState.timeHour,
    formState.timeMinute,
    formState.timeMeridiem
  );
  if (!outboundTime) {
    error.value = "Please select a departure time.";
    return;
  }

  if (!formState.returnDate || !formState.returnHour || !formState.returnMinute || !formState.returnMeridiem) {
    error.value = "Please provide a return date and time.";
    return;
  }

  const returnTimeNormalized = normalizeTimeTo24Hour(
    formState.returnHour,
    formState.returnMinute,
    formState.returnMeridiem
  );
  if (!returnTimeNormalized) {
    error.value = "Please select a return time.";
    return;
  }

  if (!formState.tripDate) {
    error.value = "Please select a departure date.";
    return;
  }

  if (formState.returnDate < formState.tripDate) {
    error.value = "Return date must be on or after the departure date.";
    return;
  }

  isSubmitting.value = true;
  try {
    await resubmitTrip(tripId, {
      destination: formState.destination,
      tripDateTime: `${formState.tripDate}T${outboundTime}:00`,
      returnTripDateTime: `${formState.returnDate}T${returnTimeNormalized}:00`,
      mode: formState.modeOfTravel as "LAND" | "AIR" | "SEA",
      returnMode: (formState.returnModeOfTravel || formState.modeOfTravel) as
        | "LAND"
        | "AIR"
        | "SEA",
    });
    success.value = "Trip resubmitted for approval.";
    setTimeout(() => {
      router.push("/notifications");
    }, 1200);
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Failed to resubmit trip.";
  } finally {
    isSubmitting.value = false;
  }
}

onMounted(loadTrip);
</script>

<template>
  <div class="resubmit-shell">
    <header class="resubmit-header">
      <div>
        <div class="resubmit-title">Resubmit Trip</div>
        <div class="resubmit-subtitle">Update details and send for approval.</div>
      </div>
      <div class="resubmit-actions">
        <RouterLink class="ghost-button" to="/notifications">Notifications</RouterLink>
        <RouterLink class="primary-button" to="/calendar">Calendar</RouterLink>
      </div>
    </header>

    <p v-if="error" class="resubmit-error">{{ error }}</p>
    <p v-if="success" class="resubmit-success">{{ success }}</p>

    <div v-if="loading" class="resubmit-loading">Loading trip...</div>

    <form v-else class="resubmit-card" @submit.prevent="handleSubmit">
      <p v-if="tripStatus && tripStatus !== 'REJECTED'" class="resubmit-warning">
        This trip is not rejected, so it cannot be resubmitted.
      </p>
      <label class="resubmit-field">
        <span>Destination</span>
        <input v-model="formState.destination" type="text" placeholder="City, country" required />
      </label>

      <label class="resubmit-field">
        <span>Mode of travel</span>
        <select v-model="formState.modeOfTravel" required>
          <option value="" disabled>Select mode</option>
          <option value="LAND">Land</option>
          <option value="AIR">Air</option>
          <option value="SEA">Sea</option>
        </select>
      </label>

      <label class="resubmit-field">
        <span>Departure date</span>
        <input v-model="formState.tripDate" type="date" required />
      </label>

      <label class="resubmit-field">
        <span>Departure time</span>
        <div class="time-selects">
          <select v-model="formState.timeHour" required>
            <option value="" disabled>HH</option>
            <option v-for="hour in hourOptions" :key="hour" :value="hour">{{ hour }}</option>
          </select>
          <span class="time-separator">:</span>
          <select v-model="formState.timeMinute" required>
            <option value="" disabled>MM</option>
            <option v-for="minute in minuteOptions" :key="minute" :value="minute">{{ minute }}</option>
          </select>
          <select v-model="formState.timeMeridiem" required>
            <option value="" disabled>AM/PM</option>
            <option v-for="meridiem in meridiemOptions" :key="meridiem" :value="meridiem">
              {{ meridiem }}
            </option>
          </select>
        </div>
      </label>

      <label class="resubmit-field">
        <span>Return mode of travel</span>
        <select v-model="formState.returnModeOfTravel">
          <option value="">Same as outbound</option>
          <option value="LAND">Land</option>
          <option value="AIR">Air</option>
          <option value="SEA">Sea</option>
        </select>
      </label>

      <label class="resubmit-field">
        <span>Return date</span>
        <input v-model="formState.returnDate" type="date" :min="formState.tripDate || undefined" required />
      </label>

      <label class="resubmit-field">
        <span>Return time</span>
        <div class="time-selects">
          <select v-model="formState.returnHour" required>
            <option value="" disabled>HH</option>
            <option v-for="hour in hourOptions" :key="hour" :value="hour">{{ hour }}</option>
          </select>
          <span class="time-separator">:</span>
          <select v-model="formState.returnMinute" required>
            <option value="" disabled>MM</option>
            <option v-for="minute in minuteOptions" :key="minute" :value="minute">{{ minute }}</option>
          </select>
          <select v-model="formState.returnMeridiem" required>
            <option value="" disabled>AM/PM</option>
            <option v-for="meridiem in meridiemOptions" :key="meridiem" :value="meridiem">
              {{ meridiem }}
            </option>
          </select>
        </div>
      </label>

      <div class="resubmit-actions-row">
        <button class="ghost-button" type="button" @click="router.push('/notifications')">
          Cancel
        </button>
        <button
          class="primary-button"
          type="submit"
          :disabled="isSubmitting || (tripStatus && tripStatus !== 'REJECTED')"
        >
          {{ isSubmitting ? "Submitting..." : "Resubmit" }}
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.resubmit-shell {
  max-width: 900px;
  margin: 0 auto;
  padding: 28px 28px 40px;
  color: var(--ink);
}

.resubmit-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.resubmit-title {
  font-family: var(--font-title);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  font-size: 18px;
}

.resubmit-subtitle {
  margin-top: 4px;
  font-size: 13px;
  letter-spacing: 0.04em;
  color: #6d6157;
}

.resubmit-actions {
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

.resubmit-card {
  margin-top: 18px;
  background: #fffdfb;
  border-radius: 18px;
  padding: 20px;
  box-shadow: 0 14px 32px rgba(50, 40, 35, 0.16);
  display: grid;
  gap: 12px;
}

.resubmit-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.resubmit-field input,
.resubmit-field select {
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

.resubmit-actions-row {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.resubmit-loading,
.resubmit-error,
.resubmit-success {
  margin-top: 16px;
  font-size: 12px;
}

.resubmit-error {
  color: #b24c4c;
}

.resubmit-success {
  color: #2e3c2f;
}

.resubmit-warning {
  margin: 0;
  padding: 10px 12px;
  border-radius: 12px;
  background: #efe7df;
  color: #6d6157;
  font-size: 12px;
}

@media (max-width: 720px) {
  .resubmit-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
