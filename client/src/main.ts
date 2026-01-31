import { createApp } from 'vue'
import router from './router'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import { setAuthInvalidHandler } from './lib/api'
import { useAuthStore } from './stores/auth'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(router)

const auth = useAuthStore(pinia)
setAuthInvalidHandler(() => {
  auth.logout()
  if (router.currentRoute.value.path !== '/login') {
    router.push('/login')
  }
})

app.mount('#app')
