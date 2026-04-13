// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL,
    pythonProviderMode: process.env.PYTHON_PROVIDER_MODE ?? 'mock',
    pythonBaseUrl: process.env.PYTHON_BASE_URL ?? 'http://127.0.0.1:8000',
    pythonTimeoutMs: Number(process.env.PYTHON_TIMEOUT_MS ?? 5000),
    authEnabled: process.env.AUTH_ENABLED === 'true',
    authBearerToken: process.env.AUTH_BEARER_TOKEN ?? '',
  },
  nitro: {
    experimental: {
      websocket: true,
    },
  },
})
