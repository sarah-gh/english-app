<script setup lang="ts">
import { RouterView } from 'vue-router';
import InstallPrompt from '@/components/pwa/InstallPrompt.vue';
</script>

<template>
  <div class="max-w-lg mx-auto">
    <RouterView v-slot="{ Component }">
      <transition
        name="fade"
        mode="out-in"
      >
        <component :is="Component" />
      </transition>
    </RouterView>
    <InstallPrompt />
  </div>
</template>

<style scoped></style>
