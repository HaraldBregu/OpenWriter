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

const SYSTEM_PROMPT = `You are the rewrite_query node in a retrieval loop.

You receive the user's question, the current retrieval query, grading feedback,
and the retrieved workspace context.

Return exactly two lines in this format:

Rewritten query: ...
Reasoning: ...

Rules:

- Rewrite the query so it is more likely to match relevant workspace documents.
- Preserve exact file paths, symbol names, and product terms when they matter.
- Keep the rewritten query short, specific, and workspace-focused.
- Do not answer the question.
- Do not return \`Skip\`.`;

function normalizeQuery(value: string | undefined): string {
	if (!value || /^skip\b/i.test(value)) {
		return '';
	}

	return value.trim();
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
		state.retrievalQuery || state.normalizedPrompt || state.prompt,
		'',
		'Grading feedback:',
		state.gradeFindings || 'No grading feedback was provided.',
		'',
		'Retrieved workspace context:',
		'<retrieved_context>',
		state.retrievedContext || 'No retrieved context was produced.',
		'</retrieved_context>',
	].join('\n');
}

export function createRewriteQueryAgent(model: BaseChatModel): AssistantSpecialistAgent {
	return createAssistantSpecialistAgent(model, SYSTEM_PROMPT);
}

export async function rewriteQueryAgent(
	state: typeof AssistantState.State,
	agent: AssistantSpecialistAgent,
	logger?: LoggerService
): Promise<Partial<typeof AssistantState.State>> {
	if (state.retrievalStatus === 'unavailable') {
		logger?.debug('RewriteQueryAgent', 'Skipping query rewrite because retrieval is unavailable');
		return {
			retryCount: state.maxRetries,
			phaseLabel: ASSISTANT_STATE_MESSAGES.RETURN_FALLBACK_RESPONSE,
		};
	}

	const nextRetryCount = state.retryCount + 1;
	const fallbackQuery = state.retrievalQuery || state.normalizedPrompt || state.prompt;

	logger?.debug('RewriteQueryAgent', 'Rewriting retrieval query', {
		currentRetryCount: state.retryCount,
		nextRetryCount,
	});

	const rawRewrite = await invokeAssistantSpecialist(agent, [
		new HumanMessage(buildHumanMessage(state)),
	]);
	const rewrittenQuery =
		normalizeQuery(readLabeledValue(rawRewrite, 'Rewritten query')) || fallbackQuery;

	logger?.info('RewriteQueryAgent', 'Retrieval query rewritten', {
		retryCount: nextRetryCount,
		rewrittenQueryLength: rewrittenQuery.length,
	});

	return {
		retrievalQuery: rewrittenQuery,
		retryCount: nextRetryCount,
		phaseLabel:
			nextRetryCount < state.maxRetries
				? ASSISTANT_STATE_MESSAGES.RETRIEVE_DOCUMENTS
				: ASSISTANT_STATE_MESSAGES.RETURN_FALLBACK_RESPONSE,
	};
}
