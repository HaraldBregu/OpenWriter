/**
 * Setup file for main-process Jest tests (Node environment).
 *
 * Polyfills `import.meta.env` which is a Vite-only feature.
 * Without this, ts-jest in CJS mode rejects files that contain
 * `import.meta.env.*` references (e.g. AIChatHandler, AIEnhanceHandler).
 *
 * This runs via `setupFiles` (before module loading) so the global
 * is available when ts-jest compiles and executes the handler modules.
 */

// Polyfill import.meta for CJS/ts-jest environments
// ts-jest already transforms `import.meta` to `(void 0)` in CJS mode
// when it encounters the syntax, but some configurations need an explicit
// shim so the object is defined when the compiled code runs.
if (typeof (global as any).__importMetaEnv === 'undefined') {
  ;(global as any).__importMetaEnv = {
    VITE_OPENAI_API_KEY: undefined,
    VITE_OPENAI_MODEL: undefined
  }
}
