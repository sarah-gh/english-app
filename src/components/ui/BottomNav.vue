<script setup lang="ts">
// import { computed } from 'vue';
import { useRoute } from 'vue-router';

interface NavTab {
  to: string;
  label: string;
  icon: 'Home2' | 'ProfileCircle' | 'Setting2';
  routeName: string;
}

const TABS: NavTab[] = [
  { to: '/', label: 'Home', icon: 'Home2', routeName: 'dashboard' },
  { to: '/profile', label: 'Profile', icon: 'ProfileCircle', routeName: 'profile' },
  { to: '/settings', label: 'Settings', icon: 'Setting2', routeName: 'settings' },
];

const route = useRoute();

function isActive(routeName: string): boolean {
  return route.name === routeName;
}

// const activeIndex = computed(() => {
//   const index = TABS.findIndex((tab) => isActive(tab.routeName));
//   return index === -1 ? 0 : index;
// });

// const indicatorStyle = computed(() => ({
//   left: `${(activeIndex.value + 0.5) * (100 / TABS.length)}%`,
// }));
</script>

<template>
  <nav class="fixed inset-x-4 bottom-2 z-40 mx-auto max-w-sm">
    <div class="relative flex items-stretch justify-around rounded-full bg-neutral-900 shadow-lg shadow-black/30">
      <!-- Sliding active-tab spotlight: top light bar + downward glow -->
      <!-- <div
        class="pointer-events-none absolute top-1 h-full w-16 -translate-x-1/2 transition-[left] duration-300 ease-out"
        :style="indicatorStyle"
      >
        <div
          class="absolute inset-x-0 top-1 mx-auto h-10 w-16 bg-linear-to-b from-primary/40 to-transparent [clip-path:polygon(31%_0%,69%_0%,100%_100%,0%_100%)] polygon(32% 0%,69% 0%,105% 100%,-10% 120%)"
        />
        <div class="absolute left-1/2 top-0.5 h-1 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_6px_1px] shadow-primary/70" />
      </div> -->

      <RouterLink
        v-for="tab in TABS"
        :key="tab.to"
        :to="tab.to"
        class="relative z-10 flex flex-1 flex-col items-center justify-center gap-0.5 py-3.5 transition-colors duration-200"
        :class="isActive(tab.routeName) ? 'text-primary text-shadow-md text-shadow-primary' : 'text-white/40 hover:text-white/70'"
      >
        <AppIcon
          :icon-name="tab.icon"
          :size="22"
        />
        <span class="sr-only">{{ tab.label }}</span>
      </RouterLink>
    </div>
  </nav>
</template>
