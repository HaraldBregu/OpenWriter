import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage } from '@langchain/core/messages';
import { toLangChainHistoryMessages } from '../../../core/history';
import type { AgentHistoryMessage } from '../../../core/types';
import {
	createAssistantSpecialistAgent,
	invokeAssistantSpecialist,
	type AssistantSpecialistAgent,
} from '../../specialist-agent';
import type { RagRetriever } from './retriever';

const SYSTEM_PROMPT = `You are the RAG specialist in a multi-agent assistant.

You receive the user's request, a normalized request, routing guidance, intent
classification, and retrieved workspace snippets.

Produce an internal note for another assistant, not a user-facing reply.

Rules:

- Follow the routing guidance and focus.
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
	researchGuidance: string;
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
	const documents = await retriever.retrieveMany(
		buildRetrievalQueries(input.query, input.normalizedPrompt, input.prompt)
	);
	if (documents.length === 0) {
		return NO_CONTEXT_FINDING;
	}

	const messages = [
		...toLangChainHistoryMessages(input.history),
		new HumanMessage(
			buildHumanMessage(
				input.prompt,
				input.normalizedPrompt,
				input.researchGuidance,
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
			const chunkRange = getChunkRangeLabel(document.metadata);
			return [
				`Source: ${chunkRange ? `${sourceLabel} (${chunkRange})` : sourceLabel}`,
				document.pageContent.trim(),
			].join('\n');
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

function getChunkRangeLabel(metadata: Record<string, unknown>): string | undefined {
	const chunkStart = readChunkBound(metadata['chunkStart']);
	const chunkEnd = readChunkBound(metadata['chunkEnd']);

	if (chunkStart === undefined && chunkEnd === undefined) {
		return undefined;
	}

	if (chunkStart !== undefined && chunkEnd !== undefined) {
		if (chunkStart === chunkEnd) {
			return `chunk ${chunkStart + 1}`;
		}

		return `chunks ${chunkStart + 1}-${chunkEnd + 1}`;
	}

	const chunkIndex = chunkStart ?? chunkEnd;
	return chunkIndex === undefined ? undefined : `chunk ${chunkIndex + 1}`;
}

function readChunkBound(value: unknown): number | undefined {
	if (typeof value === 'number' && Number.isInteger(value)) {
		return value;
	}

	if (typeof value === 'string' && /^\d+$/.test(value)) {
		return Number(value);
	}

	return undefined;
}

function buildRetrievalQueries(...queries: string[]): string[] {
	const seen = new Set<string>();
	const normalized: string[] = [];

	for (const query of queries) {
		const cleaned = query.replace(/\s+/g, ' ').trim();
		if (cleaned.length === 0) {
			continue;
		}

		const key = cleaned.toLowerCase();
		if (seen.has(key)) {
			continue;
		}

		seen.add(key);
		normalized.push(cleaned);
	}

	return normalized;
}

function buildHumanMessage(
	prompt: string,
	normalizedPrompt: string,
	researchGuidance: string,
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
		'Routing guidance:',
		'<research_guidance>',
		researchGuidance || 'No routing guidance was provided.',
		'</research_guidance>',
		'',
		'Retrieved workspace context:',
		'<workspace_context>',
		ragContext,
		'</workspace_context>',
	].join('\n');
}
