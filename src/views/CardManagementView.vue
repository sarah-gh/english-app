<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import CardListItem from '@/components/card-management/CardListItem.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseInput from '@/components/ui/BaseInput.vue';
import BaseSelect from '@/components/ui/BaseSelect.vue';
import { useCardStore } from '@/stores/card-store';
import { useDeckStore } from '@/stores/deck-store';
import { useTagStore } from '@/stores/tag-store';
import type { ReviewStatus } from '@/types/card';
import type { CardViewMode } from '@/types/view-mode';

const route = useRoute();
const cardStore = useCardStore();
const deckStore = useDeckStore();
const tagStore = useTagStore();

const isReady = ref(false);
const searchQuery = ref('');
const selectedDeckId = ref('');
const selectedStatus = ref<ReviewStatus | ''>('');
const selectedTagIds = ref<string[]>([]);
const viewMode = ref<CardViewMode>('study');

onMounted(async () => {
  await Promise.all([cardStore.ensureLoaded(), deckStore.ensureLoaded(), tagStore.ensureLoaded()]);
  const deckIdParam = route.query.deckId;
  if (typeof deckIdParam === 'string') selectedDeckId.value = deckIdParam;
  isReady.value = true;
});

function toggleTagFilter(id: string) {
  selectedTagIds.value = selectedTagIds.value.includes(id)
    ? selectedTagIds.value.filter((tagId) => tagId !== id)
    : [...selectedTagIds.value, id];
}

const filteredCards = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  return cardStore.cards.filter((card) => {
    if (selectedDeckId.value && card.deckId !== selectedDeckId.value) return false;
    if (selectedStatus.value && card.reviewStatus !== selectedStatus.value) return false;
    if (
      selectedTagIds.value.length > 0 &&
      !selectedTagIds.value.some((id) => card.tagIds.includes(id))
    ) {
      return false;
    }
    if (query) {
      const haystack = `${card.frontTitle} ${card.backAnswer} ${card.hint ?? ''}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
});
</script>

<template>
  <div class="min-h-screen bg-white px-4 py-6">
    <RouterLink
      to="/"
      class="mb-4 inline-block text-sm text-gray-500 hover:text-black"
    >
      ← Dashboard
    </RouterLink>

    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-xl font-semibold text-black">Cards</h1>
      <BaseButton
        variant="primary"
        size="sm"
        to="/cards/new"
      >
        + Add Card
      </BaseButton>
    </div>

    <p
      v-if="!isReady"
      class="text-sm text-gray-500"
    >
      Loading…
    </p>

    <template v-else>
      <div class="mb-4 flex rounded-lg border border-black p-1">
        <button
          type="button"
          class="flex-1 rounded py-1.5 text-xs font-medium transition-colors"
          :class="viewMode === 'study' ? 'bg-black text-white' : 'text-black hover:bg-gray-100'"
          @click="viewMode = 'study'"
        >
          Study
        </button>
        <button
          type="button"
          class="flex-1 rounded py-1.5 text-xs font-medium transition-colors"
          :class="viewMode === 'practice' ? 'bg-black text-white' : 'text-black hover:bg-gray-100'"
          @click="viewMode = 'practice'"
        >
          Practice
        </button>
      </div>

      <BaseInput
        v-model="searchQuery"
        type="search"
        placeholder="Search title, answer, or hint…"
        class="mb-3"
      />

      <div class="mb-3 flex gap-2">
        <BaseSelect
          v-model="selectedDeckId"
          class="w-full"
        >
          <option value="">All decks</option>
          <option
            v-for="deck in deckStore.decks"
            :key="deck.id"
            :value="deck.id"
          >
            {{ deck.name }}
          </option>
        </BaseSelect>
        <BaseSelect
          v-model="selectedStatus"
          class="w-full"
        >
          <option value="">All statuses</option>
          <option value="new">New</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </BaseSelect>
      </div>

      <div
        v-if="tagStore.tags.length > 0"
        class="mb-4 flex flex-wrap gap-2"
      >
        <button
          v-for="tag in tagStore.tags"
          :key="tag.id"
          type="button"
          class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors"
          :class="
            selectedTagIds.includes(tag.id)
              ? 'border-black bg-black text-white'
              : 'border-gray-300 text-gray-700 hover:border-black'
          "
          @click="toggleTagFilter(tag.id)"
        >
          <span
            class="h-2 w-2 rounded-full"
            :style="{ backgroundColor: tag.color }"
          />
          {{ tag.name }}
        </button>
      </div>

      <p class="mb-3 text-xs text-gray-500">
        {{ filteredCards.length }} card{{ filteredCards.length === 1 ? '' : 's' }}
      </p>

      <div class="space-y-3">
        <CardListItem
          v-for="card in filteredCards"
          :key="card.id"
          :card="card"
          :view-mode="viewMode"
        />
        <p
          v-if="filteredCards.length === 0"
          class="rounded-lg border border-gray-300 py-8 text-center text-sm text-gray-400"
        >
          No cards match these filters.
        </p>
      </div>
    </template>
  </div>
</template>
