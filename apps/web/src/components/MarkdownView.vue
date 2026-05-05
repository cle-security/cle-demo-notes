<script setup lang="ts">
import { computed } from "vue";
import { marked } from "marked";
import DOMPurify from "dompurify";

const props = defineProps<{ source: string }>();

// marked emits HTML; DOMPurify scrubs anything dangerous before we v-html it.
const html = computed(() => {
  const raw = marked.parse(props.source ?? "", { async: false }) as string;
  return DOMPurify.sanitize(raw);
});
</script>

<template>
  <div class="markdown-body" v-html="html" />
</template>
