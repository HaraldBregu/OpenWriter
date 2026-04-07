import type { AgentDefinition } from '../core/definition';
import type { AgentStreamEvent } from '../core/types';
import { createVisionAgent, generateImage } from './image-generation';

const definition: AgentDefinition = {
	id: 'image-generator',
	name: 'Image Generator',
	category: 'utility',
	defaultModel: {
		providerId: 'openai',
		modelId: 'gpt-image-1',
		temperature: 0,
	},
	async *execute(input) {
		if (input.provider.providerId !== 'openai') {
			yield {
				type: 'error',
				error: 'Image Generator requires an OpenAI provider.',
				code: 'IMAGE_GENERATOR_ERROR',
				runId: input.runId,
			} satisfies AgentStreamEvent;
			return;
		}

		yield {
			type: 'thinking',
			content: 'Generating image...',
			runId: input.runId,
		} satisfies AgentStreamEvent;

		try {
			const agent = createVisionAgent({
				apiKey: input.provider.apiKey,
				url: input.provider.baseUrl,
				provider: 'openai',
			});

			const result = await generateImage({
				agent,
				prompt: input.prompt,
				signal: input.signal,
				metadata: input.metadata,
				workspacePath: input.runtime.workspaceService?.getCurrent(),
				logger: input.logger,
			});

			const response = [
				`![Generated image](<${result.localUrl}>)`,
				'',
				`Saved image: \`${result.filePath}\``,
			].join('\n');

			yield {
				type: 'done',
				content: response,
				tokenCount: 0,
				runId: input.runId,
			} satisfies AgentStreamEvent;
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : String(error);
			input.logger?.error('ImageGeneratorAgent', `Execution failed: ${message}`);
			yield {
				type: 'error',
				error: message,
				code: 'IMAGE_GENERATOR_ERROR',
				runId: input.runId,
			} satisfies AgentStreamEvent;
		}
	},
};

export { definition as ImageGeneratorAgent };
