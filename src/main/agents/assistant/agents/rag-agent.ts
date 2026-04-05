import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { LoggerService } from '../../../services/logger';
import type { AssistantSpecialistAgent } from '../specialist-agent';
import type { AssistantState } from '../state';
import {
	createRagChain,
	NO_CONTEXT_FINDING,
	runRagChain,
	type RagRetriever,
} from '../../rag';

const RAG_SKIPPED_FINDING = 'Workspace retrieval was not required for this request.';
const RAG_UNAVAILABLE_FINDING =
	'Workspace retrieval was requested, but no workspace knowledge base is available.';

export function createRagAgent(model: BaseChatModel): AssistantSpecialistAgent {
	return createRagChain(model);
}

export async function ragAgent(
	state: typeof AssistantState.State,
	agent: AssistantSpecialistAgent,
	retriever?: RagRetriever,
	logger?: LoggerService
): Promise<Partial<typeof AssistantState.State>> {
	const query = (state.ragQuery || state.normalizedPrompt || state.prompt).trim();

	if (!state.needsRetrieval) {
		logger?.debug('RagAgent', 'Skipping RAG query because retrieval was not requested');
		return { ragFindings: RAG_SKIPPED_FINDING };
	}

	if (query.length === 0) {
		logger?.debug('RagAgent', 'Skipping RAG query', {
			queryEmpty: query.length === 0,
		});
		return { ragFindings: NO_CONTEXT_FINDING };
	}

	if (retriever === undefined) {
		logger?.debug('RagAgent', 'Skipping RAG query because no retriever is available');
		return { ragFindings: RAG_UNAVAILABLE_FINDING };
	}

	logger?.debug('RagAgent', 'Starting RAG query', { queryLength: query.length });
	const ragFindings = await runRagChain(agent, retriever, {
		prompt: state.prompt,
		normalizedPrompt: query,
		plannerFindings: state.plannerFindings,
		intentFindings: state.intentFindings,
		query,
		history: state.history,
	});

	logger?.info('RagAgent', 'RAG findings generated', { findingsLength: ragFindings.length });

	return {
		ragFindings,
	};
}
