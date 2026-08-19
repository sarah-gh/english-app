<script setup lang="ts">
import { ref } from 'vue';
import { useDeckStore } from '@/stores/deck-store';

const deckId = defineModel<string>('deckId', { required: true });

const deckStore = useDeckStore();

const isCreating = ref(false);
const newDeckName = ref('');

async function createDeck() {
  const name = newDeckName.value.trim();
  if (!name) return;

  const deck = await deckStore.add({ name });
  deckId.value = deck.id;
  newDeckName.value = '';
  isCreating.value = false;
}
</script>

<template>
  <div>
    <label
      for="deck"
      class="mb-1 block text-xs font-medium text-gray-600"
      >Deck / Category *</label
    >
    <div class="flex gap-2">
      <select
        id="deck"
        v-model="deckId"
        required
        class="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none"
      >
        <option
          value=""
          disabled
        >
          Select a deck
        </option>
        <option
          v-for="deck in deckStore.decks"
          :key="deck.id"
          :value="deck.id"
        >
          {{ deck.name }}
        </option>
      </select>
      <button
        type="button"
        class="shrink-0 rounded border border-black px-3 py-2 text-xs font-medium text-black hover:bg-black hover:text-white"
        @click="isCreating = !isCreating"
      >
        + New
      </button>
    </div>

    <div
      v-if="isCreating"
      class="mt-2 flex gap-2"
    >
      <input
        v-model="newDeckName"
        type="text"
        placeholder="New deck name"
        class="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none"
        @keyup.enter="createDeck"
      />
      <button
        type="button"
        class="shrink-0 rounded bg-black px-3 py-2 text-xs font-medium text-white hover:bg-gray-800"
        @click="createDeck"
      >
        Add
      </button>
    </div>
  </div>
</template>
