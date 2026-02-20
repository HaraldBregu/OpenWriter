/**
 * Polyfills that must be available before the test environment loads modules.
 * Used via `setupFiles` (runs before setupFilesAfterEnv).
 */
import { TextEncoder, TextDecoder } from 'util'

if (typeof globalThis.TextEncoder === 'undefined') {
  Object.assign(globalThis, { TextEncoder, TextDecoder })
}
