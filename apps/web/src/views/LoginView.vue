<script setup lang="ts">
import { ref } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useAuthStore } from "../stores/auth";
import { ApiException } from "../api/client";

const email = ref("");
const password = ref("");
const error = ref("");
const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

async function submit() {
  error.value = "";
  try {
    await auth.login(email.value, password.value);
    const next = (route.query.next as string) || "/notes";
    router.push(next);
  } catch (e) {
    error.value = e instanceof ApiException ? e.message : "Could not log in";
  }
}
</script>

<template>
  <h1>Log in</h1>
  <form class="stack" @submit.prevent="submit">
    <label>Email <input v-model="email" type="email" required autocomplete="email" /></label>
    <label>Password <input v-model="password" type="password" required autocomplete="current-password" /></label>
    <button class="primary" type="submit">Log in</button>
    <p v-if="error" class="error">{{ error }}</p>
    <p class="muted">No account? <RouterLink to="/signup">Sign up</RouterLink></p>
  </form>
</template>
