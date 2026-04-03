import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import type { LoggerService } from '../../../../services/logger';
import { extractTokenFromChunk } from '../../../../shared/ai-utils';
import { toLangChainHistoryMessages } from '../../../core/history';
import { ASSISTANT_STATE_MESSAGES } from '../../messages';
import type { AssistantState } from '../../state';
import SYSTEM_PROMPT from './IMAGE_GENERATION_SYSTEM.md?raw';

const NO_IMAGE_FINDINGS = 'No image output requested.';

function buildHumanMessage(
	prompt: string,
	normalizedPrompt: string,
	intentFindings: string,
	imagePrompt: string,
	imageFindings: string
): string {
	return [
		'Original user request:',
		prompt,
		'',
		'Normalized request:',
		normalizedPrompt,
		'',
		'Intent classification:',
		'<intent_findings>',
		intentFindings,
		'</intent_findings>',
		'',
		'Enhanced image prompt:',
		'<image_prompt>',
		imagePrompt || normalizedPrompt,
		'</image_prompt>',
		'',
		'Image prompt enhancer findings:',
		'<image_findings>',
		imageFindings || 'No image prompt findings were produced.',
		'</image_findings>',
	].join('\n');
}

export async function imageGenerationNode(
	state: typeof AssistantState.State,
	model: BaseChatModel,
	logger?: LoggerService
): Promise<Partial<typeof AssistantState.State>> {
	if (!state.needsImageGeneration) {
		logger?.debug(
			'ImageGenerationNode',
			'Skipping image generation because no image was requested'
		);
		return {
			imageFindings: NO_IMAGE_FINDINGS,
			response: NO_IMAGE_FINDINGS,
		};
	}

	const prompt = state.prompt.trim();
	const normalizedPrompt = (state.normalizedPrompt || state.prompt).trim();

	logger?.debug('ImageGenerationNode', 'Starting image generation planning', {
		promptLength: prompt.length,
		normalizedPromptLength: normalizedPrompt.length,
	});

	const messages = [
		new SystemMessage(SYSTEM_PROMPT),
		...toLangChainHistoryMessages(state.history),
		new HumanMessage(
			buildHumanMessage(
				state.prompt,
				normalizedPrompt,
				state.intentFindings,
				state.imagePrompt,
				state.imageFindings
			)
		),
	];

	let response = '';
	const stream = await model.stream(messages);
	for await (const chunk of stream) {
		const token = extractTokenFromChunk(chunk.content);
		if (token) {
			response += token;
		}
	}

	logger?.info('ImageGenerationNode', 'Image generation note produced', {
		responseLength: response.length,
	});

	return {
		phaseLabel: ASSISTANT_STATE_MESSAGES.IMAGE_GENERATOR,
		response: response || NO_IMAGE_FINDINGS,
	};
}
