<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { useNotesStore } from "../stores/notes";

const notes = useNotesStore();
const q = ref("");
let timer: ReturnType<typeof setTimeout> | null = null;

onMounted(() => notes.fetchList());

// Debounce search-as-you-type so we don't hammer the API.
watch(q, (v) => {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => notes.fetchList(v), 200);
});
</script>

<template>
  <div class="row" style="justify-content: space-between; margin-bottom: 1rem;">
    <h1 style="margin: 0;">Notes</h1>
    <RouterLink to="/notes/new"><button class="primary">+ New note</button></RouterLink>
  </div>
  <input v-model="q" placeholder="Search title or body…" style="width: 100%; margin-bottom: 1rem;" />
  <ul v-if="notes.list.length" class="note-list">
    <li v-for="n in notes.list" :key="n.id">
      <RouterLink :to="`/notes/${n.id}`">{{ n.title }}</RouterLink>
      <span v-if="n.shared" class="tag">shared by @{{ n.ownerUsername }}</span>
      <div class="meta">updated {{ new Date(n.updatedAt).toLocaleString() }}</div>
    </li>
  </ul>
  <p v-else class="muted">No notes yet — create your first one.</p>
</template>
