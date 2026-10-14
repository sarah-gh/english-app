<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import GlassPanel from '@/components/chat/GlassPanel.vue';

const props = defineProps<{ disabled?: boolean; sending?: boolean }>();
const emit = defineEmits<{ submit: [content: string] }>();
const draft = defineModel<string>({ default: '' });

const textarea = ref<HTMLTextAreaElement | null>(null);

/** Grows with the text up to ~5 lines, then scrolls inside itself. */
function autoResize() {
  const el = textarea.value;
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
}

watch(draft, () => nextTick(autoResize));

function submit() {
  if (props.disabled || props.sending || !draft.value.trim()) return;
  emit('submit', draft.value);
}

/** Enter sends, Shift+Enter inserts a newline. Ignored mid-IME-composition. */
function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    submit();
  }
}

function focus() {
  const el = textarea.value;
  if (!el) return;
  el.focus();
  el.setSelectionRange(el.value.length, el.value.length);
}

defineExpose({ focus });
</script>

<template>
  <GlassPanel
    as="form"
    class="flex items-end gap-2 rounded-3xl p-1.5 pl-4"
    @submit.prevent="submit"
  >
    <label
      for="chat-composer"
      class="sr-only"
    >Message the AI tutor</label>
    <textarea
      id="chat-composer"
      ref="textarea"
      v-model="draft"
      rows="1"
      :disabled="disabled"
      placeholder="Ask your tutor anything in English…"
      class="max-h-32 min-h-9 flex-1 resize-none bg-transparent py-2 text-sm text-text placeholder:text-text/40 focus:outline-none disabled:cursor-not-allowed"
      @keydown="handleKeydown"
    />
    <button
      type="submit"
      aria-label="Send message"
      :disabled="disabled || sending || !draft.trim()"
      class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-md transition hover:bg-primary/90 active:scale-95 disabled:cursor-not-allowed disabled:bg-primary/30 disabled:shadow-none"
    >
      <AppIcon
        icon-name="Send2"
        :size="18"
      />
    </button>
  </GlassPanel>
</template>
