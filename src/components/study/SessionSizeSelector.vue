<script setup lang="ts">
import BaseSegmentedToggle from '@/components/ui/BaseSegmentedToggle.vue';
import type { SessionSize } from '@/stores/study-session-store';

const props = defineProps<{ modelValue: SessionSize }>();
const emit = defineEmits<{ 'update:modelValue': [value: SessionSize] }>();

const SIZE_OPTIONS = [
  { value: '5', label: '5' },
  { value: '10', label: '10' },
  { value: '15', label: '15' },
  { value: '20', label: '20' },
];

function handleUpdate(value: string) {
  emit('update:modelValue', Number(value) as SessionSize);
}
</script>

<template>
  <BaseSegmentedToggle
    :model-value="String(props.modelValue)"
    :options="SIZE_OPTIONS"
    @update:model-value="handleUpdate"
  />
</template>
