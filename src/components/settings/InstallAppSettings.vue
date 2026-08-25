<script setup lang="ts">
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseCard from '@/components/ui/BaseCard.vue';
import { isInstallable, isStandalone, promptInstall } from '@/services/pwa/install-prompt';

async function handleInstallClick() {
  await promptInstall();
}
</script>

<template>
  <BaseCard
    v-if="!isStandalone"
    class="mb-6"
  >
    <h2 class="mb-1 text-sm font-semibold text-text">Install Application</h2>
    <p class="mb-3 text-xs text-text/50">
      Install Flashcards on this device for quick access and a full-screen, offline-ready
      experience.
    </p>
    <BaseButton
      variant="primary"
      size="sm"
      :disabled="!isInstallable"
      @click="handleInstallClick"
    >
      Install Application
    </BaseButton>
    <p
      v-if="!isInstallable"
      class="mt-2 text-xs text-text/35"
    >
      Not available right now — your browser may not support installation, or it may already be
      installed.
    </p>
  </BaseCard>
</template>
