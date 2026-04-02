import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import type { LoggerService } from '../../../../services/logger';
import { extractTokenFromChunk } from '../../../../shared/ai-utils';
import { toLangChainHistoryMessages } from '../../../core/history';
import { ASSISTANT_STATE_MESSAGES } from '../../messages';
import type { AssistantState } from '../../state';
import SYSTEM_PROMPT from './INTENT_CLASSIFICATION_SYSTEM.md?raw';

interface IntentClassificationResult {
	readonly normalizedPrompt: string;
	readonly intentFindings: string;
	readonly needsRetrieval: boolean;
	readonly needsImageGeneration: boolean;
}

const IMAGE_REQUEST_PATTERN =
	/\b(image|illustration|picture|photo|render|visual|show me|generate an image|draw|sketch)\b/i;
const RETRIEVAL_PATTERN =
	/\b(workspace|codebase|repo|repository|project|document|docs|notes|context|from the files|from the repo|from the project|based on the workspace)\b/i;

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function readLabel(raw: string, label: string): string | undefined {
	const match = raw.match(new RegExp(`^${escapeRegExp(label)}\\s*:\\s*(.+)$`, 'im'));
	return match?.[1]?.trim();
}

function parseYesNo(value: string | undefined, fallback: boolean): boolean {
	if (!value) return fallback;
	if (/^(yes|true)\b/i.test(value)) return true;
	if (/^(no|false)\b/i.test(value)) return false;
	return fallback;
}

function buildIntentFindings(
	normalizedPrompt: string,
	needsTextResponse: boolean,
	needsRetrieval: boolean,
	needsImageGeneration: boolean,
	reasoning: string
): string {
	const detectedIntents = [
		needsTextResponse ? 'TEXT' : null,
		needsRetrieval ? 'RAG' : null,
		needsImageGeneration ? 'IMAGE' : null,
	]
		.filter((value): value is string => value !== null)
		.join(', ');

	return [
		`Normalized request: ${normalizedPrompt}`,
		`Detected intents: ${detectedIntents || 'TEXT'}`,
		`Routing notes: ${reasoning}`,
	].join('\n');
}

function buildFallback(prompt: string): IntentClassificationResult {
	const normalizedPrompt = prompt.trim() || 'No request provided.';
	const needsImageGeneration = IMAGE_REQUEST_PATTERN.test(normalizedPrompt);
	const needsRetrieval = RETRIEVAL_PATTERN.test(normalizedPrompt);

	return {
		normalizedPrompt,
		intentFindings: buildIntentFindings(
			normalizedPrompt,
			true,
			needsRetrieval,
			needsImageGeneration,
			'Used fallback heuristics because structured classification output was unavailable.'
		),
		needsRetrieval,
		needsImageGeneration,
	};
}

function parseClassification(raw: string, prompt: string): IntentClassificationResult {
	const fallback = buildFallback(prompt);
	const normalizedPrompt = readLabel(raw, 'Normalized request') || fallback.normalizedPrompt;
	const needsTextResponse = parseYesNo(readLabel(raw, 'Text response required'), true);
	const needsRetrieval = parseYesNo(readLabel(raw, 'RAG required'), fallback.needsRetrieval);
	const needsImageGeneration = parseYesNo(
		readLabel(raw, 'Image required'),
		fallback.needsImageGeneration
	);
	const reasoning =
		readLabel(raw, 'Reasoning') ||
		'Structured classification succeeded without additional routing notes.';

	return {
		normalizedPrompt,
		intentFindings: buildIntentFindings(
			normalizedPrompt,
			needsTextResponse,
			needsRetrieval,
			needsImageGeneration,
			reasoning
		),
		needsRetrieval,
		needsImageGeneration,
	};
}

function buildHumanMessage(prompt: string): string {
	return ['Latest user request:', prompt].join('\n');
}

export async function intentClassificationNode(
	state: typeof AssistantState.State,
	model: BaseChatModel,
	logger?: LoggerService
): Promise<Partial<typeof AssistantState.State>> {
	const prompt = state.prompt.trim();

	if (prompt.length === 0) {
		const fallback = buildFallback(prompt);
		logger?.debug('IntentClassificationNode', 'Skipping classification for empty prompt');
		return {
			normalizedPrompt: fallback.normalizedPrompt,
			intentFindings: fallback.intentFindings,
			needsRetrieval: fallback.needsRetrieval,
			needsImageGeneration: fallback.needsImageGeneration,
			phaseLabel: ASSISTANT_STATE_MESSAGES.PARALLEL_WORKERS,
		};
	}

	logger?.debug('IntentClassificationNode', 'Starting intent classification', {
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

	logger?.info('IntentClassificationNode', 'Intent classification completed', {
		needsRetrieval: parsed.needsRetrieval,
		needsImageGeneration: parsed.needsImageGeneration,
		normalizedPromptLength: parsed.normalizedPrompt.length,
	});

	return {
		normalizedPrompt: parsed.normalizedPrompt,
		intentFindings: parsed.intentFindings,
		needsRetrieval: parsed.needsRetrieval,
		needsImageGeneration: parsed.needsImageGeneration,
		phaseLabel: ASSISTANT_STATE_MESSAGES.PARALLEL_WORKERS,
	};
}
