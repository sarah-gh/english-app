<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue';

const imageBlob = defineModel<Blob | undefined>('imageBlob');

const previewUrl = ref<string>();

function revokePreview() {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
}

watch(
  imageBlob,
  (blob) => {
    revokePreview();
    previewUrl.value = blob ? URL.createObjectURL(blob) : undefined;
  },
  { immediate: true },
);

onBeforeUnmount(revokePreview);

function onFileSelected(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (file) imageBlob.value = file;
}

function removeImage() {
  imageBlob.value = undefined;
}
</script>

<template>
  <div>
    <span class="mb-1 block text-xs font-medium text-gray-600">Image (optional)</span>

    <div
      v-if="previewUrl"
      class="mb-2 flex items-center gap-3"
    >
      <img
        :src="previewUrl"
        alt="Card image preview"
        class="h-20 w-20 rounded border border-gray-300 object-cover"
      />
      <button
        type="button"
        class="rounded border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:border-black hover:text-black"
        @click="removeImage"
      >
        Remove image
      </button>
    </div>

    <input
      type="file"
      accept="image/*"
      class="block w-full text-sm text-gray-600 file:mr-3 file:rounded file:border file:border-black file:bg-white file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-black hover:file:bg-black hover:file:text-white"
      @change="onFileSelected"
    />
  </div>
</template>
