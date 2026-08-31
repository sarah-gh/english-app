<script setup lang="ts">
import { RouterLink } from 'vue-router';
</script>

<template>
  <RouterLink
    to="/study"
    class="relative mb-8 flex items-center gap-4 overflow-visible rounded-full border border-card-gold/20 bg-card-surface py-3 pr-5 pl-3 shadow-sm transition-transform hover:scale-[1.01] active:scale-[0.99]"
  >
    <span class="pointer-events-none absolute top-2 left-8 h-2 w-2 rotate-45 rounded-[2px] bg-card-gold/70" />
    <span class="pointer-events-none absolute top-4 -left-1 h-1 w-1 rounded-full bg-card-gold/50" />
    <span class="pointer-events-none absolute bottom-3 left-16 h-1.5 w-1.5 rotate-45 rounded-[2px] bg-card-gold/60" />
    <span class="pointer-events-none absolute right-20 -bottom-1 h-1 w-1 rounded-full bg-card-gold/40" />

    <span
      class="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#ffd580] via-[#e5a93c] to-[#b37a1f] shadow-[0_0_25px_rgba(212,163,89,0.5)]"
    >
      <AppIcon icon-name="Book1" type="bold" :size="26" color="#071518" />
    </span>

    <span class="flex flex-1 flex-col">
      <span class="text-xs font-medium text-card-gold/80 sm:text-sm">Ready to learn?</span>
      <span class="text-lg font-bold text-text sm:text-xl">Start Studying</span>
    </span>

    <AppIcon icon-name="ArrowRight2" :size="20" class="mr-1 shrink-0 text-card-gold" />
  </RouterLink>
</template>
