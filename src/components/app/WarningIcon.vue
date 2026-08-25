<script setup lang="ts">
withDefaults(defineProps<{ size?: number }>(), { size: 14 });
</script>

<template>
  <AppIcon
    icon-name="Danger"
    type="bold"
    :size="size"
    class="inline-block align-[-2px]"
  />
</template>
