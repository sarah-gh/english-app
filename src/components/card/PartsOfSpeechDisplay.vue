<script setup lang="ts">
import { ref } from 'vue';
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

/** Practice mode reveals one POS entry at a time — the Role-Specific Recall challenge. */
function reveal(id: string) {
  if (!props.interactive) return;
  revealedIds.value = new Set(revealedIds.value).add(id);
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
    <p class="text-xs font-medium text-gray-500">Parts of Speech</p>

    <div
      v-for="entry in entries"
      :key="entry.id"
      class="rounded border border-gray-200 p-2"
    >
      <template v-if="viewMode === 'study' || revealedIds.has(entry.id)">
        <div class="flex items-center gap-2">
          <span class="rounded bg-black px-1.5 py-0.5 text-[10px] font-bold text-white uppercase">
            {{ entry.pos }}
          </span>
          <span
            v-if="entry.ipa"
            class="text-xs text-gray-500"
          >
            {{ entry.ipa }}
          </span>
        </div>
        <p class="mt-1 text-sm text-black">{{ entry.definition }}</p>
        <ul
          v-if="entry.examples && entry.examples.length > 0"
          class="mt-1 space-y-0.5"
        >
          <li
            v-for="(example, index) in entry.examples"
            :key="index"
            class="text-xs text-gray-500"
          >
            “{{ example }}”
          </li>
        </ul>
      </template>
      <button
        v-else
        type="button"
        class="w-full rounded border border-dashed border-gray-300 py-2 text-xs font-medium text-gray-500 hover:border-black hover:text-black"
        @pointerdown.stop
        @click.stop="reveal(entry.id)"
      >
        {{ frontTitle }} (as {{ posLabel(entry.pos) }})
      </button>
    </div>
  </div>
</template>
