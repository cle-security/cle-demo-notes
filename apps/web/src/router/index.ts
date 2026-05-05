import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "../stores/auth";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", redirect: "/notes" },
    { path: "/login", component: () => import("../views/LoginView.vue") },
    { path: "/signup", component: () => import("../views/SignupView.vue") },
    {
      path: "/notes",
      component: () => import("../views/NotesListView.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/notes/new",
      component: () => import("../views/NoteEditView.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/notes/:id",
      component: () => import("../views/NoteView.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/notes/:id/edit",
      component: () => import("../views/NoteEditView.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/me",
      component: () => import("../views/MeView.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/admin",
      component: () => import("../views/AdminView.vue"),
      meta: { requiresAuth: true, requiresAdmin: true },
    },
    { path: "/u/:username", component: () => import("../views/ProfileView.vue") },
    { path: "/:pathMatch(.*)*", component: () => import("../views/NotFoundView.vue") },
  ],
});

router.beforeEach((to) => {
  const auth = useAuthStore();
  if (to.meta.requiresAuth && !auth.isAuthed) return { path: "/login", query: { next: to.fullPath } };
  if (to.meta.requiresAdmin && !auth.isAdmin) return { path: "/notes" };
});
