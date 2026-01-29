import { createRouter, createWebHistory } from "vue-router";
import Login from "./pages/Login.vue";
import Signup from "./pages/Signup.vue";
import Calendar from "./pages/Calendar.vue";
import AdminDashboard from "./pages/AdminDashboard.vue";
import AdminTripReview from "./pages/AdminTripReview.vue";
import ViewUsers from "./pages/ViewUsers.vue";
import UserNotifications from "./pages/UserNotifications.vue";
import TripResubmit from "./pages/TripResubmit.vue";
import ChangePassword from "./pages/ChangePassword.vue";
import { useAuthStore } from "./stores/auth";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", redirect: "/calendar" },
    { path: "/login", component: Login },
    { path: "/signup", component: Signup },
    { path: "/calendar", component: Calendar, meta: { requiresAuth: true } },
    { path: "/notifications", component: UserNotifications, meta: { requiresAuth: true, requiresUser: true } },
    { path: "/trips/:id/resubmit", component: TripResubmit, meta: { requiresAuth: true, requiresUser: true } },
    { path: "/admin", component: AdminDashboard, meta: { requiresAuth: true, requiresAdmin: true } },
    { path: "/admin/trips/:id", component: AdminTripReview, meta: { requiresAuth: true, requiresAdmin: true } },
    { path: "/admin/users", component: ViewUsers, meta: { requiresAuth: true, requiresAdmin: true } },
    { path: "/change-password", component: ChangePassword, meta: { requiresAuth: true } },
  ],
});

router.beforeEach((to) => {
  const auth = useAuthStore();
  if (to.meta.requiresAuth && !auth.isAuthed) {
    return { path: "/login", query: { next: to.fullPath } };
  }
  if (auth.user?.mustChangePassword) {
    if (to.path !== "/change-password") {
      return { path: "/change-password", query: { next: to.fullPath } };
    }
  } else if (to.path === "/change-password" && auth.isAuthed) {
    const next = (to.query.next as string) || (auth.isAdmin ? "/admin" : "/calendar");
    return { path: next };
  }
  if (to.meta.requiresAdmin && !auth.isAdmin) {
    return { path: "/calendar" };
  }
  if (to.meta.requiresUser && auth.isAdmin) {
    return { path: "/admin" };
  }
});

export default router;
