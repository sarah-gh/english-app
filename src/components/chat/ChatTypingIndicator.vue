<script setup lang="ts">
import GlassPanel from '@/components/chat/GlassPanel.vue';
</script>

<template>
  <GlassPanel
    class="flex w-fit items-center gap-1 rounded-2xl rounded-bl-md px-4 py-3"
    role="status"
    aria-label="The tutor is typing"
  >
    <span
      v-for="delay in ['0ms', '150ms', '300ms']"
      :key="delay"
      class="h-1.5 w-1.5 animate-bounce rounded-full bg-text/50"
      :style="{ animationDelay: delay }"
    />
  </GlassPanel>
</template>
