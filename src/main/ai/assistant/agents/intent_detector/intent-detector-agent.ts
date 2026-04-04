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

const SYSTEM_PROMPT = `You are the intent detector in a multi-agent assistant.

You receive the user's latest request and conversation history.

Decide whether the request needs:

- workspace or knowledge-base retrieval (\`RAG\`)
- live external search (\`Web search\`)

Interpret "RAG" as workspace or indexed knowledge-base retrieval only.
Interpret "Web search" as looking up current external information.

Return exactly five lines in this format:

Normalized request: ...
Visual request: yes|no
RAG required: yes|no
Web search required: yes|no
Reasoning: ...`;

interface IntentDetectorResult {
	readonly normalizedPrompt: string;
	readonly intentFindings: string;
	readonly needsRetrieval: boolean;
	readonly needsWebSearch: boolean;
}

const IMAGE_REQUEST_PATTERN =
	/\b(image|illustration|picture|photo|render|visual|show me|generate an image|draw|sketch)\b/i;
const RETRIEVAL_PATTERN =
	/\b(workspace|codebase|repo|repository|project|document|docs|notes|context|from the files|from the repo|from the project|based on the workspace)\b/i;
const WEB_SEARCH_PATTERN =
	/\b(latest|current|recent|today|news|weather|price|stock|market|up to date|up-to-date|search the web|browse the web|internet|online)\b/i;

function buildIntentFindings(
	normalizedPrompt: string,
	visualRequested: boolean,
	needsRetrieval: boolean,
	needsWebSearch: boolean,
	reasoning: string
): string {
	return [
		`Normalized request: ${normalizedPrompt}`,
		`Visual request: ${visualRequested ? 'yes' : 'no'}`,
		`Workspace retrieval: ${needsRetrieval ? 'yes' : 'no'}`,
		`Web search: ${needsWebSearch ? 'yes' : 'no'}`,
		`Routing notes: ${reasoning}`,
	].join('\n');
}

function buildFallback(prompt: string): IntentDetectorResult {
	const normalizedPrompt = prompt.trim() || 'No request provided.';
	const visualRequested = IMAGE_REQUEST_PATTERN.test(normalizedPrompt);
	const needsRetrieval = RETRIEVAL_PATTERN.test(normalizedPrompt);
	const needsWebSearch = WEB_SEARCH_PATTERN.test(normalizedPrompt);

	return {
		normalizedPrompt,
		intentFindings: buildIntentFindings(
			normalizedPrompt,
			visualRequested,
			needsRetrieval,
			needsWebSearch,
			'Used fallback heuristics because structured classification output was unavailable.'
		),
		needsRetrieval,
		needsWebSearch,
	};
}

function parseClassification(raw: string, prompt: string): IntentDetectorResult {
	const fallback = buildFallback(prompt);
	const normalizedPrompt = readLabeledValue(raw, 'Normalized request') || fallback.normalizedPrompt;
	const visualRequested = parseYesNo(
		readLabeledValue(raw, 'Visual request'),
		IMAGE_REQUEST_PATTERN.test(normalizedPrompt)
	);
	const needsRetrieval = parseYesNo(readLabeledValue(raw, 'RAG required'), fallback.needsRetrieval);
	const needsWebSearch = parseYesNo(
		readLabeledValue(raw, 'Web search required'),
		fallback.needsWebSearch
	);
	const reasoning =
		readLabeledValue(raw, 'Reasoning') ||
		'Structured classification succeeded without additional routing notes.';

	return {
		normalizedPrompt,
		intentFindings: buildIntentFindings(
			normalizedPrompt,
			visualRequested,
			needsRetrieval,
			needsWebSearch,
			reasoning
		),
		needsRetrieval,
		needsWebSearch,
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
		logger?.debug('IntentDetectorAgent', 'Skipping classification for empty prompt');
		return {
			normalizedPrompt: fallback.normalizedPrompt,
			intentFindings: fallback.intentFindings,
			needsRetrieval: fallback.needsRetrieval,
			needsWebSearch: fallback.needsWebSearch,
			phaseLabel: ASSISTANT_STATE_MESSAGES.PLANNER,
		};
	}

	logger?.debug('IntentDetectorAgent', 'Starting intent detection', {
		promptLength: prompt.length,
	});

	const messages = [
		...toLangChainHistoryMessages(state.history),
		new HumanMessage(buildHumanMessage(prompt)),
	];
	const rawClassification = await invokeAssistantSpecialist(agent, messages);
	const parsed = parseClassification(rawClassification, prompt);

	logger?.info('IntentDetectorAgent', 'Intent detection completed', {
		needsRetrieval: parsed.needsRetrieval,
		needsWebSearch: parsed.needsWebSearch,
		normalizedPromptLength: parsed.normalizedPrompt.length,
	});

	return {
		normalizedPrompt: parsed.normalizedPrompt,
		intentFindings: parsed.intentFindings,
		needsRetrieval: parsed.needsRetrieval,
		needsWebSearch: parsed.needsWebSearch,
		phaseLabel: ASSISTANT_STATE_MESSAGES.PLANNER,
	};
}
