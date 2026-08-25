<script setup lang="ts">
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
</script>

<template>
  <nav class="fixed bottom-0 left-0 right-0 z-40 border-t border-text/10 bg-background">
    <div class="mx-auto flex max-w-lg items-stretch justify-around">
      <RouterLink
        v-for="tab in TABS"
        :key="tab.to"
        :to="tab.to"
        class="flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors duration-150"
        :class="isActive(tab.routeName) ? 'text-primary' : 'text-text/40 hover:text-text/70'"
      >
        <AppIcon
          :icon-name="tab.icon"
          :size="22"
        />
        {{ tab.label }}
      </RouterLink>
    </div>
  </nav>
</template>
