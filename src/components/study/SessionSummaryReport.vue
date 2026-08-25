<script setup lang="ts">
import { computed } from 'vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseCard from '@/components/ui/BaseCard.vue';

const props = defineProps<{
  totalStudied: number;
  accuracy: number;
  elapsedMs: number;
}>();

defineEmits<{
  'back-to-topic': [];
  'study-another': [];
}>();

const accuracyPercent = computed(() => Math.round(props.accuracy * 100));

const timeSpentLabel = computed(() => {
  const totalSeconds = Math.round(props.elapsedMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
});
</script>

<template>
  <div class="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-6 text-center">
    <div>
      <p class="text-base font-medium text-text">Session complete!</p>
      <p class="mt-1 text-sm text-text/50">
        You studied {{ totalStudied }} card{{ totalStudied === 1 ? '' : 's' }} this batch.
      </p>
    </div>

    <div class="grid w-full grid-cols-3 gap-3">
      <BaseCard class="text-center">
        <p class="text-xl font-semibold text-primary">{{ accuracyPercent }}%</p>
        <p class="text-xs text-text/50">Mastery</p>
      </BaseCard>
      <BaseCard class="text-center">
        <p class="text-xl font-semibold text-text">{{ totalStudied }}</p>
        <p class="text-xs text-text/50">Cards</p>
      </BaseCard>
      <BaseCard class="text-center">
        <p class="text-xl font-semibold text-text">{{ timeSpentLabel }}</p>
        <p class="text-xs text-text/50">Time</p>
      </BaseCard>
    </div>

    <div class="flex w-full flex-col gap-3">
      <BaseButton
        variant="primary"
        block
        @click="$emit('study-another')"
      >
        Study Another Batch
      </BaseButton>
      <BaseButton
        variant="ghost"
        block
        @click="$emit('back-to-topic')"
      >
        Back to Topic
      </BaseButton>
    </div>
  </div>
</template>
