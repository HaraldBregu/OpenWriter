import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import type { LoggerService } from '../../../../services/logger';
import { extractTokenFromChunk } from '../../../../shared/ai-utils';
import { toLangChainHistoryMessages } from '../../../core/history';
import type { AssistantState } from '../../state';
import SYSTEM_PROMPT from './IMAGE_GENERATION_SYSTEM.md?raw';

const NO_IMAGE_FINDINGS = 'No image output requested.';

function buildHumanMessage(
	prompt: string,
	normalizedPrompt: string,
	intentFindings: string
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
		return { imageFindings: NO_IMAGE_FINDINGS };
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
		new HumanMessage(buildHumanMessage(state.prompt, normalizedPrompt, state.intentFindings)),
	];
	const response = await model.invoke(messages);
	const imageFindings = extractTokenFromChunk(response.content).trim();

	logger?.info('ImageGenerationNode', 'Image generation note produced', {
		findingsLength: imageFindings.length,
	});

	return {
		imageFindings: imageFindings || NO_IMAGE_FINDINGS,
	};
}
