/**
 * Custom Jest transform that pre-processes Vite-specific `import.meta.env`
 * syntax before ts-jest compiles the file.
 *
 * ts-jest in CJS mode (useESM: false) cannot parse `import.meta` because it
 * is an ES module-only feature. This transform rewrites occurrences to a safe
 * global property access so ts-jest can compile the resulting TypeScript.
 *
 * Replacement strategy:
 *   import.meta.env.VITE_X  →  (global.__VITE_ENV__ && global.__VITE_ENV__.VITE_X)
 *   import.meta.env          →  (global.__VITE_ENV__ || {})
 *
 * The global.__VITE_ENV__ object is populated via the `setupFiles` entry
 * tests/setup/main.ts, which runs before any module is imported.
 */

'use strict'

const tsJestTransformer = require('ts-jest').default

let transformer = null

function getTransformer(config) {
  if (!transformer) {
    transformer = tsJestTransformer.createTransformer()
  }
  return transformer
}

module.exports = {
  process(sourceText, sourcePath, options) {
    // Replace import.meta.env.VITE_* with global.__VITE_ENV__ equivalents
    let processed = sourceText
      // import.meta.env.VITE_FOO_BAR → (globalThis.__VITE_ENV__?.VITE_FOO_BAR)
      .replace(
        /import\.meta\.env\.([A-Z_][A-Z0-9_]*)/g,
        '(globalThis.__VITE_ENV__ && globalThis.__VITE_ENV__.$1)'
      )
      // import.meta.env → (globalThis.__VITE_ENV__ || {})
      .replace(/import\.meta\.env/g, '(globalThis.__VITE_ENV__ || {})')
      // Any remaining import.meta references → ({})
      .replace(/import\.meta/g, '({})')

    // Delegate to ts-jest for actual TypeScript compilation
    return getTransformer(options).process(processed, sourcePath, options)
  },

  getCacheKey(sourceText, sourcePath, options) {
    return require('crypto')
      .createHash('sha256')
      .update(sourceText)
      .update(sourcePath)
      .update(JSON.stringify(options?.config?.globals ?? {}))
      .digest('hex')
  }
}
