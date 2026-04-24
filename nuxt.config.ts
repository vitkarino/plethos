// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: [
    '@fontsource/pt-sans/400.css',
    '@fontsource/pt-sans/700.css',
    '@fontsource/pt-mono/400.css',
    '~/assets/styles/scss/main.scss'
  ]
})
