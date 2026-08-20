<script setup lang="ts">
import { RouterView } from 'vue-router';
import InstallPrompt from '@/components/pwa/InstallPrompt.vue';
</script>

<template>
  <div class="max-w-lg mx-auto">
    <RouterView />
    <InstallPrompt />
  </div>
</template>

<style scoped></style>
