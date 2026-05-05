<script setup lang="ts">
import { onMounted, ref } from "vue";
import { api, ApiException } from "../api/client";
import { useAuthStore } from "../stores/auth";

const auth = useAuthStore();
const displayName = ref("");
const bio = ref("");
const status = ref("");
const error = ref("");

async function load() {
  if (!auth.user) return;
  const { profile } = await api.get<{ profile: { displayName: string; bio: string } }>(
    `/api/profile/${auth.user.username}`,
  );
  displayName.value = profile.displayName;
  bio.value = profile.bio;
}

onMounted(load);

async function save() {
  status.value = "";
  error.value = "";
  try {
    await api.put("/api/me/profile", { displayName: displayName.value, bio: bio.value });
    if (auth.user) auth.user.displayName = displayName.value;
    status.value = "Saved.";
  } catch (e) {
    error.value = e instanceof ApiException ? e.message : "Could not save";
  }
}
</script>

<template>
  <h1>My profile</h1>
  <p class="muted">
    Public page:
    <RouterLink v-if="auth.user" :to="`/u/${auth.user.username}`">/u/{{ auth.user.username }}</RouterLink>
  </p>
  <form class="stack" @submit.prevent="save">
    <label>Display name <input v-model="displayName" required maxlength="80" /></label>
    <label>
      Bio (markdown)
      <textarea v-model="bio" rows="8" maxlength="2000" style="font-family: ui-monospace, monospace;" />
    </label>
    <button class="primary" type="submit">Save profile</button>
    <p v-if="status" class="muted">{{ status }}</p>
    <p v-if="error" class="error">{{ error }}</p>
  </form>
</template>
