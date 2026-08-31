<script setup lang="ts">
import { computed, ref } from 'vue';
import BaseSelect from '@/components/ui/BaseSelect.vue';
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

const deckOptions = computed(() => deckStore.decks.map((deck) => ({ value: deck.id, label: deck.name })));

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
    <div class="flex items-end gap-2">
      <BaseSelect
        v-model="deckId"
        label="Deck / Category"
        required
        placeholder="Select a deck"
        class="w-full "
        :options="deckOptions"
        :error="error"
        @blur="emit('blur')"
      />
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
