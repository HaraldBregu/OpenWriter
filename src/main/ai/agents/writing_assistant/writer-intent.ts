/**
 * Intent classification types and JSON parsing utilities for the Writing Assistant agent.
 *
 * The LLM returns a JSON object, not a bare string. This module owns:
 *   - The `WriterIntentType` union that enumerates valid `type` values.
 *   - The `WriterIntentResult` interface that represents the full JSON structure.
 *   - `parseWriterIntent()` — a safe, narrowing parser with a typed fallback.
 *
 * Design principles:
 *   - `WriterIntentResult` is open for extension: future fields (`content_length`,
 *     `tone`, etc.) are optional so the parser does not break when they are absent.
 *   - The parser never throws. It returns a `WriterIntentResult` on every path,
 *     falling back to `FALLBACK_INTENT` when the raw text is not valid JSON or the
 *     `type` field is not a recognised intent.
 *   - No `any` types are used — unknown JSON is handled via `unknown` + narrowing.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * All valid values for the `type` field of a `WriterIntentResult`.
 *
 * "enhance" is deliberately renamed to "enhance_writing" so all intent names
 * follow the same `<verb>_writing` pattern, making routing code uniform.
 */
export type WriterIntentType = 'continue_writing' | 'enhance_writing';

/**
 * Full JSON structure returned by the intent-classification LLM call.
 *
 * Only `type` is required. All other fields are optional and reserved for
 * future classification signals (e.g. desired length, target tone). Consumers
 * should use discriminated-union narrowing on `type` and treat unknown extra
 * fields as opaque.
 */
export interface WriterIntentResult {
	/** The primary classification. Always present; never an empty string. */
	readonly type: WriterIntentType;

	/**
	 * Desired output length hint. Optional — populated by future model versions.
	 * Expected values: 'short' | 'medium' | 'long', but left as string to remain
	 * forward-compatible without a breaking type change.
	 */
	readonly contentLength?: string;

	/**
	 * Desired tone hint. Optional — populated by future model versions.
	 * E.g. 'formal', 'casual', 'persuasive'.
	 */
	readonly tone?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Set used for O(1) membership checks in `isWriterIntentType`. */
const VALID_INTENT_TYPES = new Set<WriterIntentType>(['continue_writing', 'enhance_writing']);

/** Returned by `parseWriterIntent` whenever the LLM output is unusable. */
export const FALLBACK_INTENT: WriterIntentResult = Object.freeze({
	type: 'continue_writing' as const,
});

// ---------------------------------------------------------------------------
// Type guard
// ---------------------------------------------------------------------------

/**
 * Narrows `value` to `WriterIntentType`.
 *
 * Using a named type guard instead of an inline cast keeps the narrowing
 * reusable and removes the need for any `as` assertions in the parser.
 */
export function isWriterIntentType(value: unknown): value is WriterIntentType {
	return typeof value === 'string' && VALID_INTENT_TYPES.has(value as WriterIntentType);
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

/**
 * Safely parse raw LLM output into a `WriterIntentResult`.
 *
 * Strips optional markdown code fences (` ```json … ``` `) that some models
 * wrap around JSON responses, then parses the inner text. Returns
 * `FALLBACK_INTENT` on any failure — never throws.
 *
 * @param raw - The raw string content from the LLM response.
 * @returns A valid `WriterIntentResult`; never `null` or `undefined`.
 */
export function parseWriterIntent(raw: string): WriterIntentResult {
	const trimmed = stripCodeFence(raw.trim());

	let parsed: unknown;
	try {
		parsed = JSON.parse(trimmed);
	} catch {
		return FALLBACK_INTENT;
	}

	return extractIntentResult(parsed);
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Remove optional ` ```json ``` ` or ` ``` ``` ` code fences from a string.
 * Only the content between the fences is returned; if no fences are present
 * the original string is returned unchanged.
 */
function stripCodeFence(text: string): string {
	const fencePattern = /^```(?:json)?\s*\n?([\s\S]*?)\n?```$/;
	const match = fencePattern.exec(text);
	return match !== null && match[1] !== undefined ? match[1].trim() : text;
}

/**
 * Extract and validate a `WriterIntentResult` from an already-parsed value.
 *
 * Returns `FALLBACK_INTENT` when:
 *   - the value is not a plain object
 *   - the `type` field is missing or not a recognised `WriterIntentType`
 */
function extractIntentResult(parsed: unknown): WriterIntentResult {
	if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
		return FALLBACK_INTENT;
	}

	const record = parsed as Record<string, unknown>;

	if (!isWriterIntentType(record['type'])) {
		return FALLBACK_INTENT;
	}

	const result: WriterIntentResult = { type: record['type'] };

	if (typeof record['contentLength'] === 'string') {
		return { ...result, contentLength: record['contentLength'] };
	}

	if (typeof record['tone'] === 'string') {
		return { ...result, tone: record['tone'] };
	}

	return result;
}
