import { HttpPythonSignalProvider } from './httpPythonSignalProvider'
import { MockPythonSignalProvider } from './mockPythonSignalProvider'
import type { SignalProvider } from './signalProvider'

interface ProviderCache {
  mode: string
  provider: SignalProvider
}

const globalProvider = globalThis as typeof globalThis & {
  __pulsoSignalProvider?: ProviderCache
}

export function getSignalProvider(): SignalProvider {
  const mode = (process.env.PYTHON_PROVIDER_MODE ?? 'mock').toLowerCase()

  if (globalProvider.__pulsoSignalProvider?.mode === mode) {
    return globalProvider.__pulsoSignalProvider.provider
  }

  const provider = mode === 'http'
    ? new HttpPythonSignalProvider({
        baseUrl: process.env.PYTHON_BASE_URL ?? 'http://127.0.0.1:8000',
        timeoutMs: Number(process.env.PYTHON_TIMEOUT_MS ?? 5000),
      })
    : new MockPythonSignalProvider()

  globalProvider.__pulsoSignalProvider = {
    mode,
    provider,
  }

  return provider
}
