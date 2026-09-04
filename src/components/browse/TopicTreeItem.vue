<script setup lang="ts">
import { useRouter } from 'vue-router';
import BaseCountBadge from '@/components/ui/BaseCountBadge.vue';

const props = defineProps<{
  name: string;
  cardCount: number;
  to: string;
  /** Pseudo-topics ("All Cards", "Uncategorized") can be opened but not renamed/deleted. */
  editable?: boolean;
}>();

const emit = defineEmits<{ edit: []; delete: [] }>();

const router = useRouter();

function open() {
  router.push(props.to);
}
</script>

<template>
  <div
    class="group flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left hover:bg-card-surface"
    @click="open"
  >
    <AppIcon
      icon-name="DocumentText"
      :size="14"
      class="shrink-0 text-card-muted"
    />
    <span class="min-w-fit flex-1 truncate text-sm text-text">{{ name.length > 22 ? name.slice(0, 22) + '...' : name }}</span>
    <BaseCountBadge :count="cardCount" />
    <div
      v-if="editable"
      class="flex shrink-0 items-center gap-0.5"
    >
      <button
        type="button"
        aria-label="Rename topic"
        class="rounded p-1 text-card-muted hover:text-primary"
        @click.stop="emit('edit')"
      >
        <AppIcon
          icon-name="Edit2"
          :size="13"
        />
      </button>
      <button
        type="button"
        aria-label="Delete topic"
        class="rounded p-1 text-card-muted hover:text-danger"
        @click.stop="emit('delete')"
      >
        <AppIcon
          icon-name="Trash"
          :size="13"
        />
      </button>
    </div>
    <AppIcon
      icon-name="ArrowRight2"
      :size="12"
      class="shrink-0 text-card-muted/60"
    />
  </div>
</template>
