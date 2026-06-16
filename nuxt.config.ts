// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  runtimeConfig: {
    public: {
      ApiBaseUrl: process.env.NUXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:8080/api',
      WsBaseUrl: process.env.NUXT_PUBLIC_WS_BASE_URL ?? 'ws://127.0.0.1:8080'
    }
  },
  devtools: {
    enabled: false
  },
  css: [
    '@fontsource/pt-sans/400.css',
    '@fontsource/pt-sans/700.css',
    '@fontsource/pt-mono/400.css',
    '~/assets/styles/main.scss'
  ]
})
