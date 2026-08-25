<script setup lang="ts">
import type { Deck } from '@/types/deck';
import DeckGridItem from './DeckGridItem.vue';

defineProps<{
  decks: Deck[];
  cardCountFor: (deckId: string) => number;
  topicCountFor: (deckId: string) => number;
}>();
</script>

<template>
  <div class="grid grid-cols-2 gap-3">
    <DeckGridItem
      v-for="deck in decks"
      :key="deck.id"
      :name="deck.name"
      :card-count="cardCountFor(deck.id)"
      :topic-count="topicCountFor(deck.id)"
      :to="`/cards/${deck.id}`"
    />
  </div>
</template>
