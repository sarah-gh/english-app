<script setup lang="ts">
import { RouterLink } from 'vue-router';
import DataManagementSettings from '@/components/settings/DataManagementSettings.vue';
</script>

<template>
  <div class="min-h-screen bg-background px-4 py-6 pb-18.75">
    <RouterLink to="/" class="mb-4 inline-flex items-center gap-1 text-sm text-text/50 hover:text-primary">
      <AppIcon icon-name="ArrowLeft" :size="14" />
      Dashboard
    </RouterLink>
    <h1 class="mb-1 font-serif text-3xl font-bold text-card-gold">Data &amp; Backups</h1>
    <p class="mb-6 text-sm text-card-muted">
      Import JSON/Excel, download full backups, or restore data.
    </p>

    <DataManagementSettings />
  </div>
</template>
