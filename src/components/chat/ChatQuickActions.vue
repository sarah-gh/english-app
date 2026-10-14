<script setup lang="ts">
export interface ChatQuickAction {
  label: string;
  /** Sent as-is (`send`), or dropped into the composer for the user to finish (`prefill`). */
  prompt: string;
  mode: 'send' | 'prefill';
}

const CHAT_QUICK_ACTIONS: ChatQuickAction[] = [
  {
    label: 'Practice my saved words',
    prompt:
      'Give me a short practice exercise using a few of my saved words. Ask me one question at a time.',
    mode: 'send',
  },
  {
    label: 'Quiz me',
    prompt: 'Quiz me on a few of my saved vocabulary and grammar items, one question at a time.',
    mode: 'send',
  },
  {
    label: 'Explain a grammar concept',
    prompt: 'Explain this grammar concept with simple examples: ',
    mode: 'prefill',
  },
  {
    label: 'Check my writing',
    prompt: 'Please check my writing and correct any mistakes:\n',
    mode: 'prefill',
  },
];

defineProps<{ disabled?: boolean }>();
const emit = defineEmits<{ select: [action: ChatQuickAction] }>();
</script>

<template>
  <div class="-ml-2 flex gap-2 overflow-x-auto px-2 pb-1 scrollbar-none">
    <button
      v-for="(action) in CHAT_QUICK_ACTIONS"
      :key="action.label"
      type="button"
      :disabled="disabled"
      class="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium whitespace-nowrap text-primary backdrop-blur-md transition-colors hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-40"
      @click="emit('select', action)"
    >
      {{ action.label }}
    </button>
  </div>
</template>
