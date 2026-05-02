import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

// TODO: replace with real config / per-provider lookup.
const HARDCODED_MODEL = 'gpt-4o-mini';
const HARDCODED_API_KEY = process.env.OPENAI_API_KEY ?? 'sk-REPLACE_ME';

export interface AssistantOptions {
	id: string;
	model?: string;
	apiKey?: string;
	systemPrompt?: string;
}

/**
 * One conversational assistant. Owns its OpenAI client and message history.
 * Stateless tool loop is intentionally omitted here -- this is the basic shell.
 */
export class Assistant {
	readonly id: string;
	readonly model: string;
	private readonly client: OpenAI;
	private readonly history: ChatCompletionMessageParam[] = [];

	constructor(opts: AssistantOptions) {
		this.id = opts.id;
		this.model = opts.model ?? HARDCODED_MODEL;
		this.client = new OpenAI({ apiKey: opts.apiKey ?? HARDCODED_API_KEY });
		if (opts.systemPrompt) {
			this.history.push({ role: 'system', content: opts.systemPrompt });
		}
	}

	async send(userMessage: string): Promise<string> {
		this.history.push({ role: 'user', content: userMessage });
		const response = await this.client.chat.completions.create({
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
