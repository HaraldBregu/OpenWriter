/**
 * Setup file for main-process Jest tests (Node environment).
 *
 * Polyfills the global.__VITE_ENV__ object that the vite-env-transform.cjs
 * custom transform injects in place of `import.meta.env.*` expressions.
 *
 * ts-jest in CJS mode cannot parse `import.meta` syntax, so the transform
 * rewrites those references to `globalThis.__VITE_ENV__.X`. This file seeds
 * that global with empty/undefined values so handler modules don't throw
 * during test execution when no API keys are configured.
 *
 * Tests that need a specific API key value should override
 * `globalThis.__VITE_ENV__` in their beforeEach / test body.
 */
;(globalThis as any).__VITE_ENV__ = {
  VITE_OPENAI_API_KEY: undefined,
  VITE_OPENAI_MODEL: undefined
}
