import fs from 'node:fs/promises';
import path from 'node:path';
import { AIMessage, HumanMessage, type BaseMessage } from '@langchain/core/messages';
import { StringOutputParser, StructuredOutputParser } from '@langchain/core/output_parsers';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { RunnableLambda, RunnableSequence } from '@langchain/core/runnables';
import type { EmbeddingsInterface } from '@langchain/core/embeddings';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import type {
	CreateWorkspaceWriterWorkflowOptions,
	CreateWriterWorkflowOptions,
	WriterHistoryMessage,
	WriterPromptAnalysis,
	WriterRetrievedDocument,
	WriterRetrievalStrategy,
	WriterRetriever,
	WriterWorkflow,
	WriterWorkflowInput,
	WriterWorkflowResult,
} from './types';

const LOG_SOURCE = 'WriterWorkflow';
const DEFAULT_EMBEDDING_MODEL = 'text-embedding-3-small';
const DEFAULT_TOP_K = 4;
const DEFAULT_MIN_SCORE = 0.3;
const VECTOR_STORE_PATH = ['data', 'vector_store', 'vector-store.json'] as const;

const PROVIDER_BASE_URLS: Record<string, string | undefined> = {
	openai: undefined,
	anthropic: 'https://api.anthropic.com/v1/',
	google: 'https://generativelanguage.googleapis.com/v1beta/openai/',
	meta: 'https://api.llama.com/compat/v1/',
	mistral: 'https://api.mistral.ai/v1/',
};

const EMBEDDING_PROVIDER_BASE_URLS: Record<string, string | undefined> = {
	openai: undefined,
	google: 'https://generativelanguage.googleapis.com/v1beta/openai/',
	mistral: 'https://api.mistral.ai/v1/',
};

const REASONING_MODEL_PREFIXES = ['o1', 'o3', 'o3-mini', 'o1-mini', 'o1-preview'] as const;

const WORKSPACE_RETRIEVAL_PATTERN =
	/\b(workspace|codebase|repo|repository|project|document|docs|notes|from the files|from the repo|from the project|based on the workspace)\b/i;

const NO_RETRIEVAL_CONTEXT = 'No workspace context was used for this request.';
const NO_RETRIEVAL_RESULTS = 'No relevant workspace context was retrieved for this request.';
const RETRIEVAL_UNAVAILABLE = 'Workspace retrieval was requested, but no retriever is configured.';

interface StoredVectorEntry {
	id: string;
	embedding: number[];
	content: string;
	metadata: Record<string, unknown>;
}

interface StoredVectorFile {
	version: number;
	entries: StoredVectorEntry[];
}

interface WriterWorkflowRuntimeState {
	prompt: string;
	history: BaseMessage[];
	analysis: WriterPromptAnalysis;
	retrievedDocuments: WriterRetrievedDocument[];
	retrievalStatus: string;
	retrievalContext: string;
}

interface LocalWriterRetrieverOptions {
	workspacePath: string;
	embeddings: EmbeddingsInterface;
	topK?: number;
	minScore?: number;
}

class LocalWriterRetriever implements WriterRetriever {
	private entries: StoredVectorEntry[] | null = null;

	constructor(private readonly options: LocalWriterRetrieverOptions) {}

	async retrieve(query: string): Promise<WriterRetrievedDocument[]> {
		const normalizedQuery = query.trim();

		if (normalizedQuery.length === 0) {
			return [];
		}

		const entries = await this.loadEntries();
		if (entries.length === 0) {
			return [];
		}

		const queryEmbedding = await this.options.embeddings.embedQuery(normalizedQuery);
		const topK = this.options.topK ?? DEFAULT_TOP_K;
		const minScore = this.options.minScore ?? DEFAULT_MIN_SCORE;

		return entries
			.map((entry) => ({
				pageContent: entry.content,
				metadata: entry.metadata,
				score: cosineSimilarity(queryEmbedding, entry.embedding),
			}))
			.filter((entry) => entry.score >= minScore)
			.sort((a, b) => b.score - a.score)
			.slice(0, topK);
	}

	private async loadEntries(): Promise<StoredVectorEntry[]> {
		if (this.entries !== null) {
			return this.entries;
		}

		const filePath = path.join(this.options.workspacePath, ...VECTOR_STORE_PATH);

		try {
			const raw = await fs.readFile(filePath, 'utf-8');
			const parsed = JSON.parse(raw) as StoredVectorFile;
			this.entries = Array.isArray(parsed.entries) ? parsed.entries : [];
		} catch {
			this.entries = [];
		}

		return this.entries;
	}
}

const analysisParser = StructuredOutputParser.fromNamesAndDescriptions({
	normalizedPrompt:
		'A cleaned-up restatement of the user request that preserves exact intent and scope.',
	taskType:
		'A short label for the requested writing task, such as draft, revise, summarize, explain, or answer.',
	responsePlan:
		'Two or three sentences describing how the answer should be produced and what it should prioritize.',
	retrievalStrategy:
		'One of: required, helpful, skip. Use required when indexed workspace context is necessary, helpful when it improves the answer, and skip when retrieval adds no value.',
	retrievalQuery:
		'The best workspace retrieval query for this request. Return Skip when retrievalStrategy is skip.',
	answerConstraints:
		'Any constraints that the response must follow, including tone, format, scope, and missing-context handling.',
});

const analyzePrompt = ChatPromptTemplate.fromMessages([
	[
		'system',
		`You are the analysis stage of a writing workflow built with LangChain.

Study the latest user request and any prior conversation turns.
Decide how the request should be handled and whether workspace retrieval should be used.

Rules:
- Consider retrieval only for indexed workspace or project knowledge.
- Use "required" when the answer depends on workspace facts.
- Use "helpful" when workspace context would improve the response but is not mandatory.
- Use "skip" when retrieval does not help.
- When retrievalStrategy is "skip", retrievalQuery must be "Skip".
- Keep every field concise, concrete, and directly actionable.

{formatInstructions}`,
	],
	new MessagesPlaceholder('history'),
	[
		'human',
		`Latest user request:
{prompt}`,
	],
]);

const responsePrompt = ChatPromptTemplate.fromMessages([
	[
		'system',
		`You are the response stage of a writing workflow.

Write the best possible answer to the user request using the analysis and any retrieved workspace context.

Rules:
- Treat retrieved workspace context as the factual source for workspace-specific claims.
- If workspace context is empty or unavailable, do not invent missing project details.
- Follow the response plan and answer constraints closely.
- Mention source labels naturally when retrieved context materially supports the answer.
- Output only the final user-facing response.`,
	],
	new MessagesPlaceholder('history'),
	[
		'human',
		`Original user request:
{prompt}

Normalized request:
{normalizedPrompt}

Task type:
{taskType}

Response plan:
{responsePlan}

Answer constraints:
{answerConstraints}

Workspace retrieval status:
{retrievalStatus}

Retrieved workspace context:
{retrievalContext}`,
	],
]);

function isReasoningModel(modelName: string): boolean {
	const normalized = modelName.trim().toLowerCase();

	return REASONING_MODEL_PREFIXES.some(
		(prefix) => normalized === prefix || normalized.startsWith(`${prefix}-`)
	);
}

function createWriterChatModel(
	options: Pick<
		CreateWorkspaceWriterWorkflowOptions,
		'apiKey' | 'providerId' | 'modelName' | 'temperature' | 'maxTokens'
	>
): ChatOpenAI {
	const baseURL = PROVIDER_BASE_URLS[options.providerId];

	return new ChatOpenAI({
		apiKey: options.apiKey,
		model: options.modelName,
		streaming: false,
		...(isReasoningModel(options.modelName) ? {} : { temperature: options.temperature }),
		...(options.maxTokens ? { maxTokens: options.maxTokens } : {}),
		...(baseURL ? { configuration: { baseURL } } : {}),
	});
}

function createWriterEmbeddings(
	options: Pick<
		CreateWorkspaceWriterWorkflowOptions,
		'apiKey' | 'providerId' | 'embeddingModelName'
	>
): OpenAIEmbeddings {
	const baseURL = EMBEDDING_PROVIDER_BASE_URLS[options.providerId];

	return new OpenAIEmbeddings({
		openAIApiKey: options.apiKey,
		modelName: options.embeddingModelName ?? DEFAULT_EMBEDDING_MODEL,
		...(baseURL ? { configuration: { baseURL } } : {}),
	});
}

function toLangChainHistoryMessages(history: WriterHistoryMessage[] | undefined): BaseMessage[] {
	return (history ?? []).map((message) =>
		message.role === 'user' ? new HumanMessage(message.content) : new AIMessage(message.content)
	);
}

function cosineSimilarity(a: number[], b: number[]): number {
	let dot = 0;
	let normA = 0;
	let normB = 0;

	const length = Math.min(a.length, b.length);
	for (let index = 0; index < length; index++) {
		dot += a[index] * b[index];
		normA += a[index] * a[index];
		normB += b[index] * b[index];
	}

	const denominator = Math.sqrt(normA) * Math.sqrt(normB);
	return denominator === 0 ? 0 : dot / denominator;
}

function buildFallbackAnalysis(prompt: string): WriterPromptAnalysis {
	const normalizedPrompt = prompt.trim() || 'No request provided.';
	const retrievalNeeded = WORKSPACE_RETRIEVAL_PATTERN.test(normalizedPrompt);

	return {
		normalizedPrompt,
		taskType: 'answer',
		responsePlan:
			'Answer the request directly and use workspace context only when it is clearly relevant.',
		retrievalStrategy: retrievalNeeded ? 'helpful' : 'skip',
		retrievalQuery: retrievalNeeded ? normalizedPrompt : '',
		answerConstraints:
			'Stay aligned with the user request, keep the answer concrete, and be explicit when workspace context is missing.',
	};
}

function normalizeRetrievalStrategy(value: string | undefined): WriterRetrievalStrategy {
	const normalized = value?.trim().toLowerCase();

	if (normalized === 'required' || normalized === 'helpful' || normalized === 'skip') {
		return normalized;
	}

	return 'skip';
}

function normalizeAnalysis(raw: Record<string, string>, prompt: string): WriterPromptAnalysis {
	const fallback = buildFallbackAnalysis(prompt);
	const retrievalStrategy = normalizeRetrievalStrategy(raw['retrievalStrategy']);
	const retrievalQuery = raw['retrievalQuery']?.trim();

	return {
		normalizedPrompt: raw['normalizedPrompt']?.trim() || fallback.normalizedPrompt,
		taskType: raw['taskType']?.trim() || fallback.taskType,
		responsePlan: raw['responsePlan']?.trim() || fallback.responsePlan,
		retrievalStrategy,
		retrievalQuery:
			retrievalStrategy === 'skip'
				? ''
				: retrievalQuery && !/^skip$/i.test(retrievalQuery)
					? retrievalQuery
					: fallback.retrievalQuery || fallback.normalizedPrompt,
		answerConstraints: raw['answerConstraints']?.trim() || fallback.answerConstraints,
	};
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

function formatRetrievedDocuments(documents: WriterRetrievedDocument[]): string {
	if (documents.length === 0) {
		return NO_RETRIEVAL_RESULTS;
	}

	return documents
		.map((document, index) =>
			[
				`Source: ${getSourceLabel(document.metadata, index)} (score ${document.score.toFixed(2)})`,
				document.pageContent.trim(),
			]
				.filter(Boolean)
				.join('\n')
		)
		.join('\n\n---\n\n');
}

async function analyzeRequest(
	model: CreateWriterWorkflowOptions['model'],
	input: WriterWorkflowInput,
	logger?: CreateWriterWorkflowOptions['logger']
): Promise<{ prompt: string; history: BaseMessage[]; analysis: WriterPromptAnalysis }> {
	const prompt = input.prompt.trim();
	const history = toLangChainHistoryMessages(input.history);

	if (prompt.length === 0) {
		logger?.debug?.(LOG_SOURCE, 'Skipping analysis for empty prompt');
		return {
			prompt,
			history,
			analysis: buildFallbackAnalysis(prompt),
		};
	}

	const analysisChain = analyzePrompt.pipe(model).pipe(analysisParser);

	try {
		logger?.debug?.(LOG_SOURCE, 'Analyzing writer request', {
			promptLength: prompt.length,
			historyLength: input.history?.length ?? 0,
		});

		const rawAnalysis = await analysisChain.invoke({
			prompt,
			history,
			formatInstructions: analysisParser.getFormatInstructions(),
		});
		const analysis = normalizeAnalysis(rawAnalysis, prompt);

		logger?.info?.(LOG_SOURCE, 'Writer request analyzed', {
			retrievalStrategy: analysis.retrievalStrategy,
			retrievalQueryLength: analysis.retrievalQuery.length,
		});

		return { prompt, history, analysis };
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : String(error);
		logger?.warn?.(LOG_SOURCE, `Falling back to heuristic writer analysis: ${message}`);

		return {
			prompt,
			history,
			analysis: buildFallbackAnalysis(prompt),
		};
	}
}

async function retrieveWorkspaceContext(
	analysis: WriterPromptAnalysis,
	retriever: WriterRetriever | undefined,
	maxDocuments: number | undefined,
	logger?: CreateWriterWorkflowOptions['logger']
): Promise<
	Pick<WriterWorkflowRuntimeState, 'retrievedDocuments' | 'retrievalStatus' | 'retrievalContext'>
> {
	if (analysis.retrievalStrategy === 'skip') {
		return {
			retrievedDocuments: [],
			retrievalStatus: 'Skipped workspace retrieval because the request does not require it.',
			retrievalContext: NO_RETRIEVAL_CONTEXT,
		};
	}

	if (!retriever) {
		logger?.warn?.(
			LOG_SOURCE,
			'Writer workflow requested retrieval without a configured retriever'
		);
		return {
			retrievedDocuments: [],
			retrievalStatus: RETRIEVAL_UNAVAILABLE,
			retrievalContext: RETRIEVAL_UNAVAILABLE,
		};
	}

	logger?.debug?.(LOG_SOURCE, 'Retrieving workspace context', {
		retrievalStrategy: analysis.retrievalStrategy,
		queryLength: analysis.retrievalQuery.length,
	});

	const retrievedDocuments = (await retriever.retrieve(analysis.retrievalQuery)).slice(
		0,
		maxDocuments ?? Number.POSITIVE_INFINITY
	);

	logger?.info?.(LOG_SOURCE, 'Workspace retrieval completed', {
		documentCount: retrievedDocuments.length,
	});

	if (retrievedDocuments.length === 0) {
		return {
			retrievedDocuments,
			retrievalStatus: NO_RETRIEVAL_RESULTS,
			retrievalContext: NO_RETRIEVAL_RESULTS,
		};
	}

	return {
		retrievedDocuments,
		retrievalStatus: `Retrieved ${retrievedDocuments.length} workspace snippet(s) for this request.`,
		retrievalContext: formatRetrievedDocuments(retrievedDocuments),
	};
}

async function generateResponse(
	model: CreateWriterWorkflowOptions['model'],
	state: WriterWorkflowRuntimeState,
	logger?: CreateWriterWorkflowOptions['logger']
): Promise<WriterWorkflowResult> {
	logger?.debug?.(LOG_SOURCE, 'Generating writer response', {
		retrievalStatus: state.retrievalStatus,
		documentCount: state.retrievedDocuments.length,
	});

	const responseChain = responsePrompt.pipe(model).pipe(new StringOutputParser());
	const response = (
		await responseChain.invoke({
			prompt: state.prompt,
			history: state.history,
			normalizedPrompt: state.analysis.normalizedPrompt,
			taskType: state.analysis.taskType,
			responsePlan: state.analysis.responsePlan,
			answerConstraints: state.analysis.answerConstraints,
			retrievalStatus: state.retrievalStatus,
			retrievalContext: state.retrievalContext,
		})
	).trim();

	logger?.info?.(LOG_SOURCE, 'Writer response generated', {
		responseLength: response.length,
	});

	return {
		analysis: state.analysis,
		retrievedDocuments: state.retrievedDocuments,
		retrievalStatus: state.retrievalStatus,
		retrievalContext: state.retrievalContext,
		response,
	};
}

export function createWriterWorkflow(options: CreateWriterWorkflowOptions): WriterWorkflow {
	const prepareContext = RunnableLambda.from(async (input: WriterWorkflowInput) => {
		const analyzed = await analyzeRequest(options.model, input, options.logger);
		const retrieval = await retrieveWorkspaceContext(
			analyzed.analysis,
			options.retriever,
			options.maxDocuments,
			options.logger
		);

		return {
			prompt: analyzed.prompt,
			history: analyzed.history,
			analysis: analyzed.analysis,
			retrievedDocuments: retrieval.retrievedDocuments,
			retrievalStatus: retrieval.retrievalStatus,
			retrievalContext: retrieval.retrievalContext,
		} satisfies WriterWorkflowRuntimeState;
	});

	const finalizeResponse = RunnableLambda.from((state: WriterWorkflowRuntimeState) =>
		generateResponse(options.model, state, options.logger)
	);

	const workflow = RunnableSequence.from([prepareContext, finalizeResponse]);

	return {
		run(input: WriterWorkflowInput): Promise<WriterWorkflowResult> {
			return workflow.invoke(input);
		},
	};
}

export function createWorkspaceWriterWorkflow(
	options: CreateWorkspaceWriterWorkflowOptions
): WriterWorkflow {
	const model = createWriterChatModel(options);
	const retriever = options.workspacePath
		? new LocalWriterRetriever({
				workspacePath: options.workspacePath,
				embeddings: createWriterEmbeddings(options),
			})
		: undefined;

	return createWriterWorkflow({
		model,
		retriever,
		logger: options.logger,
		maxDocuments: options.maxDocuments,
	});
}
