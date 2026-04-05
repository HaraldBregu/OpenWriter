import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage } from '@langchain/core/messages';
import type { LoggerService } from '../../../../services/logger';
import { ASSISTANT_STATE_MESSAGES } from '../../messages';
import {
	createAssistantSpecialistAgent,
	invokeAssistantSpecialist,
	type AssistantSpecialistAgent,
} from '../../specialist-agent';
import { readLabeledValue } from '../../agent-output';
import type { AssistantState } from '../../state';

const SYSTEM_PROMPT = `You are the grade_documents node in a retrieval-assisted assistant.

You receive the user's question, the current retrieval query, and the retrieved
workspace context.

Decide whether the retrieved context is relevant enough to answer the question.

Return exactly two lines in this format:

Decision: relevant|not_relevant
Reasoning: ...

Rules:

- Choose \`relevant\` only when the retrieved context materially helps answer the question.
- Choose \`not_relevant\` when the context is empty, tangential, ambiguous, or insufficient.
- Do not answer the user's question.
- Keep the reasoning concise and concrete.`;

interface GradeDocumentsResult {
	readonly documentsRelevant: boolean;
	readonly gradeFindings: string;
}

function buildFallback(state: typeof AssistantState.State): GradeDocumentsResult {
	const documentsRelevant = state.retrievalStatus === 'found' && state.retrievedContext.trim().length > 0;
	const gradeFindings = documentsRelevant
		? 'Fallback grading marked the retrieved context as relevant.'
		: `Fallback grading marked the retrieval as not relevant because status was ${state.retrievalStatus}.`;

	return { documentsRelevant, gradeFindings };
}

function parseDecision(value: string | undefined, fallback: boolean): boolean {
	if (!value) {
		return fallback;
	}

	return /^relevant\b/i.test(value);
}

function parseGradeOutput(raw: string, state: typeof AssistantState.State): GradeDocumentsResult {
	const fallback = buildFallback(state);
	return {
		documentsRelevant: parseDecision(readLabeledValue(raw, 'Decision'), fallback.documentsRelevant),
		gradeFindings:
			readLabeledValue(raw, 'Reasoning') ||
			fallback.gradeFindings,
	};
}

function buildHumanMessage(state: typeof AssistantState.State): string {
	return [
		'User question:',
		state.prompt,
		'',
		'Normalized question:',
		state.normalizedPrompt || state.prompt,
		'',
		'Current retrieval query:',
		state.retrievalQuery || 'None',
		'',
		'Retrieved workspace context:',
		'<retrieved_context>',
		state.retrievedContext || 'No retrieved context was produced.',
		'</retrieved_context>',
	].join('\n');
}

export function createGradeDocumentsAgent(model: BaseChatModel): AssistantSpecialistAgent {
	return createAssistantSpecialistAgent(model, SYSTEM_PROMPT);
}

export async function gradeDocumentsAgent(
	state: typeof AssistantState.State,
	agent: AssistantSpecialistAgent,
	logger?: LoggerService
): Promise<Partial<typeof AssistantState.State>> {
	if (state.retrievalStatus !== 'found') {
		const fallback = buildFallback(state);
		logger?.debug('GradeDocumentsAgent', 'Skipping LLM grading because retrieval did not produce findings', {
			retrievalStatus: state.retrievalStatus,
		});
		return {
			documentsRelevant: fallback.documentsRelevant,
			gradeFindings: fallback.gradeFindings,
			phaseLabel: fallback.documentsRelevant
				? ASSISTANT_STATE_MESSAGES.GENERATE_ANSWER
				: ASSISTANT_STATE_MESSAGES.REWRITE_QUERY,
		};
	}

	logger?.debug('GradeDocumentsAgent', 'Starting document grading', {
		retrievedContextLength: state.retrievedContext.length,
	});

	const rawGrade = await invokeAssistantSpecialist(agent, [new HumanMessage(buildHumanMessage(state))]);
	const parsed = parseGradeOutput(rawGrade, state);

	logger?.info('GradeDocumentsAgent', 'Document grading completed', {
		documentsRelevant: parsed.documentsRelevant,
	});

	return {
		documentsRelevant: parsed.documentsRelevant,
		gradeFindings: parsed.gradeFindings,
		phaseLabel: parsed.documentsRelevant
			? ASSISTANT_STATE_MESSAGES.GENERATE_ANSWER
			: ASSISTANT_STATE_MESSAGES.REWRITE_QUERY,
	};
}
