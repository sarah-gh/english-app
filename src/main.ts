import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'

import App from './App.vue'
import router from './router'
import { seedInitialDataIfNeeded } from './db/seed'
import { vueQueryPluginOptions } from './plugins/query-client'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(VueQueryPlugin, vueQueryPluginOptions)

seedInitialDataIfNeeded().finally(() => {
  app.mount('#app')
})
