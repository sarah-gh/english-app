<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import DeckGrid from '@/components/browse/DeckGrid.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import { useCardStore } from '@/stores/card-store';
import { useDeckStore } from '@/stores/deck-store';
import { useTopicStore } from '@/stores/topic-store';

const cardStore = useCardStore();
const deckStore = useDeckStore();
const topicStore = useTopicStore();

const isReady = ref(false);

onMounted(async () => {
  await Promise.all([cardStore.ensureLoaded(), deckStore.ensureLoaded(), topicStore.ensureLoaded()]);
  isReady.value = true;
});

function cardCountFor(deckId: string): number {
  return cardStore.byDeck(deckId).length;
}

function topicCountFor(deckId: string): number {
  return topicStore.byDeck(deckId).length;
}
</script>

<template>
  <div class="min-h-screen bg-background px-4 pt-6 pb-3">
    <RouterLink
      to="/"
      class="mb-4 inline-flex items-center gap-1 text-sm text-text/50 hover:text-primary"
    >
      <AppIcon
        icon-name="ArrowLeft"
        :size="14"
      />
      Dashboard
    </RouterLink>

    <div class="mb-4 flex items-center justify-between">
      <h1 class="text-xl font-semibold text-text">Browse Cards</h1>
      <div class="flex items-center gap-2">
        <BaseButton
          variant="secondary"
          size="sm"
          to="/cards/import"
        >
          <AppIcon
            icon-name="DocumentUpload"
            :size="14"
          />
          Import
        </BaseButton>
        <BaseButton
          variant="primary"
          size="sm"
          to="/cards/new"
        >
          <AppIcon
            icon-name="Add"
            :size="14"
          />
          Add Card
        </BaseButton>
      </div>
    </div>

    <p
      v-if="!isReady"
      class="text-sm text-text/50"
    >
      Loading…
    </p>
    <template v-else>
      <p class="mb-3 text-xs text-text/50">Choose a deck to browse its topics.</p>
      <DeckGrid
        :decks="deckStore.decks"
        :card-count-for="cardCountFor"
        :topic-count-for="topicCountFor"
      />
      <p
        v-if="deckStore.decks.length === 0"
        class="rounded-lg border border-text/20 py-8 text-center text-sm text-text/35"
      >
        No decks yet. Create a card to get started.
      </p>
    </template>
  </div>
</template>
