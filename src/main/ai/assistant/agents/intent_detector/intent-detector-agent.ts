import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import type { LoggerService } from '../../../../services/logger';
import { extractTokenFromChunk } from '../../../../shared/ai-utils';
import { toLangChainHistoryMessages } from '../../../core/history';
import { ASSISTANT_STATE_MESSAGES } from '../../messages';
import { parseYesNo, readLabeledValue } from '../../agent-output';
import type { AssistantState } from '../../state';
import SYSTEM_PROMPT from './INTENT_DETECTOR_SYSTEM.md?raw';

interface IntentDetectorResult {
	readonly normalizedPrompt: string;
	readonly route: 'text' | 'image';
	readonly intentFindings: string;
	readonly needsRetrieval: boolean;
	readonly needsWebSearch: boolean;
	readonly needsImageGeneration: boolean;
}

const IMAGE_REQUEST_PATTERN =
	/\b(image|illustration|picture|photo|render|visual|show me|generate an image|draw|sketch)\b/i;
const RETRIEVAL_PATTERN =
	/\b(workspace|codebase|repo|repository|project|document|docs|notes|context|from the files|from the repo|from the project|based on the workspace)\b/i;
const WEB_SEARCH_PATTERN =
	/\b(latest|current|recent|today|news|weather|price|stock|market|up to date|up-to-date|search the web|browse the web|internet|online)\b/i;

function buildIntentFindings(
	normalizedPrompt: string,
	route: 'text' | 'image',
	needsRetrieval: boolean,
	needsWebSearch: boolean,
	reasoning: string
): string {
	return [
		`Normalized request: ${normalizedPrompt}`,
		`Primary route: ${route.toUpperCase()}`,
		`Workspace retrieval: ${needsRetrieval ? 'yes' : 'no'}`,
		`Web search: ${needsWebSearch ? 'yes' : 'no'}`,
		`Image branch: ${route === 'image' ? 'yes' : 'no'}`,
		`Routing notes: ${reasoning}`,
	].join('\n');
}

function buildFallback(prompt: string): IntentDetectorResult {
	const normalizedPrompt = prompt.trim() || 'No request provided.';
	const route = IMAGE_REQUEST_PATTERN.test(normalizedPrompt) ? 'image' : 'text';
	const needsRetrieval = route === 'text' && RETRIEVAL_PATTERN.test(normalizedPrompt);
	const needsWebSearch = route === 'text' && WEB_SEARCH_PATTERN.test(normalizedPrompt);

	return {
		normalizedPrompt,
		route,
		intentFindings: buildIntentFindings(
			normalizedPrompt,
			route,
			needsRetrieval,
			needsWebSearch,
			'Used fallback heuristics because structured classification output was unavailable.'
		),
		needsRetrieval,
		needsWebSearch,
		needsImageGeneration: route === 'image',
	};
}

function parseClassification(raw: string, prompt: string): IntentDetectorResult {
	const fallback = buildFallback(prompt);
	const normalizedPrompt =
		readLabeledValue(raw, 'Normalized request') || fallback.normalizedPrompt;
	const routeLabel = readLabeledValue(raw, 'Primary route');
	const route =
		routeLabel !== undefined && /^image\b/i.test(routeLabel) ? 'image' : fallback.route;
	const needsRetrieval = parseYesNo(
		readLabeledValue(raw, 'RAG required'),
		route === 'text' ? fallback.needsRetrieval : false
	);
	const needsWebSearch = parseYesNo(
		readLabeledValue(raw, 'Web search required'),
		route === 'text' ? fallback.needsWebSearch : false
	);
	const reasoning =
		readLabeledValue(raw, 'Reasoning') ||
		'Structured classification succeeded without additional routing notes.';

	return {
		normalizedPrompt,
		route,
		intentFindings: buildIntentFindings(
			normalizedPrompt,
			route,
			needsRetrieval,
			needsWebSearch,
			reasoning
		),
		needsRetrieval,
		needsWebSearch,
		needsImageGeneration: route === 'image',
	};
}

function buildHumanMessage(prompt: string): string {
	return ['Latest user request:', prompt].join('\n');
}

export async function intentDetectorAgent(
	state: typeof AssistantState.State,
	model: BaseChatModel,
	logger?: LoggerService
): Promise<Partial<typeof AssistantState.State>> {
	const prompt = state.prompt.trim();

	if (prompt.length === 0) {
		const fallback = buildFallback(prompt);
		logger?.debug('IntentDetectorAgent', 'Skipping classification for empty prompt');
		return {
			normalizedPrompt: fallback.normalizedPrompt,
			route: fallback.route,
			intentFindings: fallback.intentFindings,
			needsRetrieval: fallback.needsRetrieval,
			needsWebSearch: fallback.needsWebSearch,
			needsImageGeneration: fallback.needsImageGeneration,
			phaseLabel:
				fallback.route === 'image'
					? ASSISTANT_STATE_MESSAGES.IMAGE_PROMPT_ENHANCER
					: ASSISTANT_STATE_MESSAGES.PLANNER,
		};
	}

	logger?.debug('IntentDetectorAgent', 'Starting intent detection', {
		promptLength: prompt.length,
	});

	const messages = [
		new SystemMessage(SYSTEM_PROMPT),
		...toLangChainHistoryMessages(state.history),
		new HumanMessage(buildHumanMessage(prompt)),
	];
	const response = await model.invoke(messages);
	const rawClassification = extractTokenFromChunk(response.content).trim();
	const parsed = parseClassification(rawClassification, prompt);

	logger?.info('IntentDetectorAgent', 'Intent detection completed', {
		route: parsed.route,
		needsRetrieval: parsed.needsRetrieval,
		needsWebSearch: parsed.needsWebSearch,
		needsImageGeneration: parsed.needsImageGeneration,
		normalizedPromptLength: parsed.normalizedPrompt.length,
	});

	return {
		normalizedPrompt: parsed.normalizedPrompt,
		route: parsed.route,
		intentFindings: parsed.intentFindings,
		needsRetrieval: parsed.needsRetrieval,
		needsWebSearch: parsed.needsWebSearch,
		needsImageGeneration: parsed.needsImageGeneration,
		phaseLabel:
			parsed.route === 'image'
				? ASSISTANT_STATE_MESSAGES.IMAGE_PROMPT_ENHANCER
				: ASSISTANT_STATE_MESSAGES.PLANNER,
	};
}
