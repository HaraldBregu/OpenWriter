import path from 'node:path';
import { createGenerateImageTool } from '../../tools';
import type { NodeContext } from './node';

export class ImageNode {
	readonly name = 'image' as const;

	async run(ctx: NodeContext, imagePrompt: string): Promise<void> {
		const { input, agentCtx, state } = ctx;
		const step = state.beginStep(this.name, imagePrompt);

		try {
			if (!input.imageProviderId || !input.imageApiKey || !input.imageModelName) {
				throw new Error('Image provider not configured');
			}

			const imagesRoot = input.workspacePath ?? path.dirname(input.documentPath);
			const tool = createGenerateImageTool({
				imagesRoot,
				providerId: input.imageProviderId,
				apiKey: input.imageApiKey,
				modelName: input.imageModelName,
				contentFilePath: input.documentPath,
			});

			const args = { prompt: imagePrompt };
			const runImage = tool.execute.bind(tool);
			const result = await runImage(`image-${state.images.length + 1}`, args, agentCtx.signal);
			const output = result.content
				.map((c) => (c.type === 'text' ? c.text : ''))
				.join('');

			state.addToolCall({
				name: tool.name,
				argumentsRaw: JSON.stringify(args),
				output,
			});

			const relativePath = result.details?.relativePath ?? `images/unknown-${Date.now()}.png`;
			state.addImage({ relativePath, prompt: imagePrompt });
			state.completeStep(step, { relativePath, prompt: imagePrompt });
		} catch (error) {
			const msg = error instanceof Error ? error.message : String(error);
			state.failStep(step, msg);
			throw error;
		}
	}
}
