import { defineNuxtConfig } from 'nuxt/config'

// https://v3.nuxtjs.org/docs/directory-structure/nuxt.config
export default defineNuxtConfig({
  // GitHub Pages用にSPAモードを有効化
  ssr: false,
  spaLoadingTemplate: false,
  
  // Disable devtools to avoid pre-transform path issues
  devtools: { enabled: false },
  
  // GitHub Pages設定
  app: {
    baseURL: process.env.NODE_ENV === 'production' ? '/Sasaki-AI/' : '/',
    buildAssetsDir: 'assets',
  },
  
  // Keep components auto-import enabled but with explicit dirs
  components: [
    { path: '~/components', pathPrefix: false }
  ],
  css: [
    '@/assets/main.css',
    'vuetify/styles',
    '@mdi/font/css/materialdesignicons.css'
  ],
  build: {
    transpile: ['vuetify']
  },
  vite: {
    ssr: {
      noExternal: ['vuetify']
    },
    optimizeDeps: {
      include: ['vuetify'],
      exclude: ['@google/generative-ai']
    }
  }
})
