import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/integration/**/*.test.ts'],
    fileParallelism: false,
    isolate: false,
    testTimeout: 120_000,
    hookTimeout: 180_000,
    environment: 'node',
    env: {
      NODE_ENV: 'test',
    },
  },
})
