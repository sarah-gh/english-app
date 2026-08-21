<script setup lang="ts">
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseInput from '@/components/ui/BaseInput.vue';
import BaseSelect from '@/components/ui/BaseSelect.vue';
import type { PosEntryFormState } from './card-form-state';
import ExampleListField from './ExampleListField.vue';
import type { PosType } from '@/types/card';

defineProps<{
  /** For the "Word Form" placeholder, e.g. "Decision" for a "Decide" root word. */
  rootWord?: string;
}>();

const entries = defineModel<PosEntryFormState[]>('entries', { required: true });

const POS_OPTIONS: { value: PosType; label: string }[] = [
  { value: 'noun', label: 'Noun' },
  { value: 'verb', label: 'Verb' },
  { value: 'adjective', label: 'Adjective' },
  { value: 'adverb', label: 'Adverb' },
  { value: 'other', label: 'Other' },
];

function addEntry() {
  entries.value = [
    ...entries.value,
    { id: crypto.randomUUID(), pos: 'noun', wordForm: '', definition: '', ipa: '', examples: [] },
  ];
}

function removeEntry(id: string) {
  entries.value = entries.value.filter((entry) => entry.id !== id);
}
</script>

<template>
  <div>
    <div class="mb-1 flex items-center justify-between">
      <span class="text-xs font-medium text-gray-600">Parts of Speech (Optional)</span>
      <BaseButton
        variant="link"
        size="sm"
        @click="addEntry"
      >
        + Add Part of Speech
      </BaseButton>
    </div>

    <div class="space-y-3">
      <div
        v-for="entry in entries"
        :key="entry.id"
        class="space-y-2 rounded border border-gray-200 p-3"
      >
        <div class="flex items-end gap-2">
          <BaseSelect
            :model-value="entry.pos"
            label="Type"
            class="w-36 shrink-0"
            @update:model-value="(value) => (entry.pos = value as PosType)"
          >
            <option
              v-for="option in POS_OPTIONS"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </BaseSelect>
          <BaseInput
            v-model="entry.wordForm"
            label="Word Form"
            :placeholder="rootWord ? `e.g. ${rootWord}...` : 'e.g. Decision'"
            class="w-full"
          />
        </div>

        <div class="flex items-end gap-2">
          <BaseInput
            v-model="entry.ipa"
            label="IPA (optional)"
            placeholder="/wɜːrd/"
            class="w-full"
          />
          <BaseButton
            variant="ghost"
            size="sm"
            muted
            class="shrink-0"
            @click="removeEntry(entry.id)"
          >
            Remove
          </BaseButton>
        </div>

        <BaseInput
          v-model="entry.definition"
          label="Definition"
          placeholder="Meaning for this part of speech"
        />

        <ExampleListField
          v-model:examples="entry.examples"
          label="Examples"
        />
      </div>

      <p
        v-if="entries.length === 0"
        class="text-xs text-gray-400"
      >
        No parts of speech added.
      </p>
    </div>
  </div>
</template>
