<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useNotesStore } from "../stores/notes";
import MarkdownView from "../components/MarkdownView.vue";
import { ApiException } from "../api/client";

const route = useRoute();
const router = useRouter();
const notes = useNotesStore();

const id = route.params.id as string | undefined;
const isNew = !id;
const title = ref("");
const body = ref("");
const error = ref("");

onMounted(async () => {
  if (id) {
    await notes.fetchOne(id);
    if (!notes.canEdit) {
      router.replace(`/notes/${id}`);
      return;
    }
    title.value = notes.current!.title;
    body.value = notes.current!.body;
  }
});

async function save() {
  error.value = "";
  try {
    if (isNew) {
      const created = await notes.create(title.value, body.value);
      router.push(`/notes/${created.id}`);
    } else {
      await notes.update(id!, title.value, body.value);
      router.push(`/notes/${id}`);
    }
  } catch (e) {
    error.value = e instanceof ApiException ? e.message : "Could not save";
  }
}
</script>

<template>
  <h1>{{ isNew ? "New note" : "Edit note" }}</h1>
  <form @submit.prevent="save">
    <input v-model="title" placeholder="Title" required maxlength="200" style="width: 100%; font-size: 1.2rem; margin-bottom: 0.6rem;" />
    <textarea v-model="body" rows="14" placeholder="Markdown body…" style="width: 100%; font-family: ui-monospace, monospace;" />
    <div class="row" style="margin-top: 0.6rem;">
      <button class="primary" type="submit">Save</button>
      <RouterLink :to="id ? `/notes/${id}` : '/notes'"><button type="button">Cancel</button></RouterLink>
    </div>
    <p v-if="error" class="error">{{ error }}</p>
  </form>

  <h3 style="margin-top: 1.5rem;">Preview</h3>
  <MarkdownView :source="body" />
</template>
