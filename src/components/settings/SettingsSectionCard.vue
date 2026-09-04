<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string;
    description?: string;
    /** Tailwind classes for the icon badge's background + icon color. */
    badgeClass?: string;
  }>(),
  {
    description: undefined,
    badgeClass: 'bg-primary/10 text-primary',
  },
);
</script>

<template>
  <div class="mb-4 rounded-2xl border border-text/10 bg-card-surface p-5">
    <div class="mb-4 flex items-start gap-3">
      <div
        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
        :class="badgeClass"
      >
        <slot name="icon" />
      </div>
      <div class="min-w-0">
        <h2 class="text-base font-semibold text-text">{{ title }}</h2>
        <p
          v-if="description"
          class="mt-0.5 text-xs text-text/60"
        >
          {{ description }}
        </p>
      </div>
    </div>
    <slot />
  </div>
</template>
