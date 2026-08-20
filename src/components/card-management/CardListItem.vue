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

async function handleDelete() {
  await cardStore.remove(props.card.id);
  isConfirmingDelete.value = false;
}
</script>

<template>
  <BaseCard>
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <p class="truncate font-medium text-black">{{ card.frontTitle }}</p>
        <p class="mt-0.5 text-xs text-gray-500">
          {{ deckName }} · <span class="font-medium">{{ STATUS_LABELS[card.reviewStatus] }}</span>
        </p>
      </div>
      <div class="flex shrink-0 items-center gap-1">
        <button
          type="button"
          aria-label="Play audio"
          class="rounded-full border border-gray-300 p-2 text-gray-600 hover:border-black hover:text-black"
          @click="playCardAudio(card)"
        >
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              d="M4 9v6h4l5 5V4L8 9H4zm11.5 3a3.5 3.5 0 0 0-2-3.16v6.32a3.5 3.5 0 0 0 2-3.16z"
            />
          </svg>
        </button>
        <BaseButton
          variant="ghost"
          size="sm"
          :to="`/cards/${card.id}/edit`"
        >
          Edit
        </BaseButton>
        <BaseButton
          variant="ghost"
          size="sm"
          muted
          @click="isConfirmingDelete = true"
        >
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
          class="mt-3 w-full rounded border border-dashed border-gray-300 py-2 text-xs font-medium text-gray-500 hover:border-black hover:text-black"
          @click="isRevealed = true"
        >
          Show Word Family
        </button>
      </template>
      <template v-else>
        <template v-if="showAnswer">
          <p class="mt-3 text-sm text-black">{{ card.backAnswer }}</p>
          <ul
            v-if="card.examples.length > 0"
            class="mt-2 space-y-0.5"
          >
            <li
              v-for="(example, index) in card.examples"
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
          class="mt-3 w-full rounded border border-dashed border-gray-300 py-2 text-xs font-medium text-gray-500 hover:border-black hover:text-black"
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
      @confirm="handleDelete"
      @cancel="isConfirmingDelete = false"
    />
  </BaseCard>
</template>
