<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import AiSparkleIcon from '@/components/app/AiSparkleIcon.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
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
  <div class="min-h-screen bg-background px-4 py-6 pb-18.75">
    <h1 class="mb-1 text-2xl font-bold text-text">Flashcards</h1>
    <p class="mb-6 text-sm text-text/50">Your offline vocabulary trainer</p>

    <p v-if="!isReady" class="text-sm text-text/50">
      Loading…
    </p>

    <template v-else>
      <BaseButton variant="primary" block class="relative mb-8" to="/study">
        <span class="pointer-events-none absolute top-1 left-1 h-3 w-3 rounded-tl border-t border-l border-card-gold/60" />
        <span class="pointer-events-none absolute top-1 right-1 h-3 w-3 rounded-tr border-t border-r border-card-gold/60" />
        <span class="pointer-events-none absolute bottom-1 left-1 h-3 w-3 rounded-bl border-b border-l border-card-gold/60" />
        <span class="pointer-events-none absolute right-1 bottom-1 h-3 w-3 rounded-br border-r border-b border-card-gold/60" />
        Start Studying
      </BaseButton>

      <section class="relative mb-8 rounded-2xl border border-card-gold/20 bg-card-surface p-6 py-5">
        <span class="pointer-events-none absolute top-3 left-3 h-4 w-4 rounded-tl border-t border-l border-card-gold/60" />
        <span class="pointer-events-none absolute top-3 right-3 h-4 w-4 rounded-tr border-t border-r border-card-gold/60" />
        <span class="pointer-events-none absolute bottom-3 left-3 h-4 w-4 rounded-bl border-b border-l border-card-gold/60" />
        <span class="pointer-events-none absolute right-3 bottom-3 h-4 w-4 rounded-br border-r border-b border-card-gold/60" />

        <div class="mb-2 flex items-center justify-between">
          <h2 class="font-serif text-lg font-bold text-card-gold">Decks</h2>
          <BaseButton
            variant="link"
            size="sm"
            to="/cards/new"
            class="text-card-gold! hover:text-card-gold/70!"
          >
            <AppIcon icon-name="Add" :size="14" />
            Add Card
          </BaseButton>
        </div>
        <ul class="divide-y divide-card-gold/10 border-t border-card-gold/10">
          <li v-for="deck in deckStore.decks" :key="deck.id">
            <RouterLink
              :to="`/cards?deck=${deck.id}`"
              class="-mx-1 flex items-center justify-between rounded-lg px-1 py-3 hover:bg-card-definition"
            >
              <span class="text-sm text-text">{{ deck.name }}</span>
              <span class="text-xs text-card-muted">{{ deckCardCount(deck.id) }} cards</span>
            </RouterLink>
          </li>
          <li v-if="deckStore.decks.length === 0" class="px-1 py-3 text-sm text-card-muted">
            No decks yet.
          </li>
        </ul>
      </section>

      <section>
        <h2 class="mb-2 text-sm font-semibold text-text">Sections</h2>
        <div class="grid grid-cols-2 gap-3">
          <BaseButton variant="tile" to="/cards">
            <span class="flex flex-row items-center gap-1.5">
              <AppIcon icon-name="DocumentText" :size="18" :viewBox="'0 0 23 23'" />
              Browse Cards
            </span>
          </BaseButton>
          <BaseButton variant="tile" to="/cards/new">
            <span class="flex flex-row items-center gap-1.5">
              <AppIcon icon-name="AddSquare" :size="18" :viewBox="'0 0 23 23'" />
              Card Creator
            </span>
          </BaseButton>
          <BaseButton variant="tile" to="/decks">
            <span class="flex flex-row items-center gap-1.5">
              <AppIcon icon-name="Folder2" :size="18" :viewBox="'0 0 23 23'" />
              Deck Management
            </span>
          </BaseButton>
          <BaseButton variant="tile" to="/study">
            <span class="flex flex-row items-center gap-1.5 ">
              <AppIcon icon-name="RefreshCircle" :size="18" :viewBox="'0 0 23 23'" />
              Study
            </span>
          </BaseButton>
          <BaseButton variant="tile" to="/ai-quiz">
            <span class="flex flex-row items-center gap-1.5">
              <AiSparkleIcon :size="18" />
              AI Quiz Generator
            </span>
          </BaseButton>

          <BaseButton variant="tile" to="/data-management">
            <span class="flex flex-row items-center gap-1.5">
              <AppIcon icon-name="Import" :size="18" />
              Data &amp; Backups
            </span>
          </BaseButton>
        </div>
      </section>
    </template>
  </div>
</template>
