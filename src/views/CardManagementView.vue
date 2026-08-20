<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import CardListItem from '@/components/card-management/CardListItem.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseInput from '@/components/ui/BaseInput.vue';
import BaseSegmentedToggle from '@/components/ui/BaseSegmentedToggle.vue';
import BaseSelect from '@/components/ui/BaseSelect.vue';
import BaseTag from '@/components/ui/BaseTag.vue';
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
      <BaseSegmentedToggle
        v-model="viewMode"
        class="mb-4"
        size="sm"
        :options="[
          { value: 'study', label: 'Study' },
          { value: 'practice', label: 'Practice' },
        ]"
      />

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
        <BaseTag
          v-for="tag in tagStore.tags"
          :key="tag.id"
          :label="tag.name"
          :color="tag.color"
          selectable
          :selected="selectedTagIds.includes(tag.id)"
          @click="toggleTagFilter(tag.id)"
        />
      </div>

      <p class="mb-3 text-xs text-gray-500">
        {{ filteredCards.length }} card{{ filteredCards.length === 1 ? '' : 's' }}
      </p>

      <div class="space-y-3 max-h-150 overflow-y-auto">
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
