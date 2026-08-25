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
    <span class="mb-1 block text-xs font-medium text-text/60">Image (optional)</span>

    <div
      v-if="previewUrl"
      class="mb-2 flex items-center gap-3"
    >
      <img
        :src="previewUrl"
        alt="Card image preview"
        class="h-20 w-20 rounded border border-text/20 object-cover"
      />
      <button
        type="button"
        class="inline-flex items-center gap-1 rounded border border-text/20 px-3 py-1.5 text-xs text-text/60 hover:border-primary hover:text-primary"
        @click="removeImage"
      >
        <AppIcon
          icon-name="Trash"
          :size="12"
        />
        Remove image
      </button>
    </div>

    <input
      type="file"
      accept="image/*"
      class="block w-full text-sm text-text/60 file:mr-3 file:rounded file:border file:border-primary file:bg-background file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-primary hover:file:bg-primary hover:file:text-background"
      @change="onFileSelected"
    />
  </div>
</template>
