<script setup lang="ts">
import { computed, watch } from 'vue';
import BaseSelect from '@/components/ui/BaseSelect.vue';
import { useDeckStore } from '@/stores/deck-store';
import { useTopicStore } from '@/stores/topic-store';

const props = defineProps<{
  questionCount: number;
  deckId: string;
  topicId: string;
}>();

const emit = defineEmits<{
  'update:questionCount': [value: number];
  'update:deckId': [value: string];
  'update:topicId': [value: string];
}>();

const deckStore = useDeckStore();
const topicStore = useTopicStore();

/** Clears the topic filter when it no longer belongs to the selected deck (including when the
 *  deck is cleared back to "All decks", which has no topics of its own). */
watch(
  () => props.deckId,
  (deckId) => {
    if (!props.topicId) return;
    if (!topicStore.byDeck(deckId).some((topic) => topic.id === props.topicId)) {
      emit('update:topicId', '');
    }
  },
);

const topicsForSelectedDeck = computed(() => (props.deckId ? topicStore.byDeck(props.deckId) : []));

const deckOptions = computed(() => [
  { value: '', label: 'All decks' },
  ...deckStore.decks.map((deck) => ({ value: deck.id, label: deck.name })),
]);

const topicOptions = computed(() => [
  { value: '', label: 'All topics' },
  ...topicsForSelectedDeck.value.map((topic) => ({ value: topic.id, label: topic.name })),
]);

function setQuestionCount(rawValue: string) {
  const parsed = Math.round(Number(rawValue));
  emit('update:questionCount', Number.isFinite(parsed) ? Math.min(30, Math.max(1, parsed)) : 1);
}
</script>

<template>
  <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
    <div>
      <label for="question-count" class="mb-1.5 block font-serif text-sm font-bold text-card-gold">
        Questions
      </label>
      <input
        id="question-count"
        type="number"
        min="1"
        max="30"
        :value="questionCount"
        class="w-full rounded border border-card-gold/30 bg-card-surface px-2 py-1.5 text-sm text-text focus:border-card-gold focus:outline-none"
        @input="setQuestionCount(($event.target as HTMLInputElement).value)"
      />
    </div>
    <div>
      <p class="mb-1.5 font-serif text-sm font-bold text-card-gold">Deck</p>
      <BaseSelect
        :model-value="deckId"
        :options="deckOptions"
        trigger-class="bg-card-surface border-card-gold/20"
        chevron-class="text-card-gold"
        @update:model-value="emit('update:deckId', $event)"
      />
    </div>
    <div>
      <p class="mb-1.5 font-serif text-sm font-bold text-card-gold">Topic</p>
      <BaseSelect
        :model-value="topicId"
        :disabled="!deckId"
        :options="topicOptions"
        trigger-class="bg-card-surface border-card-gold/20"
        chevron-class="text-card-gold"
        @update:model-value="emit('update:topicId', $event)"
      />
    </div>
  </div>
</template>
