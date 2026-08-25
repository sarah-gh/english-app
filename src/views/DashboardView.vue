<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import AiSparkleIcon from '@/components/app/AiSparkleIcon.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseCard from '@/components/ui/BaseCard.vue';
import { useCardStore } from '@/stores/card-store';
import { useDeckStore } from '@/stores/deck-store';

const cardStore = useCardStore();
const deckStore = useDeckStore();

const isReady = ref(false);

onMounted(async () => {
  await Promise.all([cardStore.ensureLoaded(), deckStore.ensureLoaded()]);
  isReady.value = true;
});

function deckCardCount(deckId: string): number {
  return cardStore.byDeck(deckId).length;
}
</script>

<template>
  <div class="min-h-screen bg-background px-4 py-6">
    <h1 class="mb-1 text-xl font-semibold text-text">Flashcards</h1>
    <p class="mb-6 text-sm text-text/50">Your offline vocabulary trainer</p>

    <p v-if="!isReady" class="text-sm text-text/50">
      Loading…
    </p>

    <template v-else>
      <BaseButton variant="primary" block class="mb-8" to="/study">
        Start Studying
      </BaseButton>

      <section class="mb-8">
        <div class="mb-2 flex items-center justify-between">
          <h2 class="text-sm font-semibold text-text">Decks</h2>
          <BaseButton variant="link" size="sm" to="/cards/new">
            <AppIcon icon-name="Add" :size="14" />
            Add Card
          </BaseButton>
        </div>
        <BaseCard padding="none">
          <ul class="divide-y divide-text/10">
            <li v-for="deck in deckStore.decks" :key="deck.id">
              <RouterLink
                :to="`/cards/${deck.id}`"
                class="flex items-center justify-between px-4 py-3 hover:bg-primary/5">
                <span class="text-sm text-text">{{ deck.name }}</span>
                <span class="text-xs text-text/50">{{ deckCardCount(deck.id) }} cards</span>
              </RouterLink>
            </li>
            <li v-if="deckStore.decks.length === 0" class="px-4 py-3 text-sm text-text/35">
              No decks yet.
            </li>
          </ul>
        </BaseCard>
      </section>

      <section>
        <h2 class="mb-2 text-sm font-semibold text-text">Sections</h2>
        <div class="grid grid-cols-2 gap-3">
          <BaseButton variant="tile" to="/cards">
            <span class="flex flex-row items-center gap-1.5">
              <AppIcon icon-name="DocumentText" :size="20" :viewBox="'0 0 23 23'" />
              Browse Cards
            </span>
          </BaseButton>
          <BaseButton variant="tile" to="/cards/new">
            <span class="flex flex-row items-center gap-1.5">
              <AppIcon icon-name="AddSquare" :size="20" :viewBox="'0 0 23 23'"  />
              Card Creator
            </span>
          </BaseButton>
          <BaseButton variant="tile" to="/decks">
            <span class="flex flex-row items-center gap-1.5">
              <AppIcon icon-name="Folder2" :size="20" :viewBox="'0 0 23 23'"  />
              Deck Management
            </span>
          </BaseButton>
          <BaseButton variant="tile" to="/study">
            <span class="flex flex-row items-center gap-1.5 ">
              <AppIcon icon-name="RefreshCircle" :size="20" :viewBox="'0 0 23 23'"  />
              Study
            </span>
          </BaseButton>
          <BaseButton variant="tile" to="/ai-quiz">
            <span class="flex flex-row items-center gap-1.5">
              <AiSparkleIcon :size="20"  />
              AI Quiz Generator
            </span>
          </BaseButton>
        </div>
      </section>
    </template>
  </div>
</template>
