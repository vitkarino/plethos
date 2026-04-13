import { execSync, spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const rootDir = resolve(fileURLToPath(new URL('../../', import.meta.url)))

const globalBootstrap = globalThis as typeof globalThis & {
  __pulsoIntegrationBootPromise?: Promise<void>
  __pulsoApiBaseUrl?: string
  __pulsoServerProcess?: ChildProcessWithoutNullStreams
}

async function waitForServer(baseUrl: string, timeoutMs = 45_000): Promise<void> {
  const startedAt = Date.now()

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(baseUrl)

      if (response.ok || response.status === 404) {
        return
      }
    } catch {
      // retry
    }

    await new Promise((resolve) => setTimeout(resolve, 300))
  }

  throw new Error(`Server was not ready within ${timeoutMs}ms`) 
}

function registerServerCleanup() {
  if (!globalBootstrap.__pulsoServerProcess) {
    return
  }

  const stop = () => {
    if (!globalBootstrap.__pulsoServerProcess) {
      return
    }

    if (!globalBootstrap.__pulsoServerProcess.killed) {
      globalBootstrap.__pulsoServerProcess.kill('SIGTERM')
    }
  }

  process.once('exit', stop)
  process.once('SIGINT', stop)
  process.once('SIGTERM', stop)
}

export function bootstrapIntegrationSuite(): Promise<void> {
  if (globalBootstrap.__pulsoIntegrationBootPromise) {
    return globalBootstrap.__pulsoIntegrationBootPromise
  }

  const bootPromise = (async () => {
    const testDatabaseUrl =
      process.env.TEST_DATABASE_URL ??
      process.env.DATABASE_URL ??
      'postgres://postgres:postgres@127.0.0.1:55432/pulso_test'

    process.env.DATABASE_URL = testDatabaseUrl
    process.env.PYTHON_PROVIDER_MODE = process.env.PYTHON_PROVIDER_MODE ?? 'mock'

    try {
      execSync('npm run db:migrate', {
        cwd: rootDir,
        stdio: 'inherit',
        env: process.env,
      })
    } catch {
      throw new Error(
        'Failed to run db:migrate. Ensure PostgreSQL is running and TEST_DATABASE_URL is reachable.',
      )
    }

    try {
      execSync('npm run db:seed', {
        cwd: rootDir,
        stdio: 'inherit',
        env: process.env,
      })
    } catch {
      throw new Error(
        'Failed to run db:seed. Ensure migrations are applied and database permissions are correct.',
      )
    }

    try {
      execSync('npm run build', {
        cwd: rootDir,
        stdio: 'inherit',
        env: process.env,
      })
    } catch {
      throw new Error('Failed to build Nuxt app for integration tests')
    }

    const host = '127.0.0.1'
    const port = Number(process.env.INTEGRATION_SERVER_PORT ?? 3301)
    const baseUrl = `http://${host}:${port}/`

    const serverProcess = spawn('node', ['.output/server/index.mjs'], {
      cwd: rootDir,
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: 'test',
        HOST: host,
        PORT: String(port),
        DATABASE_URL: testDatabaseUrl,
      },
    })

    globalBootstrap.__pulsoServerProcess = serverProcess
    registerServerCleanup()

    await waitForServer(baseUrl)

    globalBootstrap.__pulsoApiBaseUrl = baseUrl
  })()

  globalBootstrap.__pulsoIntegrationBootPromise = bootPromise

  return bootPromise
}
