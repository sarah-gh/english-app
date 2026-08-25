<script setup lang="ts">
import type { POSDetail, WordFamilyData } from '@/types/card';

defineProps<{
  data: WordFamilyData;
  /** POS key to visually emphasize — used by the review session's "Form Challenge" so the asked
   *  form stands out once revealed. */
  highlight?: 'noun' | 'verb' | 'adjective' | 'adverb';
}>();

const SECTIONS: { key: 'noun' | 'verb' | 'adjective' | 'adverb'; label: string }[] = [
  { key: 'noun', label: 'Noun' },
  { key: 'verb', label: 'Verb' },
  { key: 'adjective', label: 'Adjective' },
  { key: 'adverb', label: 'Adverb' },
];

function hasDetail(detail: POSDetail | undefined): detail is POSDetail {
  return Boolean(detail?.word);
}
</script>

<template>
  <div class="space-y-2">
    <div
      v-for="section in SECTIONS"
      v-show="hasDetail(data[section.key])"
      :key="section.key"
      class="rounded border p-2"
      :class="highlight === section.key ? 'border-secondary bg-secondary/10' : 'border-text/10'"
    >
      <div class="flex items-center gap-2">
        <span class="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-bold text-text uppercase">
          {{ section.label }}
        </span>
        <span class="text-sm font-semibold text-text">{{ data[section.key]?.word }}</span>
        <span
          v-if="highlight === section.key"
          class="text-[10px] font-medium text-text/50 uppercase"
          >asked form</span
        >
      </div>
      <p
        v-if="data[section.key]?.meaning"
        class="mt-1 text-sm text-text/70"
      >
        {{ data[section.key]?.meaning }}
      </p>
      <p
        v-if="data[section.key]?.example"
        class="mt-1 text-xs text-text/50"
      >
        “{{ data[section.key]?.example }}”
      </p>
    </div>

    <p
      v-if="data.usageNotes"
      class="rounded border border-text/10 bg-text/5 p-2 text-xs text-text/60"
    >
      <span class="font-medium text-text">Usage notes:</span> {{ data.usageNotes }}
    </p>
  </div>
</template>
