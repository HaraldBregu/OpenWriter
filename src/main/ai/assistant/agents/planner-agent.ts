import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage } from '@langchain/core/messages';
import type { LoggerService } from '../../../services/logger';
import { toLangChainHistoryMessages } from '../../core/history';
import { ASSISTANT_STATE_MESSAGES } from '../messages';
import { readLabeledValue } from '../agent-output';
import {
	createAssistantSpecialistAgent,
	invokeAssistantSpecialist,
	type AssistantSpecialistAgent,
} from '../specialist-agent';
import type { AssistantState } from '../state';

const SYSTEM_PROMPT = `You are the planner in a multi-agent assistant.

You receive the user's request, a normalized request, and optional analyzer
feedback from a previous pass.

Produce an execution brief for the text branch.

Return exactly five lines in this format:

Plan: ...
Text brief: ...
RAG query: ...
Web search query: ...
Success criteria: ...

Rules:

- Use \`Skip\` for \`RAG query\` when workspace retrieval is unnecessary.
- Use \`Skip\` for \`Web search query\` when external search is unnecessary.
- If the user asked for an image or visual, plan a text-only response that
  explains that this assistant does not generate images and offers the best
  useful substitute available in text.
- If analyzer feedback is present, refine the plan to address its gaps.
- Keep the plan specific enough that downstream agents can act independently.`;

interface PlannerResult {
	readonly plannerFindings: string;
	readonly ragQuery: string;
	readonly webSearchQuery: string;
}

const SKIP_QUERY = 'Skip';
const EMPTY_PLANNER_FINDINGS =
	'Plan: Answer the user request directly.\nText brief: Produce the clearest useful answer possible.\nRAG query: Skip\nWeb search query: Skip\nSuccess criteria: Resolve the user request accurately and concisely.';

function normalizeQuery(value: string | undefined): string {
	if (!value || /^skip\b/i.test(value)) {
		return '';
	}

	return value.trim();
}

function buildFallback(state: typeof AssistantState.State): PlannerResult {
	const normalizedPrompt = (state.normalizedPrompt || state.prompt).trim();
	const ragQuery = state.needsRetrieval ? normalizedPrompt : '';
	const webSearchQuery = state.needsWebSearch ? normalizedPrompt : '';

	return {
		plannerFindings: [
			'Plan: Answer the request directly and fill evidence gaps with specialist agents.',
			`Text brief: Focus on the core request: ${normalizedPrompt || 'No request provided.'}`,
			`RAG query: ${ragQuery || SKIP_QUERY}`,
			`Web search query: ${webSearchQuery || SKIP_QUERY}`,
			'Success criteria: Produce a coherent answer that stays aligned with the user request.',
		].join('\n'),
		ragQuery,
		webSearchQuery,
	};
}

function parsePlanner(raw: string, state: typeof AssistantState.State): PlannerResult {
	const fallback = buildFallback(state);
	const plan =
		readLabeledValue(raw, 'Plan') || readLabeledValue(EMPTY_PLANNER_FINDINGS, 'Plan') || '';
	const textBrief =
		readLabeledValue(raw, 'Text brief') ||
		readLabeledValue(EMPTY_PLANNER_FINDINGS, 'Text brief') ||
		'';
	const ragQuery = normalizeQuery(
		readLabeledValue(raw, 'RAG query') || fallback.ragQuery || SKIP_QUERY
	);
	const webSearchQuery = normalizeQuery(
		readLabeledValue(raw, 'Web search query') || fallback.webSearchQuery || SKIP_QUERY
	);
	const successCriteria =
		readLabeledValue(raw, 'Success criteria') ||
		readLabeledValue(EMPTY_PLANNER_FINDINGS, 'Success criteria') ||
		'';

	return {
		plannerFindings: [
			`Plan: ${plan}`,
			`Text brief: ${textBrief}`,
			`RAG query: ${ragQuery || SKIP_QUERY}`,
			`Web search query: ${webSearchQuery || SKIP_QUERY}`,
			`Success criteria: ${successCriteria}`,
		].join('\n'),
		ragQuery,
		webSearchQuery,
	};
}

function buildHumanMessage(state: typeof AssistantState.State): string {
	return [
		'Original user request:',
		state.prompt,
		'',
		'Normalized request:',
		state.normalizedPrompt,
		'',
		'Intent findings:',
		'<intent_findings>',
		state.intentFindings,
		'</intent_findings>',
		'',
		`Review pass: ${state.reviewCount + 1}`,
		'',
		'Prior analyzer feedback:',
		'<analysis_findings>',
		state.analysisFindings || 'No analyzer feedback yet.',
		'</analysis_findings>',
	].join('\n');
}

export function createPlannerAgent(model: BaseChatModel): AssistantSpecialistAgent {
	return createAssistantSpecialistAgent(model, SYSTEM_PROMPT);
}

export async function plannerAgent(
	state: typeof AssistantState.State,
	agent: AssistantSpecialistAgent,
	logger?: LoggerService
): Promise<Partial<typeof AssistantState.State>> {
	const prompt = state.prompt.trim();

	if (prompt.length === 0) {
		const fallback = buildFallback(state);
		logger?.debug('PlannerAgent', 'Skipping planning for empty prompt');
		return {
			plannerFindings: fallback.plannerFindings,
			ragQuery: fallback.ragQuery,
			webSearchQuery: fallback.webSearchQuery,
			shouldRetry: false,
			phaseLabel: ASSISTANT_STATE_MESSAGES.PARALLEL_SPECIALISTS,
		};
	}

	logger?.debug('PlannerAgent', 'Starting planning stage', {
		promptLength: prompt.length,
		reviewCount: state.reviewCount,
		needsRetrieval: state.needsRetrieval,
		needsWebSearch: state.needsWebSearch,
	});

	const messages = [
		...toLangChainHistoryMessages(state.history),
		new HumanMessage(buildHumanMessage(state)),
	];
	const rawPlan = await invokeAssistantSpecialist(agent, messages);
	const parsed = parsePlanner(rawPlan, state);

	logger?.info('PlannerAgent', 'Planner brief generated', {
		plannerFindingsLength: parsed.plannerFindings.length,
		ragQueryLength: parsed.ragQuery.length,
		webSearchQueryLength: parsed.webSearchQuery.length,
	});

	return {
		plannerFindings: parsed.plannerFindings,
		ragQuery: parsed.ragQuery,
		webSearchQuery: parsed.webSearchQuery,
		shouldRetry: false,
		phaseLabel: ASSISTANT_STATE_MESSAGES.PARALLEL_SPECIALISTS,
	};
}
