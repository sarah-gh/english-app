<script setup lang="ts">
import { computed } from 'vue';
import { RouterView, useRoute } from 'vue-router';
import InstallPrompt from '@/components/pwa/InstallPrompt.vue';
import BottomNav from '@/components/ui/BottomNav.vue';

/** Study/quiz session routes go into "focus mode": the bottom nav hides so nothing but the
 *  session itself competes for attention, on both their setup and in-progress screens. The card
 *  creator/editor are here too — their own fixed bottom action bar (Save/Cancel) would otherwise
 *  overlap the nav. */
const FOCUS_MODE_ROUTE_NAMES = new Set([
  'study-setup',
  'study-session',
  'ai-quiz-setup',
  'ai-quiz-session',
  'card-create',
  'card-edit',
]);

const route = useRoute();
const showBottomNav = computed(() => !FOCUS_MODE_ROUTE_NAMES.has(route.name as string));
</script>

<template>
  <div
    class="max-w-lg mx-auto"
    :class="showBottomNav ? 'pb-0' : ''"
  >
    <RouterView v-slot="{ Component }">
      <transition
        name="fade"
        mode="out-in"
      >
        <component :is="Component" />
      </transition>
    </RouterView>
    <InstallPrompt />
    <BottomNav v-if="showBottomNav" />
  </div>
</template>

<style scoped></style>
