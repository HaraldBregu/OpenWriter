/**
 * ragNode — LangGraph node that retrieves relevant workspace documents and
 * augments the assistant state with a `ragContext` string.
 *
 * Runs before specialist nodes so that writing, research, and conversation
 * nodes can include retrieved context in their prompts when available.
 *
 * When no workspace is open, or the vector store is empty, ragContext is set
 * to an empty string and execution continues without interruption.
 */

import type { AssistantState } from '../../state';
import type { RagRetriever } from './rag-retriever';

const CONTEXT_SEPARATOR = '\n\n---\n\n';

/**
 * Format retrieved document snippets into a single context block.
 * Returns an empty string when the documents array is empty.
 */
function buildRagContext(snippets: string[]): string {
	if (snippets.length === 0) {
		return '';
	}
	return snippets.join(CONTEXT_SEPARATOR);
}

export async function ragNode(
	state: typeof AssistantState.State,
	retriever: RagRetriever
): Promise<Partial<typeof AssistantState.State>> {
	const query = state.prompt.trim();

	if (query.length === 0) {
		return { ragContext: '' };
	}

	const documents = await retriever.retrieve(query);
	const snippets = documents.map((doc) => doc.pageContent);
	const ragContext = buildRagContext(snippets);

	return { ragContext };
}
