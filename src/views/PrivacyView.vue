<script setup lang="ts">
import { RouterLink } from 'vue-router';
</script>

<template>
  <div class="bg-background min-h-screen px-4 py-6 pb-18.75">
    <RouterLink
      to="/"
      class="text-text/50 hover:text-primary mb-4 inline-flex items-center gap-1 text-sm"
    >
      <AppIcon
        icon-name="ArrowLeft"
        :size="14"
      />
      Dashboard
    </RouterLink>
    <h1 class="text-text mb-1 text-xl font-semibold">Privacy Policy</h1>
    <p class="text-text/50 mb-6 text-sm">Last updated: September 2026</p>

    <div class="text-text/80 space-y-5 text-sm leading-relaxed">
      <section>
        <h2 class="text-text mb-1 text-sm font-semibold">Local-first by design</h2>
        <p>
          Vocabulary Flashcards App runs entirely in your browser. There is no application server:
          your decks, cards, tags, quiz history, and study statistics are stored locally on your
          device using IndexedDB. Nothing you create in the app is sent anywhere unless you choose
          to enable Cloud Sync.
        </p>
      </section>

      <section>
        <h2 class="text-text mb-1 text-sm font-semibold">What Cloud Sync does</h2>
        <p>
          Cloud Sync is optional. When you connect a Google Account, the app uses the Google Drive
          API's <code class="bg-text/10 rounded px-1 py-0.5 text-xs">appDataFolder</code> scope to
          back up and sync your flashcard data as a single file. This folder is hidden and private
          to this app, it is not visible in your regular Google Drive, and the app cannot see or
          modify any of your other Drive files.
        </p>
      </section>

      <section>
        <h2 class="text-text mb-1 text-sm font-semibold">Google Account information</h2>
        <p>
          To show which account is connected, the app also reads your basic Google profile (name,
          email address, and profile picture) at sign-in. This information is stored only on your
          device to display your connected account and is never transmitted to any server we
          operate, there is none.
        </p>
      </section>

      <section>
        <h2 class="text-text mb-1 text-sm font-semibold">No third parties</h2>
        <p>
          The app does not collect analytics, does not use advertising or tracking services, and
          does not sell or share your data with any third party. The only outside service it ever
          talks to is Google Drive, and only when you turn Cloud Sync on.
        </p>
      </section>

      <section>
        <h2 class="text-text mb-1 text-sm font-semibold">Your control</h2>
        <p>
          You can disconnect Cloud Sync at any time from Settings, which revokes the app's access to
          your Google Account. Clearing your browser's site data removes all locally stored
          flashcard data from this device.
        </p>
      </section>
    </div>
  </div>
</template>
