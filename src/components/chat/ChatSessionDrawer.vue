<script setup lang="ts">
import { onKeyStroke } from '@vueuse/core';
import ChatSessionListItem from '@/components/chat/ChatSessionListItem.vue';
import GlassPanel from '@/components/chat/GlassPanel.vue';
import type { ChatSession } from '@/types/chat-message';

const props = defineProps<{
  open: boolean;
  /** Expected most-recent-first, as the chat store keeps them. */
  sessions: ChatSession[];
  activeSessionId: string | null;
}>();

const emit = defineEmits<{
  close: [];
  newChat: [];
  select: [id: string];
  rename: [id: string, title: string];
  delete: [session: ChatSession];
}>();

onKeyStroke('Escape', () => {
  if (props.open) emit('close');
});
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-200"
    >
      <div
        v-if="open"
        class="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px]"
        @click="emit('close')"
      />
    </Transition>
    <Transition
      enter-from-class="-translate-x-full"
      leave-to-class="-translate-x-full"
      enter-active-class="transition-transform duration-250 ease-out"
      leave-active-class="transition-transform duration-200 ease-in"
    >
      <GlassPanel
        v-if="open"
        as="aside"
        aria-label="Chat history"
        class="fixed inset-y-0 left-0 z-50 flex w-[85%] max-w-xs flex-col rounded-r-3xl bg-white/80! p-3 dark:bg-neutral-900/85!"
      >
        <div class="mb-3 flex items-center justify-between px-1 pt-1">
          <h2 class="text-base font-semibold text-text">Chats</h2>
          <button
            type="button"
            aria-label="Close chat list"
            class="flex h-8 w-8 items-center justify-center rounded-full text-text/50 hover:bg-text/10 hover:text-text"
            @click="emit('close')"
          >
            <AppIcon
              icon-name="CloseCircle"
              :size="18"
            />
          </button>
        </div>

        <button
          type="button"
          class="mb-3 flex items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-md transition hover:bg-primary/90 active:scale-[0.98]"
          @click="emit('newChat')"
        >
          <AppIcon
            icon-name="Add"
            :size="16"
          />
          New Chat
        </button>

        <ul
          v-if="sessions.length > 0"
          class="-mx-1 flex-1 space-y-0.5 overflow-y-auto px-1"
        >
          <ChatSessionListItem
            v-for="session in sessions"
            :key="session.id"
            :session="session"
            :active="session.id === activeSessionId"
            @select="emit('select', session.id)"
            @rename="(title) => emit('rename', session.id, title)"
            @delete="emit('delete', session)"
          />
        </ul>
        <p
          v-else
          class="px-2 py-6 text-center text-sm text-text/50"
        >
          No chats yet. Start one and it will appear here.
        </p>
      </GlassPanel>
    </Transition>
  </Teleport>
</template>
