<script setup lang="ts">
import { ref, watch } from 'vue';
import { useTopicStore } from '@/stores/topic-store';

const topicId = defineModel<string>('topicId', { required: true });

const props = defineProps<{
  deckId: string;
}>();

const topicStore = useTopicStore();

const isCreating = ref(false);
const newTopicName = ref('');

/** Clears the selection when the deck changes out from under it, so the field never shows a
 *  topic that belongs to a different deck. */
watch(
  () => props.deckId,
  (deckId) => {
    if (!topicId.value) return;
    const stillValid = topicStore.byDeck(deckId).some((topic) => topic.id === topicId.value);
    if (!stillValid) topicId.value = '';
  },
);

async function createTopic() {
  const name = newTopicName.value.trim();
  if (!name || !props.deckId) return;

  const topic = await topicStore.add({ deckId: props.deckId, name });
  topicId.value = topic.id;
  newTopicName.value = '';
  isCreating.value = false;
}
</script>

<template>
  <div>
    <label
      for="topic"
      class="mb-1 block text-xs font-medium text-text/60"
      >Topic (optional)</label
    >
    <div class="flex gap-2">
      <select
        id="topic"
        v-model="topicId"
        :disabled="!deckId"
        class="w-full rounded border border-text/20 px-3 py-2 text-sm focus:border-primary focus:outline-none disabled:bg-text/5"
      >
        <option value="">No topic</option>
        <option
          v-for="topic in topicStore.byDeck(deckId)"
          :key="topic.id"
          :value="topic.id"
        >
          {{ topic.name }}
        </option>
      </select>
      <button
        type="button"
        :disabled="!deckId"
        class="inline-flex shrink-0 items-center gap-1 rounded border border-primary px-3 py-2 text-xs font-medium text-primary hover:bg-primary hover:text-background disabled:cursor-not-allowed disabled:border-text/20 disabled:text-text/30"
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
      v-if="!deckId"
      class="mt-1 text-xs text-text/40"
    >
      Select a deck first.
    </p>

    <div
      v-if="isCreating"
      class="mt-2 flex gap-2"
    >
      <input
        v-model="newTopicName"
        type="text"
        placeholder="New topic name"
        class="w-full rounded border border-text/20 px-3 py-2 text-sm focus:border-primary focus:outline-none"
        @keyup.enter="createTopic"
      />
      <button
        type="button"
        class="shrink-0 rounded bg-primary px-3 py-2 text-xs font-medium text-background hover:bg-primary/90"
        @click="createTopic"
      >
        Add
      </button>
    </div>
  </div>
</template>
