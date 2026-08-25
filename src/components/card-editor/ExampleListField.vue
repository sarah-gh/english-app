<script setup lang="ts">
import { computed } from 'vue';
import WarningIcon from '@/components/app/WarningIcon.vue';
import { useGenerateExamples } from '@/queries/use-generate-examples';
import { AiServiceError } from '@/services/ai/errors';
import { hasRequiredAiCredentials } from '@/services/ai/ai-card-autofill-service';
import { useSettingsStore } from '@/stores/settings-store';
import AiFieldButton from './AiFieldButton.vue';

const props = withDefaults(
  defineProps<{
    label?: string;
    /** The card's front title/root word to generate from. Only pass this when this list IS the
     *  card's "Personal Examples" section — omit it (e.g. for per-part-of-speech example lists)
     *  to hide the AI button entirely. */
    aiWord?: string;
  }>(),
  { label: 'Personal Examples', aiWord: undefined },
);

const examples = defineModel<string[]>('examples', { required: true });

const settingsStore = useSettingsStore();
const { mutateAsync: requestExamples, isPending: isGenerating, error: generateApiError } = useGenerateExamples();

const canGenerate = computed(
  () => props.aiWord !== undefined && hasRequiredAiCredentials(settingsStore.settings) && props.aiWord.trim().length > 0,
);
const generateErrorMessage = computed(() => {
  const error = generateApiError.value;
  if (!error) return '';
  return error instanceof AiServiceError ? error.message : 'Auto-fill failed. Please try again.';
});

async function handleGenerate() {
  const title = props.aiWord?.trim();
  if (!title) return;
  try {
    examples.value = await requestExamples({ settings: settingsStore.settings, title, count: 3 });
  } catch {
    // generateErrorMessage (computed above) already reflects the mutation's error state.
  }
}

function addExample() {
  examples.value = [...examples.value, ''];
}

function removeExample(index: number) {
  examples.value = examples.value.filter((_, i) => i !== index);
}

function moveExample(index: number, direction: -1 | 1) {
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= examples.value.length) return;

  const reordered = [...examples.value];
  [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
  examples.value = reordered;
}
</script>

<template>
  <div>
    <div class="mb-1 flex items-center justify-between gap-2">
      <span class="flex items-center gap-1 text-xs font-medium text-text/60">
        {{ label }}
        <AiFieldButton
          v-if="aiWord !== undefined"
          :loading="isGenerating"
          :disabled="!canGenerate"
          :title="aiWord.trim() ? 'Auto-fill this field with AI' : 'Enter a word first to use AI Auto-Fill'"
          @click="handleGenerate"
        />
      </span>
      <button
        type="button"
        class="inline-flex items-center gap-1 text-xs font-medium text-primary underline underline-offset-2 hover:no-underline"
        @click="addExample"
      >
        <AppIcon
          icon-name="Add"
          :size="12"
        />
        Add example
      </button>
    </div>
    <p
      v-if="generateErrorMessage"
      class="mb-1 flex items-center gap-1.5 text-xs font-medium text-danger"
    >
      <WarningIcon />
      {{ generateErrorMessage }}
    </p>

    <div class="space-y-2">
      <div
        v-for="(_, index) in examples"
        :key="index"
        class="flex gap-2"
      >
        <div class="flex shrink-0 flex-col gap-0.5">
          <button
            type="button"
            aria-label="Move example up"
            class="rounded border border-text/20 px-1.5 text-xs leading-4 text-text/50 hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-text/20 disabled:hover:text-text/50"
            :disabled="index === 0"
            @click="moveExample(index, -1)"
          >
            ↑
          </button>
          <button
            type="button"
            aria-label="Move example down"
            class="rounded border border-text/20 px-1.5 text-xs leading-4 text-text/50 hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-text/20 disabled:hover:text-text/50"
            :disabled="index === examples.length - 1"
            @click="moveExample(index, 1)"
          >
            ↓
          </button>
        </div>
        <input
          v-model="examples[index]"
          type="text"
          placeholder="Write a sentence using this word…"
          class="w-full rounded border border-text/20 px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
        <button
          type="button"
          class="inline-flex shrink-0 items-center gap-1 rounded border border-text/20 px-2 text-xs text-text/50 hover:border-primary hover:text-primary"
          @click="removeExample(index)"
        >
          <AppIcon
            icon-name="Trash"
            :size="12"
          />
          Remove
        </button>
      </div>
      <p
        v-if="examples.length === 0"
        class="text-xs text-text/35"
      >
        No examples added.
      </p>
    </div>
  </div>
</template>
