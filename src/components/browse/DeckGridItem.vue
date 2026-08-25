<script setup lang="ts">
defineProps<{
  name: string;
  cardCount: number;
  topicCount: number;
  to: string;
}>();
</script>

<template>
  <RouterLink
    :to="to"
    class="flex flex-col gap-1 rounded-xl border border-text/10 bg-white/80 dark:bg-slate-900/80 p-4 hover:border-primary"
  >
    <span class="flex items-center justify-between gap-2">
      <span class="truncate text-sm font-medium text-text">{{ name }}</span>
      <AppIcon
        icon-name="ArrowRight2"
        :size="14"
        class="shrink-0 text-text/30"
      />
    </span>
    <span class="text-xs text-text/50">
      {{ topicCount }} topic{{ topicCount === 1 ? '' : 's' }} · {{ cardCount }} card{{ cardCount === 1 ? '' : 's' }}
    </span>
  </RouterLink>
</template>
