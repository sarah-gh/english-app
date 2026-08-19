import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { seedInitialDataIfNeeded } from './db/seed'

const app = createApp(App)

app.use(createPinia())
app.use(router)

seedInitialDataIfNeeded().finally(() => {
  app.mount('#app')
})
