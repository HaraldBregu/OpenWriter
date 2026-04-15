import OpenAI from 'openai';
import type { AgentDefinition } from '../core/definition';
import type { AgentStreamEvent, AgentHistoryMessage } from '../core/types';

const LOG_SOURCE = 'TextAgent';

const SYSTEM_PROMPT = `You are a professional writing assistant embedded in a document editor.

You receive the user's request along with surrounding writing context.

Determine what the user needs and respond accordingly:

- **Continue**: Extend the text naturally from the provided context without repeating existing text.
- **Improve**: Refine clarity, tone, and structure while preserving meaning.
- **Transform**: Rewrite or adapt the text to a different style, format, or perspective.
- **Expand**: Add detail, depth, or examples while staying on topic.
- **Condense**: Summarize or shorten while preserving key ideas.

Rules:

- Infer the best action from the request and surrounding context.
- Match the tone, voice, and style of the surrounding document unless the user explicitly requests otherwise.
- Respect explicit constraints such as word limits, brevity requests, or audience specifications.
- When continuing, make the text flow naturally with the surrounding context.
- Return only the written text — no labels, explanations, or meta commentary.`;

function toOpenAIMessages(
	history: AgentHistoryMessage[]
): Array<OpenAI.Chat.ChatCompletionMessageParam> {
	return history.map((msg) => ({
		role: msg.role as 'user' | 'assistant',
		content: msg.content,
	}));
}

const definition: AgentDefinition = {
	id: 'text',
	name: 'Agent Text',
	category: 'writing',

	async *execute(input) {
		const { runId, provider, prompt, temperature, maxTokens, history, signal, logger } = input;

		yield {
			type: 'thinking',
			content: 'Writing...',
			runId,
		} satisfies AgentStreamEvent;

		const client = new OpenAI({
			apiKey: provider.apiKey,
			...(provider.baseUrl ? { baseURL: provider.baseUrl } : {}),
		});

		const messages: Array<OpenAI.Chat.ChatCompletionMessageParam> = [
			{ role: 'system', content: SYSTEM_PROMPT },
			...toOpenAIMessages(history),
			{ role: 'user', content: prompt },
		];

		logger?.info(LOG_SOURCE, 'Starting writer execution', {
			promptLength: prompt.length,
			historyLength: history.length,
			model: provider.modelName,
		});

		try {
			const stream = await client.chat.completions.create(
				{
					model: provider.modelName,
					messages,
					temperature,
					max_tokens: maxTokens,
					stream: true,
				},
				{ signal }
			);

			let content = '';
			let tokenCount = 0;

			for await (const chunk of stream) {
				const token = chunk.choices[0]?.delta?.content;
				if (token) {
					content += token;
					tokenCount++;
					yield { type: 'token', token, runId } satisfies AgentStreamEvent;
				}
			}

			logger?.info(LOG_SOURCE, 'Writer execution completed', {
				contentLength: content.length,
				tokenCount,
			});

			yield {
				type: 'done',
				content,
				tokenCount,
				runId,
			} satisfies AgentStreamEvent;
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : String(error);
			logger?.error(LOG_SOURCE, `Writer execution failed: ${message}`);
			yield {
				type: 'error',
				error: message,
				code: 'WRITER_AGENT_ERROR',
				runId,
			} satisfies AgentStreamEvent;
		}
	},
};

export { definition as WriterAgent };
