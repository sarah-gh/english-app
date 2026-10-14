<script setup lang="ts">
import { computed } from 'vue';
import GlassPanel from '@/components/chat/GlassPanel.vue';
import type { ChatMessage } from '@/types/chat-message';
import { renderChatMarkdown } from '@/utils/html';

const props = defineProps<{ message: ChatMessage }>();

const isUser = computed(() => props.message.role === 'user');
const html = computed(() => (isUser.value ? '' : renderChatMarkdown(props.message.content)));
const time = computed(() =>
  new Date(props.message.timestamp).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }),
);
</script>

<template>
  <div
    class="flex flex-col"
    :class="isUser ? 'items-end' : 'items-start'"
  >
    <div
      v-if="isUser"
      class="max-w-[85%] rounded-2xl rounded-br-md bg-primary/90 px-3.5 py-2.5 text-sm whitespace-pre-wrap text-white shadow-md backdrop-blur-md wrap-anywhere dark:bg-primary/70"
    >
      {{ message.content }}
    </div>
    <GlassPanel
      v-else
      class="max-w-[90%] rounded-2xl rounded-bl-md px-3.5 py-2.5 text-sm text-text wrap-anywhere"
    >
      <!-- Safe: `renderChatMarkdown` escapes the reply before adding tags, then DOMPurifies it. -->
      <!-- eslint-disable vue/no-v-html -->
      <div
        class="chat-markdown"
        v-html="html"
      />
      <!-- eslint-enable vue/no-v-html -->
    </GlassPanel>
    <span class="mt-1 px-1 text-[10px] text-text/40">{{ time }}</span>
  </div>
</template>

<style scoped>
.chat-markdown :deep(p + p),
.chat-markdown :deep(p + ul),
.chat-markdown :deep(p + ol),
.chat-markdown :deep(ul + p),
.chat-markdown :deep(ol + p) {
  margin-top: 0.5rem;
}
.chat-markdown :deep(ul) {
  list-style: disc;
  padding-left: 1.25rem;
}
.chat-markdown :deep(ol) {
  list-style: decimal;
  padding-left: 1.25rem;
}
.chat-markdown :deep(li + li) {
  margin-top: 0.125rem;
}
.chat-markdown :deep(strong) {
  font-weight: 600;
}
</style>
