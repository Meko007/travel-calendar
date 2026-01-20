<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { fetchHello } from './lib/api'

const apiMessage = ref('Loading...')
const apiError = ref('')

onMounted(async () => {
  try {
    apiMessage.value = await fetchHello()
  } catch (error) {
    apiError.value =
      error instanceof Error ? error.message : 'Failed to reach the API'
    apiMessage.value = ''
  }
})
</script>

<template>
  <router-view />
</template>

<style scoped>
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
.api-status {
  margin-top: 2rem;
}
.api-error {
  color: #cc3d3d;
}
</style>
