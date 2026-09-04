<script setup lang="ts">
import BorderedCard from '@/components/common/BorderedCard.vue';

withDefaults(
  defineProps<{
    value: number | string;
    label: string;
    valueClass?: string;
  }>(),
  {
    valueClass: 'text-primary',
  },
);
</script>

<template>
  <BorderedCard class="mb-0 text-center py-5! px-2!">

  <!-- <div class="rounded-2xl border border-slate-600 bg-card-surface p-4 text-center"> -->
    <div class="mb-2 flex justify-center" :class="valueClass">
      <slot name="icon" />
    </div>
    <p
      class="text-2xl font-semibold"
      :class="valueClass"
    >
      {{ value }}
    </p>
    <p class="text-xs text-card-muted">{{ label }}</p>
  <!-- </div> -->
   </BorderedCard>
</template>
