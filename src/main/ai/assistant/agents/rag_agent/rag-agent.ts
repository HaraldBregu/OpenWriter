import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage } from '@langchain/core/messages';
import type { LoggerService } from '../../../../services/logger';
import { toLangChainHistoryMessages } from '../../../core/history';
import {
	createAssistantSpecialistAgent,
	invokeAssistantSpecialist,
	type AssistantSpecialistAgent,
} from '../../specialist-agent';
import type { AssistantState } from '../../state';
import type { RagRetriever } from './rag-retriever';
import SYSTEM_PROMPT from './RAG_AGENT_SYSTEM.md?raw';

const CONTEXT_SEPARATOR = '\n\n---\n\n';
const NO_CONTEXT_FINDING = 'No relevant workspace context was found for this request.';
const RAG_SKIPPED_FINDING = 'Workspace retrieval was not required for this request.';
const RAG_UNAVAILABLE_FINDING =
	'Workspace retrieval was requested, but no workspace knowledge base is available.';

function buildRagContext(documents: Awaited<ReturnType<RagRetriever['retrieve']>>): string {
	return documents
		.map((doc, index) => {
			const sourceLabel = getSourceLabel(doc.metadata, index);
			return [`Source: ${sourceLabel}`, doc.pageContent.trim()].join('\n');
		})
		.filter(Boolean)
		.join(CONTEXT_SEPARATOR);
}

function getSourceLabel(metadata: Record<string, unknown>, index: number): string {
	if (typeof metadata['fileName'] === 'string' && metadata['fileName'].trim().length > 0) {
		return metadata['fileName'];
	}

	if (typeof metadata['source'] === 'string' && metadata['source'].trim().length > 0) {
		return metadata['source'];
	}

	return `document-${index + 1}`;
}

function buildHumanMessage(
	prompt: string,
	normalizedPrompt: string,
	plannerFindings: string,
	intentFindings: string,
	ragContext: string
): string {
	return [
		'User request:',
		prompt,
		'',
		'Normalized request:',
		normalizedPrompt,
		'',
		'Intent classification:',
		'<intent_findings>',
		intentFindings,
		'</intent_findings>',
		'',
		'Planner brief:',
		'<planner_findings>',
		plannerFindings || 'No planner brief was provided.',
		'</planner_findings>',
		'',
		'Retrieved workspace context:',
		'<workspace_context>',
		ragContext,
		'</workspace_context>',
	].join('\n');
}

export function createRagAgent(model: BaseChatModel): AssistantSpecialistAgent {
	return createAssistantSpecialistAgent(model, SYSTEM_PROMPT);
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

	const documents = await retriever.retrieve(query);
	logger?.info('RagAgent', 'RAG documents retrieved', { documentCount: documents.length });

	if (documents.length === 0) {
		return { ragFindings: NO_CONTEXT_FINDING };
	}

	const ragContext = buildRagContext(documents);
	const messages = [
		...toLangChainHistoryMessages(state.history),
		new HumanMessage(
			buildHumanMessage(
				state.prompt,
				query,
				state.plannerFindings,
				state.intentFindings,
				ragContext
			)
		),
	];
	const ragFindings = await invokeAssistantSpecialist(agent, messages);

	logger?.info('RagAgent', 'RAG findings generated', { findingsLength: ragFindings.length });

	return {
		ragFindings: ragFindings || NO_CONTEXT_FINDING,
	};
}
