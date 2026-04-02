/**
 * Unit tests for rag-node and RagRetriever.
 *
 * All vector store I/O is mocked so tests run without hitting the filesystem
 * or requiring an embedding model API key.
 */

import type { RetrievedDocument } from '../../../../../../../src/main/ai/agents/assistant/nodes/rag/rag-retriever';
import { RagRetriever } from '../../../../../../../src/main/ai/agents/assistant/nodes/rag/rag-retriever';
import { ragNode } from '../../../../../../../src/main/ai/agents/assistant/nodes/rag/rag-node';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('../../../../../../../src/main/ai/rag/vector-store', () => {
	return {
		VectorStore: {
			load: jest.fn(),
		},
	};
});

import { VectorStore } from '../../../../../../../src/main/ai/rag/vector-store';

const mockLoad = VectorStore.load as jest.Mock;

function makeStore(
	entries: Array<{ pageContent: string; metadata: Record<string, unknown>; score: number }>
) {
	return {
		size: entries.length,
		similaritySearchWithScore: jest
			.fn()
			.mockResolvedValue(
				entries.map(({ pageContent, metadata, score }) => [{ pageContent, metadata }, score])
			),
	};
}

function makeEmbeddings() {
	return {
		embedDocuments: jest.fn(),
		embedQuery: jest.fn(),
	};
}

function makeState(
	overrides: Partial<{
		prompt: string;
		ragContext: string;
	}> = {}
) {
	return {
		prompt: overrides.prompt ?? 'What is quantum computing?',
		history: [],
		intent: 'conversation',
		phaseLabel: '',
		response: '',
		ragContext: overrides.ragContext ?? '',
	};
}

// ---------------------------------------------------------------------------
// RagRetriever tests
// ---------------------------------------------------------------------------

describe('RagRetriever', () => {
	beforeEach(() => {
		mockLoad.mockReset();
	});

	it('returns an empty array when the vector store is empty', async () => {
		mockLoad.mockResolvedValue(makeStore([]));

		const retriever = new RagRetriever({
			workspacePath: '/workspace',
			embeddings: makeEmbeddings(),
		});

		const results = await retriever.retrieve('What is quantum computing?');

		expect(results).toEqual([]);
		expect(mockLoad).toHaveBeenCalledTimes(1);
	});

	it('returns retrieved documents with scores for a non-empty store', async () => {
		const store = makeStore([
			{
				pageContent: 'Quantum computing uses qubits.',
				metadata: { source: 'intro.md' },
				score: 0.92,
			},
			{
				pageContent: 'Entanglement enables parallel computation.',
				metadata: { source: 'advanced.md' },
				score: 0.85,
			},
		]);
		mockLoad.mockResolvedValue(store);

		const retriever = new RagRetriever({
			workspacePath: '/workspace',
			embeddings: makeEmbeddings(),
		});

		const results = await retriever.retrieve('quantum');

		expect(results).toHaveLength(2);
		expect(results[0].pageContent).toBe('Quantum computing uses qubits.');
		expect(results[0].score).toBe(0.92);
		expect(results[1].pageContent).toBe('Entanglement enables parallel computation.');
	});

	it('uses the configured topK when querying the store', async () => {
		const store = makeStore([
			{ pageContent: 'Doc A', metadata: {}, score: 0.9 },
			{ pageContent: 'Doc B', metadata: {}, score: 0.8 },
		]);
		mockLoad.mockResolvedValue(store);

		const retriever = new RagRetriever({
			workspacePath: '/workspace',
			embeddings: makeEmbeddings(),
			topK: 2,
		});

		await retriever.retrieve('some query');

		expect(store.similaritySearchWithScore).toHaveBeenCalledWith('some query', 2);
	});

	it('uses a default topK of 4 when topK is not specified', async () => {
		const store = makeStore([{ pageContent: 'Doc A', metadata: {}, score: 0.9 }]);
		mockLoad.mockResolvedValue(store);

		const retriever = new RagRetriever({
			workspacePath: '/workspace',
			embeddings: makeEmbeddings(),
		});

		await retriever.retrieve('some query');

		expect(store.similaritySearchWithScore).toHaveBeenCalledWith('some query', 4);
	});

	it('loads the store exactly once across multiple retrieve calls', async () => {
		const store = makeStore([{ pageContent: 'Cached doc', metadata: {}, score: 0.7 }]);
		mockLoad.mockResolvedValue(store);

		const retriever = new RagRetriever({
			workspacePath: '/workspace',
			embeddings: makeEmbeddings(),
		});

		await retriever.retrieve('first');
		await retriever.retrieve('second');
		await retriever.retrieve('third');

		expect(mockLoad).toHaveBeenCalledTimes(1);
	});

	it('returns an empty array gracefully when the store fails to load', async () => {
		mockLoad.mockRejectedValue(new Error('ENOENT: no such file or directory'));

		const retriever = new RagRetriever({
			workspacePath: '/missing',
			embeddings: makeEmbeddings(),
		});

		const results = await retriever.retrieve('anything');

		expect(results).toEqual([]);
	});

	it('resolves the vector store path correctly from the workspace root', async () => {
		mockLoad.mockResolvedValue(makeStore([]));

		const retriever = new RagRetriever({
			workspacePath: '/my/workspace',
			embeddings: makeEmbeddings(),
		});

		await retriever.retrieve('test');

		const expectedPath = require('path').join('/my/workspace', 'data', 'vector_store');
		expect(mockLoad).toHaveBeenCalledWith(expectedPath, expect.anything());
	});

	it('includes document metadata in the returned results', async () => {
		const store = makeStore([
			{
				pageContent: 'Some content here.',
				metadata: { fileId: 'abc123', source: 'file.txt', chunkIndex: 0 },
				score: 0.88,
			},
		]);
		mockLoad.mockResolvedValue(store);

		const retriever = new RagRetriever({
			workspacePath: '/workspace',
			embeddings: makeEmbeddings(),
		});

		const results = await retriever.retrieve('content');

		expect(results[0].metadata).toEqual({
			fileId: 'abc123',
			source: 'file.txt',
			chunkIndex: 0,
		});
	});
});

// ---------------------------------------------------------------------------
// ragNode tests
// ---------------------------------------------------------------------------

function makeRetriever(docs: RetrievedDocument[] = []): RagRetriever {
	return {
		retrieve: jest.fn().mockResolvedValue(docs),
	} as unknown as RagRetriever;
}

describe('ragNode', () => {
	it('sets ragContext to an empty string when no documents are retrieved', async () => {
		const retriever = makeRetriever([]);
		const state = makeState({ prompt: 'What is a monad?' });

		const result = await ragNode(state, retriever);

		expect(result.ragContext).toBe('');
	});

	it('sets ragContext to the concatenated document content', async () => {
		const retriever = makeRetriever([
			{ pageContent: 'A monad is a design pattern.', metadata: {}, score: 0.9 },
			{ pageContent: 'Monads wrap values in a context.', metadata: {}, score: 0.8 },
		]);
		const state = makeState({ prompt: 'What is a monad?' });

		const result = await ragNode(state, retriever);

		expect(result.ragContext).toContain('A monad is a design pattern.');
		expect(result.ragContext).toContain('Monads wrap values in a context.');
	});

	it('separates retrieved documents with the context separator', async () => {
		const retriever = makeRetriever([
			{ pageContent: 'First document.', metadata: {}, score: 0.95 },
			{ pageContent: 'Second document.', metadata: {}, score: 0.8 },
		]);
		const state = makeState({ prompt: 'Tell me something.' });

		const result = await ragNode(state, retriever);

		expect(result.ragContext).toBe('First document.\n\n---\n\nSecond document.');
	});

	it('returns an empty ragContext and skips the retriever for an empty prompt', async () => {
		const retriever = makeRetriever([
			{ pageContent: 'Should not appear.', metadata: {}, score: 0.9 },
		]);
		const state = makeState({ prompt: '   ' });

		const result = await ragNode(state, retriever);

		expect(result.ragContext).toBe('');
		expect(retriever.retrieve as jest.Mock).not.toHaveBeenCalled();
	});

	it('calls retrieve with the trimmed prompt text', async () => {
		const retriever = makeRetriever([]);
		const state = makeState({ prompt: '  What is recursion?  ' });

		await ragNode(state, retriever);

		expect(retriever.retrieve as jest.Mock).toHaveBeenCalledWith('What is recursion?');
	});

	it('returns ragContext as a single string for a single retrieved document', async () => {
		const retriever = makeRetriever([
			{ pageContent: 'Only document here.', metadata: {}, score: 0.99 },
		]);
		const state = makeState({ prompt: 'Tell me about it.' });

		const result = await ragNode(state, retriever);

		expect(result.ragContext).toBe('Only document here.');
	});

	it('does not mutate the state object', async () => {
		const retriever = makeRetriever([{ pageContent: 'Some content.', metadata: {}, score: 0.8 }]);
		const state = makeState({ prompt: 'A query.' });
		const originalState = { ...state };

		await ragNode(state, retriever);

		expect(state).toEqual(originalState);
	});

	it('only returns the ragContext field in the partial update', async () => {
		const retriever = makeRetriever([{ pageContent: 'Context doc.', metadata: {}, score: 0.75 }]);
		const state = makeState({ prompt: 'Query.' });

		const result = await ragNode(state, retriever);

		expect(Object.keys(result)).toEqual(['ragContext']);
	});
});
