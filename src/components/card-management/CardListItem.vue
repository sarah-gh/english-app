<script setup lang="ts">
import { computed, ref } from 'vue';
import ConfirmDialog from '@/components/app/ConfirmDialog.vue';
import PartsOfSpeechDisplay from '@/components/card/PartsOfSpeechDisplay.vue';
import WordFamilyDisplay from '@/components/card/WordFamilyDisplay.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseCard from '@/components/ui/BaseCard.vue';
import BaseExpandableContent from '@/components/ui/BaseExpandableContent.vue';
import BaseTag from '@/components/ui/BaseTag.vue';
import { useCardAudio } from '@/composables/useCardAudio';
import { useCardStore } from '@/stores/card-store';
import { useDeckStore } from '@/stores/deck-store';
import { useTagStore } from '@/stores/tag-store';
import type { Card, ReviewStatus } from '@/types/card';
import type { CardViewMode } from '@/types/view-mode';

const props = defineProps<{
  card: Card;
  viewMode: CardViewMode;
}>();

const cardStore = useCardStore();
const deckStore = useDeckStore();
const tagStore = useTagStore();
const { playCardAudio } = useCardAudio();

const isRevealed = ref(false);
const isConfirmingDelete = ref(false);

const showAnswer = computed(() => props.viewMode === 'study' || isRevealed.value);

const deckName = computed(() => deckStore.getById(props.card.deckId)?.name ?? 'Unknown deck');

const cardTags = computed(() =>
  props.card.tagIds.map((id) => tagStore.getById(id)).filter((tag) => Boolean(tag)),
);

const STATUS_LABELS: Record<ReviewStatus, string> = {
  new: 'New',
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};

const STATUS_BADGE_CLASSES: Record<ReviewStatus, string> = {
  new: 'bg-text/8 text-text/50',
  easy: 'bg-primary/15 text-primary',
  medium: 'bg-secondary text-text',
  hard: 'bg-accent/15 text-accent',
};

async function handleDelete() {
  await cardStore.remove(props.card.id);
  isConfirmingDelete.value = false;
}
</script>

<template>
  <BaseCard>
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <p class="truncate font-medium text-text">{{ card.frontTitle }}</p>
        <p class="mt-0.5 flex items-center gap-1.5 text-xs text-text/50">
          {{ deckName }}
          <span
            class="rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase"
            :class="STATUS_BADGE_CLASSES[card.reviewStatus]"
          >
            {{ STATUS_LABELS[card.reviewStatus] }}
          </span>
        </p>
      </div>
      <div class="flex shrink-0 items-center gap-1">
        <button
          type="button"
          aria-label="Play audio"
          class="rounded-full border border-text/20 p-2 text-text/60 hover:border-primary hover:text-primary"
          @click="playCardAudio(card)"
        >
          <AppIcon
            icon-name="VolumeHigh"
            :size="16"
          />
        </button>
        <BaseButton
          variant="ghost"
          size="sm"
          :to="`/cards/${card.id}/edit`"
        >
          <AppIcon
            icon-name="Edit2"
            :size="14"
          />
          Edit
        </BaseButton>
        <BaseButton
          variant="ghost"
          size="sm"
          danger
          @click="isConfirmingDelete = true"
        >
          <AppIcon
            icon-name="Trash"
            :size="14"
          />
          Delete
        </BaseButton>
      </div>
    </div>

    <BaseExpandableContent>
      <div
        v-if="cardTags.length > 0"
        class="mt-2 flex flex-wrap gap-1.5"
      >
        <BaseTag
          v-for="tag in cardTags"
          :key="tag!.id"
          :label="tag!.name"
          :color="tag!.color"
        />
      </div>

      <PartsOfSpeechDisplay
        v-if="card.partsOfSpeech && card.partsOfSpeech.length > 0"
        :entries="card.partsOfSpeech"
        :view-mode="viewMode"
        :front-title="card.frontTitle"
        class="mt-3"
      />

      <template v-if="card.wordFamily">
        <WordFamilyDisplay
          v-if="showAnswer"
          :data="card.wordFamily"
          class="mt-3"
        />
        <button
          v-else
          type="button"
          class="mt-3 w-full rounded border border-dashed border-text/20 py-2 text-xs font-medium text-text/50 hover:border-primary hover:text-primary"
          @click="isRevealed = true"
        >
          Show Word Family
        </button>
      </template>
      <template v-else>
        <template v-if="showAnswer">
          <p class="mt-3 text-sm text-text">{{ card.backAnswer }}</p>
          <ul
            v-if="card.examples.length > 0"
            class="mt-2 space-y-0.5"
          >
            <li
              v-for="(example, index) in card.examples"
              :key="index"
              class="text-xs text-text/50"
            >
              “{{ example }}”
            </li>
          </ul>

          <p
            v-if="card.synonyms.length > 0"
            class="mt-2 text-xs text-text/50"
          >
            <span class="font-medium text-text/70">Synonyms:</span> {{ card.synonyms.join(', ') }}
          </p>
          <p
            v-if="card.antonyms.length > 0"
            class="mt-0.5 text-xs text-text/50"
          >
            <span class="font-medium text-text/70">Antonyms:</span> {{ card.antonyms.join(', ') }}
          </p>
        </template>
        <button
          v-else
          type="button"
          class="mt-3 w-full rounded border border-dashed border-text/20 py-2 text-xs font-medium text-text/50 hover:border-primary hover:text-primary"
          @click="isRevealed = true"
        >
          Show Answer
        </button>
      </template>
    </BaseExpandableContent>

    <ConfirmDialog
      v-if="isConfirmingDelete"
      title="Delete this card?"
      :message="`“${card.frontTitle}” will be permanently deleted. This can't be undone.`"
      confirm-label="Delete"
      variant="danger"
      @confirm="handleDelete"
      @cancel="isConfirmingDelete = false"
    />
  </BaseCard>
</template>
