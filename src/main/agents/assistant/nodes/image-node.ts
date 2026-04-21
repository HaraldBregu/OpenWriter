import path from 'node:path';
import { createGenerateImageTool } from '../../tools';
import type { AssistantNode, NodeContext } from './node';

const IMAGE_RELATIVE_PATH_PATTERN = /images\/[^\s]+/;

export class ImageNode implements AssistantNode {
	readonly name = 'image' as const;

	async run(ctx: NodeContext): Promise<void> {
		const { input, agentCtx, emit, state } = ctx;

		if (!input.imageProviderId || !input.imageApiKey || !input.imageModelName) {
			emit({
				node: this.name,
				status: 'error',
				error: 'Image provider not configured',
			});
			throw new Error('Image provider not configured');
		}

		emit({ node: this.name, status: 'running', data: { prompt: input.prompt } });

		const documentFolder = path.dirname(input.documentPath);
		const tool = createGenerateImageTool({
			cwd: documentFolder,
			providerId: input.imageProviderId,
			apiKey: input.imageApiKey,
			modelName: input.imageModelName,
			contentFilePath: input.documentPath,
		});

		const args = { prompt: input.prompt };
		const runImage = tool.execute.bind(tool);
		const result = await runImage('image-node', args, agentCtx.signal);
		const output = result.content
			.map((c) => (c.type === 'text' ? c.text : ''))
			.join('');

		state.toolCalls.push({
			name: tool.name,
			argumentsRaw: JSON.stringify(args),
			output,
		});

		const match = IMAGE_RELATIVE_PATH_PATTERN.exec(output);
		if (match) {
			state.imageResult = { relativePath: match[0], prompt: input.prompt };
		}

		if (!state.textResult) {
			state.textResult = state.imageResult
				? `Generated image at ${state.imageResult.relativePath}.`
				: 'Image generation completed.';
		}

		emit({ node: this.name, status: 'done', data: state.imageResult });
	}
}
