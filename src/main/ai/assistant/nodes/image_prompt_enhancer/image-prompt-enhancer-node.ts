import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import type { LoggerService } from '../../../../services/logger';
import { extractTokenFromChunk } from '../../../../shared/ai-utils';
import { toLangChainHistoryMessages } from '../../../core/history';
import { ASSISTANT_STATE_MESSAGES } from '../../messages';
import { readLabeledValue } from '../../node-output';
import type { AssistantState } from '../../state';
import SYSTEM_PROMPT from './IMAGE_PROMPT_ENHANCER_SYSTEM.md?raw';

const NO_IMAGE_PROMPT_FINDINGS = 'No image prompt enhancement required.';

function buildFallback(state: typeof AssistantState.State) {
	const requestedImage = state.prompt.trim() || 'No request provided.';
	const enhancedPrompt =
		(state.normalizedPrompt || state.prompt).trim() || 'Create an image that matches the user request.';
	const visualPriorities = 'Preserve the requested subject, mood, and key details.';
	const responseGuidance = 'Provide the enhanced prompt as the main deliverable.';

	return {
		imagePrompt: enhancedPrompt,
		imageFindings: [
			`Requested image: ${requestedImage}`,
			`Enhanced prompt: ${enhancedPrompt}`,
			`Visual priorities: ${visualPriorities}`,
			`Response guidance: ${responseGuidance}`,
		].join('\n'),
	};
}

function parseImagePrompt(raw: string, state: typeof AssistantState.State) {
	const fallback = buildFallback(state);
	const requestedImage =
		readLabeledValue(raw, 'Requested image') ||
		readLabeledValue(fallback.imageFindings, 'Requested image') ||
		'';
	const enhancedPrompt = readLabeledValue(raw, 'Enhanced prompt') || fallback.imagePrompt;
	const visualPriorities =
		readLabeledValue(raw, 'Visual priorities') ||
		readLabeledValue(fallback.imageFindings, 'Visual priorities') ||
		'';
	const responseGuidance =
		readLabeledValue(raw, 'Response guidance') ||
		readLabeledValue(fallback.imageFindings, 'Response guidance') ||
		'';

	return {
		imagePrompt: enhancedPrompt,
		imageFindings: [
			`Requested image: ${requestedImage}`,
			`Enhanced prompt: ${enhancedPrompt}`,
			`Visual priorities: ${visualPriorities}`,
			`Response guidance: ${responseGuidance}`,
		].join('\n'),
	};
}

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
		'Intent findings:',
		'<intent_findings>',
		intentFindings,
		'</intent_findings>',
	].join('\n');
}

export async function imagePromptEnhancerNode(
	state: typeof AssistantState.State,
	model: BaseChatModel,
	logger?: LoggerService
): Promise<Partial<typeof AssistantState.State>> {
	if (!state.needsImageGeneration) {
		logger?.debug(
			'ImagePromptEnhancerNode',
			'Skipping image prompt enhancement because no image was requested'
		);
		return {
			imagePrompt: '',
			imageFindings: NO_IMAGE_PROMPT_FINDINGS,
		};
	}

	const prompt = state.prompt.trim();
	const normalizedPrompt = (state.normalizedPrompt || state.prompt).trim();

	logger?.debug('ImagePromptEnhancerNode', 'Starting image prompt enhancement', {
		promptLength: prompt.length,
		normalizedPromptLength: normalizedPrompt.length,
	});

	const messages = [
		new SystemMessage(SYSTEM_PROMPT),
		...toLangChainHistoryMessages(state.history),
		new HumanMessage(buildHumanMessage(state.prompt, normalizedPrompt, state.intentFindings)),
	];
	const response = await model.invoke(messages);
	const rawFindings = extractTokenFromChunk(response.content).trim();
	const parsed = parseImagePrompt(rawFindings, state);

	logger?.info('ImagePromptEnhancerNode', 'Image prompt enhancement completed', {
		imagePromptLength: parsed.imagePrompt.length,
		findingsLength: parsed.imageFindings.length,
	});

	return {
		imagePrompt: parsed.imagePrompt,
		imageFindings: parsed.imageFindings,
		phaseLabel: ASSISTANT_STATE_MESSAGES.IMAGE_GENERATOR,
	};
}
