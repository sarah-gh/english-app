<script setup lang="ts">
import { ref } from 'vue';
import BaseFlipCard from '@/components/ui/BaseFlipCard.vue';
import type { PartOfSpeechEntry } from '@/types/card';
import type { CardViewMode } from '@/types/view-mode';

const props = withDefaults(
  defineProps<{
    entries: PartOfSpeechEntry[];
    viewMode: CardViewMode;
    frontTitle: string;
    /** false only for the non-interactive "peek" card behind the active one in the review stack. */
    interactive?: boolean;
  }>(),
  {
    interactive: true,
  },
);

const revealedIds = ref<Set<string>>(new Set());

/** Practice mode reveals one POS entry at a time — the Role-Specific Recall challenge. Each
 *  entry's flip card can also be tapped closed again once revealed, independently of the rest. */
function setRevealed(id: string, revealed: boolean) {
  if (!props.interactive) return;
  const next = new Set(revealedIds.value);
  if (revealed) next.add(id);
  else next.delete(id);
  revealedIds.value = next;
}

function posLabel(pos: string): string {
  return pos.charAt(0).toUpperCase() + pos.slice(1);
}
</script>

<template>
  <div
    v-if="entries.length > 0"
    class="space-y-2"
  >
    <p class="text-xs font-medium text-card-gold uppercase">Parts of Speech</p>

    <BaseFlipCard
      v-for="entry in entries"
      :key="entry.id"
      :flipped="viewMode === 'study' || revealedIds.has(entry.id)"
      :interactive="interactive"
      @update:flipped="(value) => setRevealed(entry.id, value)"
    >
      <template #front>
        <button
          type="button"
          class="flex h-full w-full items-center justify-center rounded-lg border border-dashed border-card-gold/30 bg-card-definition py-2 text-xs font-medium text-card-muted hover:border-primary hover:text-primary"
          @pointerdown.stop
          @click.stop="setRevealed(entry.id, true)"
        >
          {{ frontTitle }} (as {{ posLabel(entry.pos) }})
        </button>
      </template>
      <template #back>
        <div class="h-full w-full rounded-lg border border-card-gold/20 bg-card-definition p-3">
          <div class="flex items-center gap-2">
            <span class="rounded bg-card-gold/20 px-1.5 py-0.5 text-[10px] font-bold text-card-gold uppercase">
              {{ entry.pos }}
            </span>
            <span
              v-if="entry.wordForm"
              class="text-sm font-semibold text-text"
            >
              {{ entry.wordForm }}
            </span>
            <span
              v-if="entry.ipa"
              class="text-xs text-card-muted"
            >
              {{ entry.ipa }}
            </span>
          </div>
          <p class="mt-1 text-sm text-text">{{ entry.definition }}</p>
          <ul
            v-if="entry.examples && entry.examples.length > 0"
            class="mt-1 space-y-0.5"
          >
            <li
              v-for="(example, index) in entry.examples"
              :key="index"
              class="text-xs text-card-muted"
            >
              “{{ example }}”
            </li>
          </ul>
        </div>
      </template>
    </BaseFlipCard>
  </div>
</template>
