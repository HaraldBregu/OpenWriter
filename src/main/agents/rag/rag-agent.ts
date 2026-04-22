import { BaseAgent } from '../core/base-agent';
import type { AgentContext } from '../core/agent';
import { AgentValidationError } from '../core/agent-errors';
import { createEmbeddingModel } from '../../shared/embedding-factory';
import { createChatModel } from '../../shared/chat-model-factory';
import type { ChatMessage, DocumentChunk, EmbeddingModel } from '../../shared/ai-types';
import { splitText } from './text-splitter';
import { InMemoryVectorStore } from './vector-store';
import type {
	RagAgentInput,
	RagAgentOutput,
	RagIngestInput,
	RagIngestOutput,
	RagQueryInput,
	RagQueryOutput,
} from './types';

const DEFAULT_TOP_K = 4;
const DEFAULT_SYSTEM_PROMPT =
	'Answer using only the provided context. If the answer is not present, say you do not know.';

/**
 * RagAgent — embed documents into a local vector store, then answer queries
 * by retrieving the top-K chunks and passing them to a chat model.
 *
 * The vector store is per-agent-instance; callers owning multi-workspace
 * indices should create one RagAgent per workspace.
 */
export class RagAgent extends BaseAgent<RagAgentInput, RagAgentOutput> {
	readonly type = 'rag';

	private readonly store = new InMemoryVectorStore();

	validate(input: RagAgentInput): void {
		if (!input.apiKey?.trim()) {
			throw new AgentValidationError(this.type, 'apiKey required');
		}
		if (input.kind === 'ingest' && !input.documents?.length) {
			throw new AgentValidationError(this.type, 'documents required');
		}
		if (input.kind === 'query' && !input.query?.trim()) {
			throw new AgentValidationError(this.type, 'query required');
		}
	}

	protected async run(input: RagAgentInput, ctx: AgentContext): Promise<RagAgentOutput> {
		if (input.kind === 'ingest') return this.ingest(input, ctx);
		return this.query(input, ctx);
	}

	private async ingest(input: RagIngestInput, ctx: AgentContext): Promise<RagIngestOutput> {
		const embedder = this.embedder(input);
		const chunks: DocumentChunk[] = [];
		for (const doc of input.documents) {
			chunks.push(
				...splitText(
					doc.content,
					{ id: doc.id, ...(doc.metadata ?? {}) },
					{ chunkSize: input.chunkSize, chunkOverlap: input.chunkOverlap }
				)
			);
		}

		this.reportProgress(ctx, 10, `Embedding ${chunks.length} chunks`);
		this.ensureNotAborted(ctx.signal);

		const embeddings = await embedder.embedDocuments(chunks.map((c) => c.pageContent));
		this.ensureNotAborted(ctx.signal);

		this.store.addMany(chunks, embeddings);
		this.reportProgress(ctx, 100, 'Ingest complete');

		return { kind: 'ingest', chunksIndexed: chunks.length };
	}

	private async query(input: RagQueryInput, ctx: AgentContext): Promise<RagQueryOutput> {
		const embedder = this.embedder(input);
		const topK = input.topK ?? DEFAULT_TOP_K;

		this.reportProgress(ctx, 10, 'Embedding query');
		const queryVec = await embedder.embedQuery(input.query);
		this.ensureNotAborted(ctx.signal);

		this.reportProgress(ctx, 40, 'Retrieving chunks');
		const citations = this.store.search(queryVec, topK);

		this.reportProgress(ctx, 60, 'Generating answer');
		const chatModel = createChatModel({
			providerId: input.providerId,
			apiKey: input.apiKey,
			modelName: input.chatModel,
			streaming: Boolean(ctx.onEvent),
		});

		const messages = this.buildMessages(input, citations);
		const answer = ctx.onEvent
			? await this.streamAnswer(chatModel, messages, ctx)
			: await chatModel.invoke(messages, ctx.signal);

		this.reportProgress(ctx, 100, 'Query complete');
		return { kind: 'query', answer, citations };
	}

	private embedder(input: {
		providerId: string;
		apiKey: string;
		embeddingModel?: string;
	}): EmbeddingModel {
		return createEmbeddingModel({
			providerId: input.providerId,
			apiKey: input.apiKey,
			model: input.embeddingModel,
		});
	}

	private buildMessages(input: RagQueryInput, citations: DocumentChunk[]): ChatMessage[] {
		const contextBlock = citations.map((c, i) => `[${i + 1}] ${c.pageContent}`).join('\n\n');

		const system: ChatMessage = {
			role: 'system',
			content: `${input.systemPrompt ?? DEFAULT_SYSTEM_PROMPT}\n\nContext:\n${contextBlock}`,
		};

		return [system, ...(input.history ?? []), { role: 'user', content: input.query }];
	}

	private async streamAnswer(
		model: ReturnType<typeof createChatModel>,
		messages: ChatMessage[],
		ctx: AgentContext
	): Promise<string> {
		let content = '';
		for await (const token of model.stream(messages, ctx.signal)) {
			this.ensureNotAborted(ctx.signal);
			content += token;
			ctx.onEvent?.({ kind: 'text', at: Date.now(), payload: { text: token } });
		}
		return content;
	}

	indexSize(): number {
		return this.store.size();
	}

	reset(): void {
		this.store.clear();
	}
}
