import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  // GitHub Pages serves this app from the /english-app/ project subpath, not the domain root.
  // The PWA manifest's start_url/scope/icons must be prefixed with the same base, or an
  // installed PWA launches at the domain root and immediately 404s.
  const base = command === 'build' ? '/english-app/' : '/'

  return {
    base,
    plugins: [
      vue(),
      vueDevTools(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        devOptions: {
          enabled: true,
          type: 'module',
        },
        manifest: {
          name: 'Flashcards',
          short_name: 'Flashcards',
          description: 'Offline-first smart flashcard app for learning English vocabulary and grammar.',
          theme_color: '#000000',
          background_color: '#ffffff',
          display: 'standalone',
          start_url: base,
          scope: base,
          icons: [
            { src: `${base}pwa-192x192.png`, sizes: '192x192', type: 'image/png' },
            { src: `${base}pwa-512x512.png`, sizes: '512x512', type: 'image/png' },
            {
              src: `${base}maskable-icon-512x512.png`,
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  }
})
