<script setup lang="ts">
import { ref } from 'vue';
import BaseFlipCard from '@/components/ui/BaseFlipCard.vue';
import { useSpeech } from '@/composables/useSpeech';
import type { PartOfSpeechEntry } from '@/types/card';
import type { CardViewMode } from '@/types/view-mode';
import { capitalizeFirstLetter } from '@/utils/text';

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

const { speak, isSupported: isTtsSupported } = useSpeech();

const revealedIds = ref<Set<string>>(new Set());

/** Practice mode reveals one POS entry at a time, the Role-Specific Recall challenge. Each
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
    class="space-y-2 pb-2"
  >
    <p class="text-card-gold text-xs font-medium uppercase">Word Forms &amp; Derivatives</p>

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
          class="border-card-gold/30 bg-card-definition text-card-muted hover:border-primary hover:text-primary flex h-full w-full items-center justify-center rounded-lg border border-dashed py-2 text-xs font-medium"
          @pointerdown.stop
          @click.stop="setRevealed(entry.id, true)"
        >
          {{ capitalizeFirstLetter(frontTitle) }} (as {{ posLabel(entry.pos) }})
        </button>
      </template>
      <template #back>
        <div class="border-card-gold/20 bg-card-definition h-full w-full rounded-lg border p-3">
          <div class="flex items-start gap-2">
            <!-- Wraps onto a second line on narrow screens so a long word form or IPA never pushes
                 the speaker button out of the block. -->
            <div class="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
              <span
                class="bg-card-gold/20 text-card-gold shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase"
              >
                {{ entry.pos }}
              </span>
              <span
                v-if="entry.wordForm"
                class="text-text text-sm font-semibold wrap-break-word"
              >
                {{ entry.wordForm }}
              </span>
              <span
                v-if="entry.ipa"
                class="text-card-muted text-xs break-all"
              >
                {{ entry.ipa }}
              </span>
            </div>
            <!-- .stop keeps the tap from also flipping this entry's card closed. -->
            <button
              v-if="entry.wordForm && isTtsSupported"
              type="button"
              :disabled="!interactive"
              :aria-label="`Pronounce ${entry.wordForm}`"
              title="Speak (TTS)"
              class="text-card-gold hover:bg-card-gold/15 -m-1 shrink-0 rounded-full p-1.5 transition-colors disabled:pointer-events-none"
              @pointerdown.stop
              @click.stop="speak(entry.wordForm)"
            >
              <AppIcon
                icon-name="VolumeHigh"
                :size="16"
              />
            </button>
          </div>
          <p class="text-text mt-1 text-sm">{{ entry.definition }}</p>
          <ul
            v-if="entry.examples && entry.examples.length > 0"
            class="mt-1 space-y-0.5"
          >
            <li
              v-for="(example, index) in entry.examples"
              :key="index"
              class="text-card-muted text-xs"
            >
              “{{ example }}”
            </li>
          </ul>
        </div>
      </template>
    </BaseFlipCard>
  </div>
</template>
