<script setup lang="ts">
import BaseButton from '@/components/ui/BaseButton.vue';
import { useDeckStore } from '@/stores/deck-store';
import { useTopicStore } from '@/stores/topic-store';
import type { Card } from '@/types/card';

const props = defineProps<{
  cards: Card[];
  modelValue: Set<string>;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: Set<string>];
}>();

const deckStore = useDeckStore();
const topicStore = useTopicStore();

function cardLocationLabel(card: Card): string {
  const deckName = deckStore.getById(card.deckId)?.name ?? '';
  const topicName = card.topicId ? topicStore.getById(card.topicId)?.name : undefined;
  return topicName ? `${deckName} · ${topicName}` : deckName;
}

function toggleCard(id: string) {
  const next = new Set(props.modelValue);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  emit('update:modelValue', next);
}

function selectAll() {
  emit('update:modelValue', new Set(props.cards.map((card) => card.id)));
}

function deselectAll() {
  emit('update:modelValue', new Set());
}
</script>

<template>
  <div>
    <div class="mb-3 flex items-center justify-between">
      <p class="text-xs text-card-muted">
        Selected: {{ modelValue.size }} / {{ cards.length }} card{{ cards.length === 1 ? '' : 's' }}
      </p>
      <div class="flex gap-3">
        <BaseButton variant="link" size="sm" @click="selectAll">
          Select All
        </BaseButton>
        <BaseButton variant="link" size="sm" muted @click="deselectAll">
          Deselect All
        </BaseButton>
      </div>
    </div>

    <div class="rounded-xl border border-card-gold/20 bg-card-surface">
      <ul class="max-h-72 divide-y divide-card-gold/10 overflow-y-auto">
        <li v-for="card in cards" :key="card.id">
          <label class="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-card-definition">
            <input
              type="checkbox"
              class="h-4 w-4 rounded border-card-gold/40 bg-card-surface accent-card-gold"
              :checked="modelValue.has(card.id)"
              @change="toggleCard(card.id)"
            />
            <span class="min-w-fit flex-1 truncate text-sm text-text">{{ card.frontTitle }}</span>
            <span class="shrink-0 text-xs text-card-muted">{{ cardLocationLabel(card) }}</span>
          </label>
        </li>
        <li v-if="cards.length === 0" class="px-4 py-3 text-sm text-card-muted">
          No cards match these filters.
        </li>
      </ul>
    </div>
  </div>
</template>
