import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'

import App from './App.vue'
import AppIcon from './components/app/AppIcon.vue'
import router from './router'
import { seedInitialDataIfNeeded } from './db/seed'
import { vueQueryPluginOptions } from './plugins/query-client'
import { deduplicateLocalData } from './services/sync/deduplicate-local-data'
import { purgeOldSoftDeletes } from './services/sync/garbage-collector'
import { applyTheme, readStoredThemeMode } from './services/theme/apply-theme'

// Applied synchronously, before Vue/Pinia even start up, so the first paint is already in the
// right theme instead of flashing light before the theme store initializes.
applyTheme(readStoredThemeMode())

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(VueQueryPlugin, vueQueryPluginOptions)
app.component('AppIcon', AppIcon)

seedInitialDataIfNeeded().finally(() => {
  app.mount('#app')
  // Fire-and-forget: never blocks first paint, and any failure here shouldn't be fatal to the app.
  // Dedup runs first so `purgeOldSoftDeletes` never races it to hard-delete a tombstone it just
  // created (moot in practice — a fresh tombstone is nowhere near the 30-day cutoff — but keeps
  // the two maintenance passes' effects easy to reason about in order).
  deduplicateLocalData()
    .catch(() => {})
    .finally(() => purgeOldSoftDeletes().catch(() => {}))
})
