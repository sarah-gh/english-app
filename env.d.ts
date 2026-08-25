/// <reference types="vite/client" />

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
