import { createRouter, createWebHistory } from "vue-router";
import Login from "./pages/Login.vue";
import Signup from "./pages/Signup.vue";
import Calendar from "./pages/Calendar.vue";
import { useAuthStore } from "./stores/auth";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", redirect: "/calendar" },
    { path: "/login", component: Login },
    { path: "/signup", component: Signup },
    { path: "/calendar", component: Calendar, meta: { requiresAuth: true } },
  ],
});

router.beforeEach((to) => {
  const auth = useAuthStore();
  if (to.meta.requiresAuth && !auth.isAuthed) {
    return { path: "/login", query: { next: to.fullPath } };
  }
});

export default router;
