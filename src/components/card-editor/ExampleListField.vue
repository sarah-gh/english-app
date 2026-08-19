<script setup lang="ts">
withDefaults(defineProps<{ label?: string }>(), { label: 'Personal Examples' });

const examples = defineModel<string[]>('examples', { required: true });

function addExample() {
  examples.value = [...examples.value, ''];
}

function removeExample(index: number) {
  examples.value = examples.value.filter((_, i) => i !== index);
}
</script>

<template>
  <div>
    <div class="mb-1 flex items-center justify-between">
      <span class="text-xs font-medium text-gray-600">{{ label }}</span>
      <button
        type="button"
        class="text-xs font-medium text-black underline underline-offset-2 hover:no-underline"
        @click="addExample"
      >
        + Add example
      </button>
    </div>

    <div class="space-y-2">
      <div
        v-for="(_, index) in examples"
        :key="index"
        class="flex gap-2"
      >
        <input
          v-model="examples[index]"
          type="text"
          placeholder="Write a sentence using this word…"
          class="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none"
        />
        <button
          type="button"
          class="shrink-0 rounded border border-gray-300 px-2 text-xs text-gray-500 hover:border-black hover:text-black"
          @click="removeExample(index)"
        >
          Remove
        </button>
      </div>
      <p
        v-if="examples.length === 0"
        class="text-xs text-gray-400"
      >
        No examples added.
      </p>
    </div>
  </div>
</template>
