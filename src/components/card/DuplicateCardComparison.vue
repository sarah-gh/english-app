<script setup lang="ts">
import type { DuplicateCardSide } from '@/types/duplicate-card';
import { stripHtmlToText } from '@/utils/html';

withDefaults(
  defineProps<{
    existing: DuplicateCardSide;
    incoming: DuplicateCardSide;
    /** Caption under the "Existing" heading, e.g. "Already in your library". */
    matchLabel?: string;
    summaryLength?: number;
  }>(),
  { matchLabel: undefined, summaryLength: 160 },
);

function location(side: DuplicateCardSide): string {
  return side.topicName ? `${side.deckName} › ${side.topicName}` : side.deckName;
}

function summarize(html: string, max: number): string {
  const plain = stripHtmlToText(html);
  if (plain.length === 0) return 'No answer text.';
  return plain.length > max ? `${plain.slice(0, max - 1)}…` : plain;
}

function formatCreatedAt(createdAt: number): string {
  return new Date(createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
</script>

<template>
  <div class="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
    <div class="border-text/10 rounded border p-2.5">
      <div class="mb-1 flex items-baseline justify-between gap-2">
        <p class="text-text/70 font-semibold">Existing card</p>
        <span
          v-if="existing.createdAt"
          class="text-text/40 shrink-0"
        >
          Added {{ formatCreatedAt(existing.createdAt) }}
        </span>
      </div>
      <p class="text-text/50">{{ location(existing) }}</p>
      <p
        v-if="matchLabel"
        class="text-text/40 mt-0.5 italic"
      >
        {{ matchLabel }}
      </p>
      <p class="text-text/80 mt-1">{{ summarize(existing.summary, summaryLength) }}</p>
    </div>

    <div class="border-primary/30 bg-primary/5 rounded border p-2.5">
      <p class="text-text/70 mb-1 font-semibold">Incoming card</p>
      <p class="text-text/50">{{ location(incoming) }}</p>
      <p class="text-text/80 mt-1">{{ summarize(incoming.summary, summaryLength) }}</p>
    </div>
  </div>
</template>
