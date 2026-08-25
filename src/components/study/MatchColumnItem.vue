<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  text: string;
  status: 'pending' | 'selected' | 'correct' | 'incorrect' | 'matched';
}>();

defineEmits<{ click: [] }>();

const isClickable = computed(() => props.status === 'pending' || props.status === 'selected');

const statusClasses = computed(() => {
  switch (props.status) {
    case 'selected':
      return 'border-primary bg-primary/10 text-text';
    case 'correct':
    case 'matched':
      return 'border-primary/40 bg-primary/5 text-text/40 line-through';
    case 'incorrect':
      return 'border-danger bg-danger/10 text-danger';
    default:
      return 'border-text/15 text-text hover:border-primary';
  }
});
</script>

<template>
  <button
    type="button"
    class="w-full rounded-lg border px-3 py-2.5 text-left text-sm transition-colors duration-150"
    :class="[statusClasses, isClickable ? 'cursor-pointer' : 'cursor-default']"
    :disabled="!isClickable"
    @click="$emit('click')"
  >
    {{ text }}
  </button>
</template>
