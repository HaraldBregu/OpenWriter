import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage } from '@langchain/core/messages';
import { toLangChainHistoryMessages } from '../core/history';
import type { AgentHistoryMessage } from '../core/types';
import {
	createAssistantSpecialistAgent,
	invokeAssistantSpecialist,
	type AssistantSpecialistAgent,
} from '../assistant/specialist-agent';
import type { RagRetriever } from './retriever';

const SYSTEM_PROMPT = `You are the RAG specialist in a multi-agent assistant.

You receive the user's request, a normalized request, the planner brief, intent
classification, and retrieved workspace snippets.

Produce an internal note for another assistant, not a user-facing reply.

Rules:

- Follow the planner's RAG intent and focus.
- Use only the retrieved workspace context.
- Summarize the facts most relevant to answering the user's request.
- Mention source labels when they materially support a claim.
- If the context is partial, say what is missing or uncertain.
- Do not invent facts beyond the provided snippets.
- Keep the note concise and directly useful for a final response writer.`;

const CONTEXT_SEPARATOR = '\n\n---\n\n';
export const NO_CONTEXT_FINDING = 'No relevant workspace context was found for this request.';

export interface RunRagChainInput {
	prompt: string;
	normalizedPrompt: string;
	plannerFindings: string;
	intentFindings: string;
	query: string;
	history?: AgentHistoryMessage[];
}

export function createRagChain(model: BaseChatModel): AssistantSpecialistAgent {
	return createAssistantSpecialistAgent(model, SYSTEM_PROMPT);
}

export async function runRagChain(
	agent: AssistantSpecialistAgent,
	retriever: RagRetriever,
	input: RunRagChainInput
): Promise<string> {
	const documents = await retriever.retrieve(input.query);
	if (documents.length === 0) {
		return NO_CONTEXT_FINDING;
	}

	const messages = [
		...toLangChainHistoryMessages(input.history),
		new HumanMessage(
			buildHumanMessage(
				input.prompt,
				input.normalizedPrompt,
				input.plannerFindings,
				input.intentFindings,
				buildRagContext(documents)
			)
		),
	];
	const ragFindings = await invokeAssistantSpecialist(agent, messages);

	return ragFindings || NO_CONTEXT_FINDING;
}

function buildRagContext(documents: Awaited<ReturnType<RagRetriever['retrieve']>>): string {
	return documents
		.map((document, index) => {
			const sourceLabel = getSourceLabel(document.metadata, index);
			return [`Source: ${sourceLabel}`, document.pageContent.trim()].join('\n');
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
