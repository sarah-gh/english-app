<script setup lang="ts">
import GlassPanel from '@/components/chat/GlassPanel.vue';

defineProps<{ title: string; savedItemCount: number }>();
const emit = defineEmits<{ openSessions: []; newChat: [] }>();
</script>

<template>
  <GlassPanel
    as="header"
    class="sticky top-2 z-30 -mx-1 mt-2 mb-3 flex items-center gap-2 rounded-2xl px-2 py-2"
  >
    <button
      type="button"
      aria-label="Show all chats"
      class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-text/70 transition-colors hover:bg-text/10 hover:text-text"
      @click="emit('openSessions')"
    >
      <AppIcon
        icon-name="HambergerMenu"
        :size="20"
      />
    </button>
    <div class="min-w-0 flex-1">
      <h1 class="truncate text-base leading-tight font-semibold text-text">{{ title }}</h1>
      <p class="truncate text-xs text-text/50">
        AI Tutor · personalized with your {{ savedItemCount }} saved item{{
          savedItemCount === 1 ? '' : 's'
        }}
      </p>
    </div>
    <button
      type="button"
      aria-label="New chat"
      title="New chat"
      class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-primary transition-colors hover:bg-primary/10"
      @click="emit('newChat')"
    >
      <AppIcon
        icon-name="Edit2"
        :size="19"
      />
    </button>
  </GlassPanel>
</template>
