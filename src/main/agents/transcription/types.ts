export type TranscriptionSourceKind = 'file' | 'base64';

export type TranscriptionResponseFormat = 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt';

/**
 * Input for TranscriptionAgent.
 *
 * `source` carries either:
 *   - An absolute filesystem path when `sourceKind === 'file'`, or
 *   - Base64-encoded audio/video bytes when `sourceKind === 'base64'`.
 *
 * OpenAI's transcription endpoint accepts: flac, mp3, mp4, mpeg, mpga, m4a,
 * ogg, wav, webm. Video formats (mp4/webm) are transcribed by extracting
 * the audio track server-side.
 */
export interface TranscriptionAgentInput {
	source: string;
	sourceKind: TranscriptionSourceKind;
	/** Required when sourceKind === 'base64'; used to name the uploaded file. */
	fileName?: string;
	/** Required when sourceKind === 'base64'; content-type for the upload. */
	mimeType?: string;
	providerId: string;
	apiKey: string;
	/** e.g. `whisper-1`, `gpt-4o-transcribe`, `gpt-4o-mini-transcribe`. */
	modelName: string;
	/** ISO-639-1 language code hint (e.g. `en`, `it`). */
	language?: string;
	/** Guidance prompt to steer the transcription style/vocabulary. */
	prompt?: string;
	/** Response verbosity. Defaults to `json` (text only). */
	responseFormat?: TranscriptionResponseFormat;
	/** Sampling temperature. Defaults to 0 (deterministic). */
	temperature?: number;
}

export interface TranscriptionSegment {
	start: number;
	end: number;
	text: string;
}

export interface TranscriptionAgentOutput {
	text: string;
	model: string;
	language?: string;
	/** Duration in seconds, when provider returns it (verbose_json). */
	duration?: number;
	/** Per-segment timings, when provider returns them (verbose_json). */
	segments?: TranscriptionSegment[];
}
