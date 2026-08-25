import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'

import App from './App.vue'
import AppIcon from './components/app/AppIcon.vue'
import router from './router'
import { seedInitialDataIfNeeded } from './db/seed'
import { vueQueryPluginOptions } from './plugins/query-client'
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
})
