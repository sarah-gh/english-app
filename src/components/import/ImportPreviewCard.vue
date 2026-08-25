<script setup lang="ts">
import { computed } from 'vue';
import WarningIcon from '@/components/app/WarningIcon.vue';
import BaseCard from '@/components/ui/BaseCard.vue';
import BaseTag from '@/components/ui/BaseTag.vue';
import { useTagStore } from '@/stores/tag-store';
import type { ParsedCardRow } from '@/services/import/excel-card-import';

const props = defineProps<{
  row: ParsedCardRow;
  selected: boolean;
}>();

const emit = defineEmits<{ 'update:selected': [value: boolean] }>();

const tagStore = useTagStore();

const hasErrors = computed(() => props.row.errors.length > 0);

/** Matches the default color `resolveTagId` falls back to at import time for a brand-new tag,
 *  so the preview chip's color doesn't jump the moment the card is actually imported. */
function tagColor(name: string): string {
  const existing = tagStore.tags.find((tag) => tag.name.toLowerCase() === name.toLowerCase());
  return existing?.color ?? '#6b7280';
}

function toggle() {
  if (hasErrors.value) return;
  emit('update:selected', !props.selected);
}
</script>

<template>
  <BaseCard :class="hasErrors ? 'border-danger/30 opacity-70' : ''">
    <div class="flex items-start gap-3">
      <input
        type="checkbox"
        :checked="selected"
        :disabled="hasErrors"
        class="mt-1 h-4 w-4 shrink-0 accent-primary disabled:cursor-not-allowed disabled:opacity-40"
        :aria-label="`Include “${row.frontTitle || 'row ' + row.rowNumber}” in the import`"
        @change="toggle"
      />

      <div class="min-w-0 flex-1">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="truncate font-medium text-text">
              {{ row.frontTitle || `Row ${row.rowNumber}` }}
            </p>
            <p class="mt-0.5 text-xs text-text/50">
              {{ row.deckName || 'No deck' }} · Row {{ row.rowNumber }}
            </p>
          </div>
          <span
            v-if="!hasErrors"
            class="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary uppercase"
          >
            Ready
          </span>
          <span
            v-else
            class="shrink-0 rounded-full bg-danger px-2 py-0.5 text-[10px] font-medium text-background uppercase"
          >
            Needs fixing
          </span>
        </div>

        <div
          v-if="row.tagNames.length > 0"
          class="mt-2 flex flex-wrap gap-1.5"
        >
          <BaseTag
            v-for="tag in row.tagNames"
            :key="tag"
            :label="tag"
            :color="tagColor(tag)"
          />
        </div>

        <p
          v-if="row.backAnswer"
          class="mt-2 text-sm text-text"
        >
          {{ row.backAnswer }}
        </p>

        <ul
          v-if="row.examples.length > 0"
          class="mt-2 space-y-0.5"
        >
          <li
            v-for="(example, index) in row.examples"
            :key="index"
            class="text-xs text-text/50"
          >
            “{{ example }}”
          </li>
        </ul>

        <p
          v-if="row.hint || row.ipa"
          class="mt-2 flex flex-wrap gap-x-3 text-xs text-text/50"
        >
          <span v-if="row.hint"><span class="font-medium text-text/70">Hint:</span> {{ row.hint }}</span>
          <span v-if="row.ipa">{{ row.ipa }}</span>
        </p>

        <div
          v-if="hasErrors"
          class="mt-3 flex items-start gap-1.5 rounded border border-danger/30 bg-danger/10 px-2.5 py-2 text-xs text-text"
        >
          <WarningIcon class="mt-0.5 shrink-0" />
          <span>{{ row.errors.join(' ') }}</span>
        </div>
      </div>
    </div>
  </BaseCard>
</template>
