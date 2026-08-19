<script setup lang="ts">
withDefaults(defineProps<{ maxWidth?: string }>(), { maxWidth: 'max-w-sm' });

const emit = defineEmits<{ close: [] }>();
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    @click.self="emit('close')"
  >
    <div
      class="w-full rounded-lg border border-black bg-white p-5"
      :class="maxWidth"
    >
      <slot />
    </div>
  </div>
</template>
