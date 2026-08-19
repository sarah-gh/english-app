<script setup lang="ts">
withDefaults(defineProps<{ size?: number }>(), { size: 14 });
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    class="inline-block align-[-2px]"
  >
    <path
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M12 2 1 21h22L12 2zm-1 7h2v6h-2V9zm0 8h2v2h-2v-2z"
    />
  </svg>
</template>
