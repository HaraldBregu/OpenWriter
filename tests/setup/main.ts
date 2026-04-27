/**
 * Setup for main-process Jest tests (Node environment).
 *
 * Seeds globalThis.__VITE_ENV__ so source files rewritten by
 * vite-env-transform.cjs (which replaces `import.meta.env.X` with
 * `globalThis.__VITE_ENV__.X`) don't blow up when no real env is wired.
 */
(globalThis as unknown as { __VITE_ENV__: Record<string, unknown> }).__VITE_ENV__ = {
	VITE_OPENAI_API_KEY: undefined,
	VITE_OPENAI_MODEL: undefined,
};
