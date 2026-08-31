<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import BaseTag from '@/components/ui/BaseTag.vue';
import { useTagStore } from '@/stores/tag-store';

const props = defineProps<{
  modelValue: string[];
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string[]];
}>();

const tagStore = useTagStore();
const isExpanded = ref(false);

onMounted(() => {
  tagStore.ensureLoaded();
});

const summaryLabel = computed(() =>
  props.modelValue.length === 0 ? 'Filter by Tags' : `Filter by Tags (${props.modelValue.length} selected)`,
);

function toggleTag(id: string) {
  emit(
    'update:modelValue',
    props.modelValue.includes(id) ? props.modelValue.filter((tagId) => tagId !== id) : [...props.modelValue, id],
  );
}
</script>

<template>
  <div v-if="tagStore.tags.length > 0">
    <button
      type="button"
      class="flex w-full items-center justify-between rounded border border-card-gold/20 bg-card-surface px-3 py-2 text-left text-sm font-medium text-text hover:border-card-gold/40"
      :aria-expanded="isExpanded"
      @click="isExpanded = !isExpanded"
    >
      <span>{{ summaryLabel }}</span>
      <AppIcon
        icon-name="ArrowDown2"
        :size="16"
        class="shrink-0 text-card-gold transition-transform duration-150"
        :class="isExpanded ? 'rotate-180' : ''"
      />
    </button>

    <div
      v-if="isExpanded"
      class="mt-2 flex flex-wrap gap-2 rounded-lg border border-card-gold/10 bg-card-definition p-3"
    >
      <BaseTag
        v-for="tag in tagStore.tags"
        :key="tag.id"
        :label="tag.name"
        :color="tag.color"
        selectable
        :selected="modelValue.includes(tag.id)"
        @click="toggleTag(tag.id)"
      />
    </div>
  </div>
</template>
