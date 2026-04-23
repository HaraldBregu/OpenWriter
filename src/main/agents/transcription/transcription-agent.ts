import { createReadStream } from 'node:fs';
import { basename } from 'node:path';
import OpenAI, { toFile } from 'openai';
import { BaseAgent } from '../core/base-agent';
import type { AgentContext } from '../core/agent';
import { AgentValidationError } from '../core/agent-errors';
import type {
	TranscriptionAgentInput,
	TranscriptionAgentOutput,
	TranscriptionSegment,
} from './types';

const PROVIDER_BASE_URLS: Record<string, string | undefined> = {
	openai: undefined,
};

interface VerboseTranscription {
	text: string;
	language?: string;
	duration?: number;
	segments?: Array<{ start: number; end: number; text: string }>;
}

/**
 * TranscriptionAgent — audio/video → text via OpenAI Whisper / gpt-4o-transcribe.
 *
 * Accepts an absolute file path or base64 bytes. Video files (mp4/webm) are
 * transcribed directly by the API via audio-track extraction. Supported
 * formats: flac, mp3, mp4, mpeg, mpga, m4a, ogg, wav, webm. Max 25MB per call.
 */
export class TranscriptionAgent extends BaseAgent<TranscriptionAgentInput, TranscriptionAgentOutput> {
	readonly type = 'transcription';

	validate(input: TranscriptionAgentInput): void {
		if (!input.source?.trim()) {
			throw new AgentValidationError(this.type, 'source required');
		}
		if (!input.apiKey?.trim()) {
			throw new AgentValidationError(this.type, 'apiKey required');
		}
		if (!input.modelName?.trim()) {
			throw new AgentValidationError(this.type, 'modelName required');
		}
		if (input.sourceKind === 'base64') {
			if (!input.fileName?.trim()) {
				throw new AgentValidationError(this.type, 'fileName required for base64 source');
			}
			if (!input.mimeType?.trim()) {
				throw new AgentValidationError(this.type, 'mimeType required for base64 source');
			}
		}
	}

	protected async run(
		input: TranscriptionAgentInput,
		ctx: AgentContext
	): Promise<TranscriptionAgentOutput> {
		const baseURL = PROVIDER_BASE_URLS[input.providerId];
		const client = new OpenAI({ apiKey: input.apiKey, ...(baseURL ? { baseURL } : {}) });

		this.reportProgress(ctx, 10, 'Preparing audio');
		const file = await this.buildUploadable(input);

		this.ensureNotAborted(ctx.signal);
		this.reportProgress(ctx, 30, 'Uploading to transcription API');

		const responseFormat = input.responseFormat ?? 'json';
		const response = await client.audio.transcriptions.create(
			{
				file,
				model: input.modelName,
				response_format: responseFormat,
				...(input.language ? { language: input.language } : {}),
				...(input.prompt ? { prompt: input.prompt } : {}),
				...(input.temperature != null ? { temperature: input.temperature } : {}),
			},
			ctx.signal ? { signal: ctx.signal } : undefined
		);

		this.ensureNotAborted(ctx.signal);
		this.reportProgress(ctx, 90, 'Finalizing transcript');

		const output = this.buildOutput(response, input, responseFormat);

		ctx.onEvent?.({
			kind: 'text',
			at: Date.now(),
			payload: { text: output.text },
		});

		this.reportProgress(ctx, 100, 'Transcription complete');
		return output;
	}

	private async buildUploadable(
		input: TranscriptionAgentInput
	): Promise<Awaited<ReturnType<typeof toFile>>> {
		if (input.sourceKind === 'file') {
			const name = basename(input.source);
			return toFile(createReadStream(input.source), name);
		}

		const buffer = Buffer.from(input.source, 'base64');
		return toFile(buffer, input.fileName!, { type: input.mimeType });
	}

	private buildOutput(
		response: unknown,
		input: TranscriptionAgentInput,
		responseFormat: NonNullable<TranscriptionAgentInput['responseFormat']>
	): TranscriptionAgentOutput {
		if (typeof response === 'string') {
			return { text: response, model: input.modelName };
		}

		const data = (response ?? {}) as VerboseTranscription;
		const segments: TranscriptionSegment[] | undefined = data.segments?.map((s) => ({
			start: s.start,
			end: s.end,
			text: s.text,
		}));

		return {
			text: data.text ?? '',
			model: input.modelName,
			...(data.language ? { language: data.language } : {}),
			...(data.duration != null ? { duration: data.duration } : {}),
			...(segments && responseFormat === 'verbose_json' ? { segments } : {}),
		};
	}
}
