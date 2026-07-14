import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

function createStorageMock(): Storage {
  let values: Record<string, string> = {}

  return {
    getItem: (key: string) => values[key] ?? null,
    setItem: (key: string, value: string) => {
      values[key] = String(value)
    },
    removeItem: (key: string) => {
      delete values[key]
    },
    clear: () => {
      values = {}
    },
    key: (index: number) => Object.keys(values)[index] ?? null,
    get length() {
      return Object.keys(values).length
    },
  }
}

const localStorageMock = createStorageMock()
const sessionStorageMock = createStorageMock()
Object.defineProperty(window, 'localStorage', { configurable: true, value: localStorageMock })
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: localStorageMock })
Object.defineProperty(window, 'sessionStorage', { configurable: true, value: sessionStorageMock })
Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: sessionStorageMock })

Object.defineProperty(window, 'matchMedia', {
  configurable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

class ObserverMock {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}

globalThis.IntersectionObserver = ObserverMock as unknown as typeof IntersectionObserver
globalThis.ResizeObserver = ObserverMock as unknown as typeof ResizeObserver

Object.defineProperty(window.HTMLElement.prototype, 'scrollIntoView', {
  configurable: true,
  value: vi.fn(),
})

Object.defineProperty(window, 'Audio', {
  configurable: true,
  value: vi.fn().mockImplementation(() => ({
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    currentTime: 0,
    volume: 1,
    muted: false,
  })),
})
