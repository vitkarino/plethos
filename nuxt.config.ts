// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  runtimeConfig: {
    public: {
      pulsoApiBaseUrl: process.env.NUXT_PUBLIC_PULSO_API_BASE_URL ?? 'http://127.0.0.1:8080/api',
      pulsoWsBaseUrl: process.env.NUXT_PUBLIC_PULSO_WS_BASE_URL ?? 'ws://127.0.0.1:8080'
    }
  },
  css: [
    '@fontsource/pt-sans/400.css',
    '@fontsource/pt-sans/700.css',
    '@fontsource/pt-mono/400.css',
    '~/assets/styles/scss/main.scss'
  ]
})
