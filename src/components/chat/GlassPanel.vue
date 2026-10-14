<script setup lang="ts">
/** Frosted-glass surface shared by the AI Tutor Chat's header, bubbles, and composer, the same
 *  translucent-blur treatment as `BottomNav`, so the chat chrome reads as one family with it in
 *  both themes. */
withDefaults(defineProps<{ as?: string }>(), { as: 'div' });
</script>

<template>
  <component
    :is="as"
    class="border border-white/30 bg-white/60 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.25),inset_0_1px_1px_rgba(255,255,255,0.5)] backdrop-blur-md backdrop-saturate-150 dark:border-white/10 dark:bg-neutral-900/60 dark:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.06)]"
  >
    <slot />
  </component>
</template>
