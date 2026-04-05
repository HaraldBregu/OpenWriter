import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { LoggerService } from '../../../../services/logger';
import { ASSISTANT_STATE_MESSAGES } from '../../messages';
import type { AssistantSpecialistAgent } from '../../specialist-agent';
import type { AssistantState } from '../../state';
import { createRagChain, NO_CONTEXT_FINDING, runRagChain } from './chain';
import type { RagRetriever } from './retriever';

const RETRIEVAL_UNAVAILABLE_FINDING =
	'Workspace retrieval is unavailable because no workspace knowledge base is available.';

export { createRagChain, NO_CONTEXT_FINDING, runRagChain, type RunRagChainInput } from './chain';
export { RagRetriever, type RagRetrieverOptions, type RetrievedDocument } from './retriever';

type RetrieveDocumentsAgent = ReturnType<typeof createRagChain>;

export function createRetrieveDocumentsAgent(model: BaseChatModel): RetrieveDocumentsAgent {
	return createRagChain(model);
}

export async function retrieveDocumentsAgent(
	state: typeof AssistantState.State,
	agent: AssistantSpecialistAgent,
	retriever: RagRetriever | undefined,
	logger?: LoggerService
): Promise<Partial<typeof AssistantState.State>> {
	const query = (state.retrievalQuery || state.normalizedPrompt || state.prompt).trim();

	if (query.length === 0) {
		logger?.debug('RetrieveDocumentsAgent', 'Skipping retrieval because the query is empty');
		return {
			retrievedContext: NO_CONTEXT_FINDING,
			retrievalStatus: 'empty',
			phaseLabel: ASSISTANT_STATE_MESSAGES.GRADE_DOCUMENTS,
		};
	}

	if (retriever === undefined) {
		logger?.debug('RetrieveDocumentsAgent', 'Skipping retrieval because no retriever is available');
		return {
			retrievedContext: RETRIEVAL_UNAVAILABLE_FINDING,
			retrievalStatus: 'unavailable',
			phaseLabel: ASSISTANT_STATE_MESSAGES.GRADE_DOCUMENTS,
		};
	}

	logger?.debug('RetrieveDocumentsAgent', 'Starting document retrieval', {
		queryLength: query.length,
		retryCount: state.retryCount,
	});

	const retrievedContext = await runRagChain(agent, retriever, {
		prompt: state.prompt,
		normalizedPrompt: state.normalizedPrompt || state.prompt,
		researchGuidance: state.routingFindings,
		intentFindings: state.routingFindings,
		query,
		history: state.history,
	});

	const retrievalStatus = retrievedContext === NO_CONTEXT_FINDING ? 'empty' : 'found';

	logger?.info('RetrieveDocumentsAgent', 'Document retrieval completed', {
		retrievalStatus,
		retrievedContextLength: retrievedContext.length,
	});

	return {
		retrievedContext,
		retrievalStatus,
		phaseLabel: ASSISTANT_STATE_MESSAGES.GRADE_DOCUMENTS,
	};
}
