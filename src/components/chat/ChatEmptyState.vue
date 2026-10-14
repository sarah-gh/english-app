<script setup lang="ts">
import GlassPanel from '@/components/chat/GlassPanel.vue';

defineProps<{ savedItemCount: number }>();
</script>

<template>
  <GlassPanel class="mt-6 rounded-3xl px-5 py-8 text-center">
    <div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
      <AppIcon
        icon-name="Teacher"
        :size="26"
      />
    </div>
    <h2 class="text-base font-semibold text-text">Your personal English tutor</h2>
    <p class="mx-auto mt-1.5 max-w-xs text-sm text-text/60">
      <template v-if="savedItemCount > 0">
        I know the {{ savedItemCount }} item{{ savedItemCount === 1 ? '' : 's' }} you've saved, so
        ask me to practice them, explain grammar, or check your writing.
      </template>
      <template v-else>
        Ask me to explain grammar, check your writing, or practice new words. Save some cards and I
        can tailor practice to them.
      </template>
    </p>
  </GlassPanel>
</template>
