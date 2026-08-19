<script setup lang="ts">
import { computed, ref } from 'vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import {
  dismissInstallPrompt,
  hasDismissedInstallPrompt,
  isInstallable,
  isStandalone,
  promptInstall,
} from '@/services/pwa/install-prompt';

const isLocallyDismissed = ref(hasDismissedInstallPrompt());

const shouldShow = computed(
  () => isInstallable.value && !isStandalone.value && !isLocallyDismissed.value,
);

function close() {
  dismissInstallPrompt();
  isLocallyDismissed.value = true;
}

async function handleInstall() {
  await promptInstall();
  close();
}
</script>

<template>
  <Transition name="install-sheet">
    <div
      v-if="shouldShow"
      class="fixed inset-x-0 bottom-0 z-40 border-t-2 border-black bg-white p-4"
    >
      <div class="mx-auto flex max-w-md items-center gap-3">
        <div class="min-w-0 flex-1">
          <p class="text-sm font-semibold text-black">Install Flashcards</p>
          <p class="text-xs text-gray-600">Add it to your home screen for quick, offline access.</p>
        </div>
        <BaseButton
          variant="ghost"
          size="sm"
          @click="close"
        >
          Not now
        </BaseButton>
        <BaseButton
          variant="primary"
          size="sm"
          @click="handleInstall"
        >
          Install
        </BaseButton>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.install-sheet-enter-active,
.install-sheet-leave-active {
  transition: transform 0.25s ease;
}
.install-sheet-enter-from,
.install-sheet-leave-to {
  transform: translateY(100%);
}
</style>
