<script setup lang="ts">
defineProps<{
  chips: { key: string; label: string }[];
}>();

defineEmits<{
  remove: [key: string];
  clearAll: [];
}>();
</script>

<template>
  <div
    v-if="chips.length > 0"
    class="mb-3 flex flex-wrap items-center gap-1.5"
  >
    <span
      v-for="chip in chips"
      :key="chip.key"
      class="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 py-1 pr-1.5 pl-2.5 text-xs font-medium text-primary"
    >
      {{ chip.label }}
      <button
        type="button"
        :aria-label="`Remove filter: ${chip.label}`"
        class="rounded-full p-0.5 hover:bg-primary/20"
        @click="$emit('remove', chip.key)"
      >
        <AppIcon
          icon-name="CloseCircle"
          :size="12"
        />
      </button>
    </span>

    <button
      type="button"
      class="text-xs font-medium text-text/50 underline underline-offset-2 hover:text-primary"
      @click="$emit('clearAll')"
    >
      Clear All Filters
    </button>
  </div>
</template>
