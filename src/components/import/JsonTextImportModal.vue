<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import WarningIcon from '@/components/app/WarningIcon.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseModal from '@/components/ui/BaseModal.vue';
import { SAMPLE_JSON_IMPORT_TEMPLATE } from '@/utils/import/sample-json-template';

defineProps<{
  isValidating: boolean;
  /** Surfaced from the parent's `parseJsonCardImport` call — e.g. "No valid cards were found" —
   *  distinct from the live syntax check below, which only catches malformed JSON. */
  structureError?: string;
}>();

const emit = defineEmits<{ close: []; validate: [text: string] }>();

const jsonText = ref('');

/** Live syntax feedback as the user types/pastes — re-parses on every keystroke, which is cheap
 *  even for a few thousand lines of JSON. Structural validation (required fields, card shapes)
 *  only runs when "Validate & Preview" is clicked, via the shared `parseJsonCardImport` parser. */
const syntaxError = computed(() => {
  const text = jsonText.value.trim();
  if (!text) return '';
  try {
    JSON.parse(text);
    return '';
  } catch (error) {
    return error instanceof Error ? error.message : 'This is not valid JSON.';
  }
});

const canValidate = computed(() => jsonText.value.trim().length > 0 && !syntaxError.value);

function loadSample() {
  jsonText.value = SAMPLE_JSON_IMPORT_TEMPLATE;
}

/** Inserts two spaces at the caret instead of moving focus, so Tab behaves like it would in a
 *  code editor rather than tabbing out of the textarea. */
function handleTabKey(event: KeyboardEvent) {
  event.preventDefault();
  const textarea = event.target as HTMLTextAreaElement;
  const { selectionStart, selectionEnd } = textarea;
  jsonText.value = `${jsonText.value.slice(0, selectionStart)}  ${jsonText.value.slice(selectionEnd)}`;
  nextTick(() => {
    textarea.selectionStart = textarea.selectionEnd = selectionStart + 2;
  });
}

function handleValidate() {
  if (!canValidate.value) return;
  emit('validate', jsonText.value);
}
</script>

<template>
  <BaseModal max-width="max-w-2xl" @close="emit('close')">
    <div class="flex items-center justify-between gap-3">
      <h2 class="text-base font-semibold text-text">Paste / Edit Raw JSON</h2>
      <BaseButton variant="ghost" size="sm" @click="loadSample">
        Load Sample Template
      </BaseButton>
    </div>
    <p class="mt-1 text-xs text-text/50">
      Paste or type JSON describing decks and cards, then validate it to preview what will be
      imported.
    </p>

    <textarea
      v-model="jsonText"
      spellcheck="false"
      placeholder="Paste JSON here, or click &quot;Load Sample Template&quot; to see the expected structure…"
      class="mt-3 h-80 w-full resize-y rounded border border-text/20 bg-text/[0.03] p-3 font-mono text-xs leading-relaxed text-text focus:border-primary focus:outline-none"
      :class="syntaxError ? '!border-danger/50' : ''"
      @keydown.tab="handleTabKey"
    />

    <p
      v-if="syntaxError"
      class="mt-2 flex items-start gap-1.5 text-xs font-medium text-danger"
    >
      <WarningIcon />
      <span>JSON syntax error: {{ syntaxError }}</span>
    </p>
    <p
      v-else-if="structureError"
      class="mt-2 flex items-start gap-1.5 text-xs font-medium text-danger"
    >
      <WarningIcon />
      <span>{{ structureError }}</span>
    </p>

    <div class="mt-5 flex gap-3">
      <BaseButton variant="ghost" block :disabled="isValidating" @click="emit('close')">
        Cancel
      </BaseButton>
      <BaseButton
        variant="primary"
        block
        :disabled="!canValidate"
        :loading="isValidating"
        @click="handleValidate"
      >
        Validate &amp; Preview
      </BaseButton>
    </div>
  </BaseModal>
</template>
