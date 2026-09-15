<script setup lang="ts">
import PageHeaderBack from '@/components/common/PageHeaderBack.vue';
import DataManagementSettings from '@/components/settings/DataManagementSettings.vue';
</script>

<template>
  <div class="min-h-screen bg-background px-4 py-6 pb-18.75">
    <PageHeaderBack to="/" label="Dashboard" />
    <h1 class="mb-1 font-serif text-3xl font-bold text-card-gold">Data &amp; Backups</h1>
    <p class="mb-6 text-sm text-card-muted">
      Import JSON/Excel, download full backups, or restore data.
    </p>

    <DataManagementSettings />
  </div>
</template>
