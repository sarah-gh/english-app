<script setup lang="ts">
import BaseCard from '@/components/ui/BaseCard.vue';

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
  <BaseCard class="text-center">
    <p
      class="text-2xl font-semibold"
      :class="valueClass"
    >
      {{ value }}
    </p>
    <p class="text-xs text-text/50">{{ label }}</p>
  </BaseCard>
</template>
