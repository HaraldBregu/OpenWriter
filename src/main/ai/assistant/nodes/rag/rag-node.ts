import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { extractTokenFromChunk } from '../../../../shared/ai-utils';
import { toLangChainHistoryMessages } from '../../../core/history';
import type { AssistantState } from '../../state';
import type { RagRetriever } from './rag-retriever';
import SYSTEM_PROMPT from './RAG_QUERY_SYSTEM.md?raw';

const CONTEXT_SEPARATOR = '\n\n---\n\n';
const NO_CONTEXT_FINDING = 'No relevant workspace context was found for this request.';

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

function buildHumanMessage(prompt: string, ragContext: string): string {
	return [
		'User request:',
		prompt,
		'',
		'Retrieved workspace context:',
		'<workspace_context>',
		ragContext,
		'</workspace_context>',
	].join('\n');
}

export async function ragQueryNode(
	state: typeof AssistantState.State,
	model: BaseChatModel,
	retriever?: RagRetriever
): Promise<Partial<typeof AssistantState.State>> {
	const query = state.prompt.trim();

	if (query.length === 0 || retriever === undefined) {
		return { ragFindings: NO_CONTEXT_FINDING };
	}

	const documents = await retriever.retrieve(query);
	if (documents.length === 0) {
		return { ragFindings: NO_CONTEXT_FINDING };
	}

	const ragContext = buildRagContext(documents);
	const messages = [
		new SystemMessage(SYSTEM_PROMPT),
		...toLangChainHistoryMessages(state.history),
		new HumanMessage(buildHumanMessage(query, ragContext)),
	];
	const response = await model.invoke(messages);
	const ragFindings = extractTokenFromChunk(response.content).trim();

	return {
		ragFindings: ragFindings || NO_CONTEXT_FINDING,
	};
}
