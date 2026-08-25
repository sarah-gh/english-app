<script setup lang="ts">
import { ref } from 'vue';
import WarningIcon from '@/components/app/WarningIcon.vue';
import { useDeckStore } from '@/stores/deck-store';

const deckId = defineModel<string>('deckId', { required: true });

defineProps<{
  error?: string;
}>();

const emit = defineEmits<{
  blur: [];
}>();

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
      class="mb-1 block text-xs font-medium text-text/60"
      >Deck / Category *</label
    >
    <div class="flex gap-2">
      <select
        id="deck"
        v-model="deckId"
        class="w-full rounded border px-3 py-2 text-sm focus:border-primary focus:outline-none"
        :class="error ? 'border-danger/80' : 'border-text/20'"
        @blur="emit('blur')"
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
        class="inline-flex shrink-0 items-center gap-1 rounded border border-primary px-3 py-2 text-xs font-medium text-primary hover:bg-primary hover:text-background"
        @click="isCreating = !isCreating"
      >
        <AppIcon
          icon-name="Add"
          :size="14"
        />
        New
      </button>
    </div>
    <p
      v-if="error"
      class="mt-1 flex items-center gap-1.5 text-xs font-medium text-danger"
    >
      <WarningIcon />
      {{ error }}
    </p>

    <div
      v-if="isCreating"
      class="mt-2 flex gap-2"
    >
      <input
        v-model="newDeckName"
        type="text"
        placeholder="New deck name"
        class="w-full rounded border border-text/20 px-3 py-2 text-sm focus:border-primary focus:outline-none"
        @keyup.enter="createDeck"
      />
      <button
        type="button"
        class="shrink-0 rounded bg-primary px-3 py-2 text-xs font-medium text-background hover:bg-primary/90"
        @click="createDeck"
      >
        Add
      </button>
    </div>
  </div>
</template>
