import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage } from '@langchain/core/messages';
import type { LoggerService } from '../../../../services/logger';
import { toLangChainHistoryMessages } from '../../../core/history';
import { ASSISTANT_STATE_MESSAGES } from '../../messages';
import {
	createAssistantSpecialistAgent,
	invokeAssistantSpecialist,
	type AssistantSpecialistAgent,
} from '../../specialist-agent';
import { parseYesNo, readLabeledValue } from '../../agent-output';
import type { AssistantState } from '../../state';

const SYSTEM_PROMPT = `You are the Intent Analyzer in a multi-node assistant.

You receive the user's latest request and conversation history.

Classify the request into one of these intents:

- question: a direct question that can be answered without launching parallel research agents
- generation: the user wants drafted, rewritten, structured, or otherwise generated content
- research: the user wants investigation, supporting evidence, comparison, or up-to-date information

Return exactly six lines in this format:

Normalized request: ...
Intent: question|generation|research
Launch research agents: yes|no
RAG query: ...
Web search query: ...
Reasoning: ...

Rules:

- If the intent is generation or research, set \`Launch research agents\` to \`yes\`.
- If \`Launch research agents\` is \`no\`, use \`Skip\` for both queries.
- Preserve exact file paths, symbol names, and domain-specific terms in the RAG query.
- Keep the web query focused on what should be looked up externally.
- If the request asks for an image or visual asset, classify it as generation.`;

type AssistantIntentCategory = 'question' | 'generation' | 'research';

interface IntentDetectorResult {
	readonly normalizedPrompt: string;
	readonly intentCategory: AssistantIntentCategory;
	readonly intentFindings: string;
	readonly needsParallelResearch: boolean;
	readonly needsRetrieval: boolean;
	readonly needsWebSearch: boolean;
	readonly ragQuery: string;
	readonly webSearchQuery: string;
}

const SKIP_QUERY = 'Skip';
const IMAGE_REQUEST_PATTERN =
	/\b(image|illustration|picture|photo|render|visual|show me|generate an image|draw|sketch)\b/i;
const WEB_SEARCH_PATTERN =
	/\b(latest|current|recent|today|news|weather|price|stock|market|up to date|up-to-date|search the web|browse the web|internet|online)\b/i;
const GENERATION_PATTERN =
	/\b(write|draft|compose|generate|create|rewrite|rephrase|summarize|outline|brainstorm|plan|improve|refactor)\b/i;
const RESEARCH_PATTERN =
	/\b(research|investigate|compare|analyze|analysis|find|look up|verify|evidence|sources|facts)\b/i;

function normalizeQuery(value: string | undefined): string {
	if (!value || /^skip\b/i.test(value)) {
		return '';
	}

	return value.trim();
}

function buildIntentFindings(
	normalizedPrompt: string,
	intentCategory: AssistantIntentCategory,
	needsParallelResearch: boolean,
	ragQuery: string,
	webSearchQuery: string,
	reasoning: string
): string {
	return [
		`Normalized request: ${normalizedPrompt}`,
		`Intent: ${intentCategory}`,
		`Launch research agents: ${needsParallelResearch ? 'yes' : 'no'}`,
		`RAG query: ${ragQuery || SKIP_QUERY}`,
		`Web search query: ${webSearchQuery || SKIP_QUERY}`,
		`Routing notes: ${reasoning}`,
	].join('\n');
}

function inferIntentCategory(prompt: string): AssistantIntentCategory {
	if (IMAGE_REQUEST_PATTERN.test(prompt) || GENERATION_PATTERN.test(prompt)) {
		return 'generation';
	}

	if (WEB_SEARCH_PATTERN.test(prompt) || RESEARCH_PATTERN.test(prompt)) {
		return 'research';
	}

	return 'question';
}

function buildFallback(prompt: string): IntentDetectorResult {
	const normalizedPrompt = prompt.trim() || 'No request provided.';
	const intentCategory = inferIntentCategory(normalizedPrompt);
	const needsParallelResearch = intentCategory !== 'question';
	const ragQuery = needsParallelResearch ? normalizedPrompt : '';
	const webSearchQuery = needsParallelResearch ? normalizedPrompt : '';

	return {
		normalizedPrompt,
		intentCategory,
		intentFindings: buildIntentFindings(
			normalizedPrompt,
			intentCategory,
			needsParallelResearch,
			ragQuery,
			webSearchQuery,
			'Used fallback heuristics because structured classification output was unavailable.'
		),
		needsParallelResearch,
		needsRetrieval: needsParallelResearch,
		needsWebSearch: needsParallelResearch,
		ragQuery,
		webSearchQuery,
	};
}

function parseIntentCategory(value: string | undefined, fallback: AssistantIntentCategory) {
	if (!value) {
		return fallback;
	}

	const normalized = value.trim().toLowerCase();
	if (normalized === 'question' || normalized === 'generation' || normalized === 'research') {
		return normalized;
	}

	return fallback;
}

function parseClassification(raw: string, prompt: string): IntentDetectorResult {
	const fallback = buildFallback(prompt);
	const normalizedPrompt = readLabeledValue(raw, 'Normalized request') || fallback.normalizedPrompt;
	const intentCategory = parseIntentCategory(readLabeledValue(raw, 'Intent'), fallback.intentCategory);
	const needsParallelResearch = parseYesNo(
		readLabeledValue(raw, 'Launch research agents'),
		intentCategory !== 'question'
	);
	const ragQuery = needsParallelResearch
		? normalizeQuery(
				readLabeledValue(raw, 'RAG query') || fallback.ragQuery || normalizedPrompt
			)
		: '';
	const webSearchQuery = needsParallelResearch
		? normalizeQuery(
				readLabeledValue(raw, 'Web search query') || fallback.webSearchQuery || normalizedPrompt
			)
		: '';
	const reasoning =
		readLabeledValue(raw, 'Reasoning') ||
		'Structured classification succeeded without additional routing notes.';

	return {
		normalizedPrompt,
		intentCategory,
		intentFindings: buildIntentFindings(
			normalizedPrompt,
			intentCategory,
			needsParallelResearch,
			ragQuery,
			webSearchQuery,
			reasoning
		),
		needsParallelResearch,
		needsRetrieval: needsParallelResearch,
		needsWebSearch: needsParallelResearch,
		ragQuery,
		webSearchQuery,
	};
}

function buildHumanMessage(prompt: string): string {
	return ['Latest user request:', prompt].join('\n');
}

export function createIntentDetectorAgent(model: BaseChatModel): AssistantSpecialistAgent {
	return createAssistantSpecialistAgent(model, SYSTEM_PROMPT);
}

export async function intentDetectorAgent(
	state: typeof AssistantState.State,
	agent: AssistantSpecialistAgent,
	logger?: LoggerService
): Promise<Partial<typeof AssistantState.State>> {
	const prompt = state.prompt.trim();

	if (prompt.length === 0) {
		const fallback = buildFallback(prompt);
		logger?.debug('IntentAnalyzerAgent', 'Skipping classification for empty prompt');
		return {
			normalizedPrompt: fallback.normalizedPrompt,
			intentCategory: fallback.intentCategory,
			intentFindings: fallback.intentFindings,
			needsParallelResearch: fallback.needsParallelResearch,
			needsRetrieval: fallback.needsRetrieval,
			needsWebSearch: fallback.needsWebSearch,
			ragQuery: fallback.ragQuery,
			webSearchQuery: fallback.webSearchQuery,
			phaseLabel: fallback.needsParallelResearch
				? ASSISTANT_STATE_MESSAGES.PARALLEL_RESEARCH
				: ASSISTANT_STATE_MESSAGES.RESPONSE_PREPARER,
		};
	}

	logger?.debug('IntentAnalyzerAgent', 'Starting intent analysis', {
		promptLength: prompt.length,
	});

	const messages = [
		...toLangChainHistoryMessages(state.history),
		new HumanMessage(buildHumanMessage(prompt)),
	];
	const rawClassification = await invokeAssistantSpecialist(agent, messages);
	const parsed = parseClassification(rawClassification, prompt);

	logger?.info('IntentAnalyzerAgent', 'Intent analysis completed', {
		intentCategory: parsed.intentCategory,
		needsParallelResearch: parsed.needsParallelResearch,
		ragQueryLength: parsed.ragQuery.length,
		webSearchQueryLength: parsed.webSearchQuery.length,
	});

	return {
		normalizedPrompt: parsed.normalizedPrompt,
		intentCategory: parsed.intentCategory,
		intentFindings: parsed.intentFindings,
		needsParallelResearch: parsed.needsParallelResearch,
		needsRetrieval: parsed.needsRetrieval,
		needsWebSearch: parsed.needsWebSearch,
		ragQuery: parsed.ragQuery,
		webSearchQuery: parsed.webSearchQuery,
		phaseLabel: parsed.needsParallelResearch
			? ASSISTANT_STATE_MESSAGES.PARALLEL_RESEARCH
			: ASSISTANT_STATE_MESSAGES.RESPONSE_PREPARER,
	};
}
