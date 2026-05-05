<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useNotesStore } from "../stores/notes";
import { ApiException } from "../api/client";
import MarkdownView from "../components/MarkdownView.vue";

const route = useRoute();
const router = useRouter();
const notes = useNotesStore();

const shareTarget = ref("");
const shareError = ref("");
const fileInput = ref<HTMLInputElement | null>(null);
const uploadError = ref("");

async function load() {
  try {
    await notes.fetchOne(route.params.id as string);
  } catch (e) {
    if (e instanceof ApiException && e.status === 404) router.replace("/notes");
    else throw e;
  }
}
onMounted(load);

async function share() {
  shareError.value = "";
  try {
    await notes.share(notes.current!.id, shareTarget.value);
    shareTarget.value = "";
  } catch (e) {
    shareError.value = e instanceof ApiException ? e.message : "Could not share";
  }
}

async function unshare(userId: string) {
  await notes.unshare(notes.current!.id, userId);
}

async function remove() {
  if (!confirm("Delete this note?")) return;
  await notes.remove(notes.current!.id);
  router.push("/notes");
}

async function onFileChosen(e: Event) {
  uploadError.value = "";
  const f = (e.target as HTMLInputElement).files?.[0];
  if (!f) return;
  try {
    await notes.uploadAttachment(notes.current!.id, f);
  } catch (err) {
    uploadError.value = err instanceof ApiException ? err.message : "Upload failed";
  } finally {
    if (fileInput.value) fileInput.value.value = "";
  }
}
</script>

<template>
  <div v-if="notes.current">
    <div class="row" style="justify-content: space-between;">
      <h1 style="margin: 0;">{{ notes.current.title }}</h1>
      <div class="row" v-if="notes.canEdit">
        <RouterLink :to="`/notes/${notes.current.id}/edit`"><button>Edit</button></RouterLink>
        <button class="danger" @click="remove">Delete</button>
      </div>
    </div>
    <p class="muted">
      by <RouterLink :to="`/u/${notes.current.ownerUsername}`">@{{ notes.current.ownerUsername }}</RouterLink>
      · updated {{ new Date(notes.current.updatedAt).toLocaleString() }}
    </p>

    <MarkdownView :source="notes.current.body" />

    <section v-if="notes.current.attachment" style="margin-top: 1rem;">
      <h3>Attachment</h3>
      <p>
        <a :href="`/api/attachments/${notes.current.attachment.id}`" target="_blank" rel="noopener">
          {{ notes.current.attachment.filename }}
        </a>
        <span class="muted"> ({{ Math.round(notes.current.attachment.size / 1024) }} KB)</span>
      </p>
      <img
        v-if="notes.current.attachment.mimeType.startsWith('image/')"
        :src="`/api/attachments/${notes.current.attachment.id}`"
        :alt="notes.current.attachment.filename"
        style="max-width: 100%;"
      />
    </section>

    <section v-if="notes.canEdit" style="margin-top: 1.5rem;">
      <h3>Attach a file</h3>
      <input ref="fileInput" type="file" @change="onFileChosen" accept="image/*,application/pdf" />
      <p class="muted">Up to 5 MB. Replaces any existing attachment.</p>
      <p v-if="uploadError" class="error">{{ uploadError }}</p>
    </section>

    <section v-if="notes.canEdit" style="margin-top: 1.5rem;">
      <h3>Sharing</h3>
      <ul v-if="notes.current.sharedWith.length" class="note-list">
        <li v-for="s in notes.current.sharedWith" :key="s.id" class="row" style="justify-content: space-between;">
          <span>@{{ s.username }}</span>
          <button class="danger" @click="unshare(s.id)">Remove</button>
        </li>
      </ul>
      <form class="row" @submit.prevent="share">
        <input v-model="shareTarget" placeholder="username" required />
        <button class="primary" type="submit">Share read-only</button>
      </form>
      <p v-if="shareError" class="error">{{ shareError }}</p>
    </section>
  </div>
</template>
