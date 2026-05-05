<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";
import { ApiException } from "../api/client";

const email = ref("");
const username = ref("");
const displayName = ref("");
const password = ref("");
const error = ref("");
const auth = useAuthStore();
const router = useRouter();

async function submit() {
  error.value = "";
  try {
    await auth.signup({
      email: email.value,
      username: username.value,
      displayName: displayName.value,
      password: password.value,
    });
    router.push("/notes");
  } catch (e) {
    error.value = e instanceof ApiException ? e.message : "Could not sign up";
  }
}
</script>

<template>
  <h1>Sign up</h1>
  <form class="stack" @submit.prevent="submit">
    <label>Email <input v-model="email" type="email" required autocomplete="email" /></label>
    <label>Username <input v-model="username" required pattern="[A-Za-z0-9_]{3,30}" autocomplete="username" /></label>
    <label>Display name <input v-model="displayName" required maxlength="80" /></label>
    <label>Password <input v-model="password" type="password" required minlength="8" autocomplete="new-password" /></label>
    <button class="primary" type="submit">Create account</button>
    <p v-if="error" class="error">{{ error }}</p>
    <p class="muted">Have an account? <RouterLink to="/login">Log in</RouterLink></p>
  </form>
</template>
