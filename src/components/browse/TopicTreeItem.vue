<script setup lang="ts">
import { useRouter } from 'vue-router';

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
    class="group flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left hover:bg-primary/5"
    @click="open"
  >
    <AppIcon
      icon-name="DocumentText"
      :size="14"
      class="shrink-0 text-text/30"
    />
    <span class="min-w-0 flex-1 truncate text-sm text-text">{{ name }}</span>
    <span class="shrink-0 text-xs text-text/40">{{ cardCount }}</span>
    <div
      v-if="editable"
      class="flex shrink-0 items-center gap-0.5"
    >
      <button
        type="button"
        aria-label="Rename topic"
        class="rounded p-1 text-text/35 hover:text-primary"
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
        class="rounded p-1 text-text/35 hover:text-danger"
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
      class="shrink-0 text-text/20"
    />
  </div>
</template>
