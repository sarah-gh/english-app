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
      <p class="text-card-muted text-xs">
        Selected: {{ modelValue.size }} / {{ cards.length }} card{{ cards.length === 1 ? '' : 's' }}
      </p>
      <div class="flex gap-3">
        <BaseButton
          variant="link"
          size="sm"
          @click="selectAll"
        >
          Select All
        </BaseButton>
        <BaseButton
          variant="link"
          size="sm"
          muted
          @click="deselectAll"
        >
          Deselect All
        </BaseButton>
      </div>
    </div>

    <div class="border-card-gold/20 bg-card-surface rounded-xl border">
      <ul class="divide-card-gold/10 max-h-72 divide-y overflow-y-auto">
        <li
          v-for="card in cards"
          :key="card.id"
        >
          <label class="hover:bg-card-definition flex cursor-pointer items-center gap-3 px-4 py-3">
            <input
              type="checkbox"
              class="border-card-gold/40 bg-card-surface accent-card-gold h-4 w-4 rounded"
              :checked="modelValue.has(card.id)"
              @change="toggleCard(card.id)"
            />
            <span class="text-text min-w-fit flex-1 truncate text-sm">
              {{
                card.frontTitle.length > 20 ? card.frontTitle.slice(0, 20) + '...' : card.frontTitle
              }}
            </span>
            <span class="text-card-muted shrink-0 text-xs">
              {{
                cardLocationLabel(card).length > 30
                  ? cardLocationLabel(card).slice(0, 30) + '...'
                  : cardLocationLabel(card)
              }}
            </span>
          </label>
        </li>
        <li
          v-if="cards.length === 0"
          class="text-card-muted px-4 py-3 text-sm"
        >
          No cards match these filters.
        </li>
      </ul>
    </div>
  </div>
</template>
