import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { LoggerService } from '../../../services/logger';
import {
	createRagChain,
	NO_CONTEXT_FINDING,
	runRagChain,
	type RagRetriever,
} from '../../assistant/nodes/retrieve-documents';
import { WriterState } from '../state';

const RAG_SKIPPED_FINDING = 'Workspace retrieval was not required for this request.';
const RAG_UNAVAILABLE_FINDING =
	'Workspace retrieval was requested, but no workspace knowledge base is available.';

type RagRetrievalSpecialist = ReturnType<typeof createRagChain>;

export function createRagRetrievalAgent(model: BaseChatModel): RagRetrievalSpecialist {
	return createRagChain(model);
}

export async function ragRetrievalAgent(
	state: typeof WriterState.State,
	agent: RagRetrievalSpecialist,
	retriever?: RagRetriever,
	logger?: LoggerService
): Promise<Partial<typeof WriterState.State>> {
	const query = (state.ragQuery || state.normalizedPrompt || state.prompt).trim();

	if (!state.needsRetrieval) {
		logger?.debug('WriterRagRetrievalAgent', 'Skipping workspace retrieval because it was not requested');
		return { ragFindings: RAG_SKIPPED_FINDING };
	}

	if (query.length === 0) {
		logger?.debug('WriterRagRetrievalAgent', 'Skipping workspace retrieval because the query is empty');
		return { ragFindings: NO_CONTEXT_FINDING };
	}

	if (retriever === undefined) {
		logger?.debug(
			'WriterRagRetrievalAgent',
			'Skipping workspace retrieval because no retriever is available'
		);
		return { ragFindings: RAG_UNAVAILABLE_FINDING };
	}

	logger?.debug('WriterRagRetrievalAgent', 'Starting workspace retrieval', {
		queryLength: query.length,
	});

	const ragFindings = await runRagChain(agent, retriever, {
		prompt: state.prompt,
		normalizedPrompt: state.normalizedPrompt || state.prompt,
		researchGuidance: state.routingFindings,
		intentFindings: state.routingFindings,
		query,
		history: state.history,
	});

	logger?.info('WriterRagRetrievalAgent', 'Workspace retrieval completed', {
		findingsLength: ragFindings.length,
	});

	return {
		ragFindings,
	};
}
