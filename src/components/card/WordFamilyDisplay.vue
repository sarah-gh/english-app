<script setup lang="ts">
import type { POSDetail, WordFamilyData } from '@/types/card';

defineProps<{
  data: WordFamilyData;
  /** POS key to visually emphasize, used by the review session's "Form Challenge" so the asked
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
      class="bg-card-definition rounded-lg p-3"
      :class="highlight === section.key ? 'ring-card-gold/60 ring-1' : ''"
    >
      <div class="flex items-center gap-2">
        <span
          class="bg-card-gold/20 text-card-gold rounded px-1.5 py-0.5 text-[10px] font-bold uppercase"
        >
          {{ section.label }}
        </span>
        <span class="text-text text-sm font-semibold">{{ data[section.key]?.word }}</span>
        <span
          v-if="highlight === section.key"
          class="text-card-muted text-[10px] font-medium uppercase"
          >asked form</span
        >
      </div>
      <p
        v-if="data[section.key]?.meaning"
        class="text-text/80 mt-1 text-sm"
      >
        {{ data[section.key]?.meaning }}
      </p>
      <p
        v-if="data[section.key]?.example"
        class="text-card-muted mt-1 text-xs"
      >
        “{{ data[section.key]?.example }}”
      </p>
    </div>

    <p
      v-if="data.usageNotes"
      class="bg-card-definition text-card-muted rounded-lg p-3 text-xs"
    >
      <span class="text-card-gold font-medium">Usage notes:</span> {{ data.usageNotes }}
    </p>
  </div>
</template>
