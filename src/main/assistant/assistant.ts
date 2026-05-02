import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

// TODO: lift to per-assistant config / model selection UI.
const HARDCODED_MODEL = 'gpt-4o-mini';

export interface AssistantOptions {
	id: string;
	model?: string;
	/** Resolves the OpenAI API key at send-time so updates in settings take effect. */
	getApiKey: () => string | undefined;
	systemPrompt?: string;
}

/**
 * One conversational assistant. Owns its OpenAI client and message history.
 * The API key is resolved per-send via `getApiKey` so changes to the store
 * propagate without re-creating the assistant.
 */
export class Assistant {
	readonly id: string;
	readonly model: string;
	private readonly getApiKey: () => string | undefined;
	private readonly history: ChatCompletionMessageParam[] = [];
	private cachedKey: string | null = null;
	private cachedClient: OpenAI | null = null;

	constructor(opts: AssistantOptions) {
		this.id = opts.id;
		this.model = opts.model ?? HARDCODED_MODEL;
		this.getApiKey = opts.getApiKey;
		if (opts.systemPrompt) {
			this.history.push({ role: 'system', content: opts.systemPrompt });
		}
	}

	private client(): OpenAI {
		const key = this.getApiKey();
		if (!key) {
			throw new Error(
				'OpenAI API key not configured. Add an OpenAI provider in Settings.'
			);
		}
		if (key !== this.cachedKey) {
			this.cachedKey = key;
			this.cachedClient = new OpenAI({ apiKey: key });
		}
		return this.cachedClient!;
	}

	async send(userMessage: string): Promise<string> {
		this.history.push({ role: 'user', content: userMessage });
		const response = await this.client().chat.completions.create({
			model: this.model,
			messages: this.history,
		});
		const text = response.choices[0]?.message?.content ?? '';
		this.history.push({ role: 'assistant', content: text });
		return text;
	}

	reset(): void {
		const sys = this.history.find((m) => m.role === 'system');
		this.history.length = 0;
		if (sys) this.history.push(sys);
	}
}
