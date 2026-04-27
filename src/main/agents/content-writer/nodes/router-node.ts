import { ROUTE_SCHEMA, parseRouting } from '../schemas';
import type {
	ContentWriterAgentInput,
	ContentWriterLlmCaller,
	ContentWriterRouting,
} from '../types';

const SYSTEM_PROMPT = [
	'You route a content-writer request to exactly one of three nodes:',
	'- "short": the user wants a brief piece of text (one or two sentences, a tagline, a quick reply, a small caption).',
	'- "grammar": the user wants existing text corrected, polished, or proofread without changing its meaning.',
	'- "long": the user wants a longer, structured piece (article, essay, multi-paragraph copy, story, detailed explanation).',
	'Pick "grammar" only when the user is asking to fix, correct, or improve grammar/spelling/style of existing text.',
	'Pick "short" for terse outputs, "long" for substantial outputs.',
	'Respond as strict JSON matching the provided schema.',
].join(' ');

export interface RouterNodeOptions {
	llmCaller: ContentWriterLlmCaller;
}

export class RouterNode {
	readonly name = 'router' as const;

	constructor(private readonly opts: RouterNodeOptions) {}

	async route(input: ContentWriterAgentInput, signal: AbortSignal): Promise<ContentWriterRouting> {
		const raw = await this.opts.llmCaller.call(
			{
				modelName: input.modelName,
				systemPrompt: SYSTEM_PROMPT,
				userPrompt: buildContext(input),
				temperature: 0,
				jsonSchema: ROUTE_SCHEMA,
			},
			signal
		);
		return parseRouting(raw);
	}
}

function buildContext(input: ContentWriterAgentInput): string {
	const lines = [`User request: ${input.prompt}`];
	if (input.existingText?.trim()) {
		lines.push('', 'Existing text supplied by user:', input.existingText);
	}
	lines.push('', 'Choose the route.');
	return lines.join('\n');
}
