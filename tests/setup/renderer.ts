/**
 * Jest setup file for renderer process tests.
 *
 * Runs after the test framework is installed but before each test file.
 * Sets up:
 *   - @testing-library/jest-dom matchers (toBeInTheDocument, toHaveTextContent, etc.)
 *   - window.api mock (preload bridge)
 *   - window.electron mock
 *   - window.matchMedia stub (used by Tailwind/Radix)
 */
// TextEncoder/TextDecoder polyfill is handled by setupFiles (polyfills.ts)
import '@testing-library/jest-dom'
import { installMockApi, resetMockApi } from '../mocks/preload-bridge'

// Stub Element.scrollIntoView (not implemented in jsdom)
if (typeof Element.prototype.scrollIntoView === 'undefined') {
  Element.prototype.scrollIntoView = jest.fn()
}

// Install the window.api mock globally
installMockApi()

// Provide a minimal window.electron mock
Object.defineProperty(window, 'electron', {
  value: {
    process: { platform: 'win32', versions: { electron: '40.0.0', node: '22.0.0' } },
    ipcRenderer: {
      invoke: jest.fn(),
      send: jest.fn(),
      on: jest.fn(),
      once: jest.fn(),
      removeListener: jest.fn()
    }
  },
  writable: true,
  configurable: true
})

// Stub matchMedia (used by Radix UI, Tailwind responsive utilities, etc.)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  configurable: true,
  value: jest.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn()
  }))
})

// Stub ResizeObserver (used by many UI libraries)
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}))

// Stub IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
  root: null,
  rootMargin: '',
  thresholds: []
}))

// Reset mocks between tests to avoid state leaking
beforeEach(() => {
  resetMockApi()
})

afterEach(() => {
  jest.restoreAllMocks()
})
