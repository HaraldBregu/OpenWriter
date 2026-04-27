/**
 * Custom Jest transform that rewrites Vite-only `import.meta.env.*` accesses
 * to a safe `globalThis.__VITE_ENV__.*` lookup, then delegates to ts-jest.
 *
 * ts-jest in CJS mode cannot parse `import.meta.env` because the resulting
 * CommonJS output has no notion of `import.meta`. The rewrite preserves the
 * runtime semantics for tests (the global is seeded in tests/setup/main.ts).
 */
const tsJest = require('ts-jest').default;

const baseTransformer = tsJest.createTransformer({
	tsconfig: 'tsconfig.node.json',
	useESM: false,
});

module.exports = {
	process(sourceText, sourcePath, transformOptions) {
		const rewritten = sourceText.replace(
			/import\.meta\.env/g,
			'(globalThis.__VITE_ENV__ || {})'
		);
		return baseTransformer.process(rewritten, sourcePath, transformOptions);
	},
	getCacheKey(sourceText, sourcePath, transformOptions) {
		if (typeof baseTransformer.getCacheKey === 'function') {
			return baseTransformer.getCacheKey(sourceText, sourcePath, transformOptions);
		}
		return sourcePath;
	},
};
