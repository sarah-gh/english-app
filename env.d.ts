/// <reference types="vite/client" />

// This file has a top-level `export {}` below, which makes it a module — so augmenting the
// ambient `ImportMetaEnv`/`ImportMeta` interfaces (declared globally by vite/client) requires an
// explicit `declare global` block. A bare top-level `interface ImportMetaEnv` here would silently
// shadow nothing and merge with nothing, just declaring an unused local type.
declare global {
  interface ImportMetaEnv {
    /** OAuth 2.0 Client ID (Web application) from Google Cloud Console, used by Cloud Sync's
     *  Google Identity Services sign-in. Cloud Sync stays hidden/disabled when this is unset. */
    readonly VITE_GOOGLE_CLIENT_ID?: string
  }
}

declare module 'vue-iconsax/dist/components/icons/*.vue.js' {
  import type { DefineComponent } from 'vue'

  const component: DefineComponent<{
    type?: 'linear' | 'outline' | 'twotone' | 'bulk' | 'broken' | 'bold'
    size?: string | number
    color?: string
    strokeWidth?: string
  }>
  export default component
}

declare module 'vue' {
  export interface GlobalComponents {
    AppIcon: (typeof import('./src/components/app/AppIcon.vue'))['default']
  }
}

export {}
