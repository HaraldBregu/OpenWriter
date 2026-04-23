# Embedding And RAG Agent

The **RAG** agent is OpenWriter's retrieval layer. It does two related
jobs — *ingest* documents as embeddings, and *query* them to produce
answers grounded in the user's own material.

Source: `src/main/agents/rag/`.
Embedding factory: `src/main/shared/embedding-factory.ts`.

## Why One Agent, Not Two

Some systems split "embedding agent" and "retrieval agent" into
separate units. OpenWriter currently folds both behaviors into the
`RagAgent` with a `kind` discriminator:

- `kind: 'ingest'` — embed a batch of documents and load them into a
  per-instance vector store.
- `kind: 'query'` — embed the query, retrieve top-K similar chunks,
  and stream an answer grounded in them.

The *embedding* work is the same in both — the agent reuses
`createEmbeddingModel(...)` for both paths.

## Contract

### Ingest

```ts
interface RagIngestInput {
  kind: 'ingest';
  documents: Array<{ id: string; content: string; metadata?: Record<string, unknown> }>;
  providerId: string;
  apiKey: string;
  embeddingModel?: string;
  chunkSize?: number;
  chunkOverlap?: number;
}

interface RagIngestOutput {
  kind: 'ingest';
  chunksIndexed: number;
}
```

### Query

```ts
interface RagQueryInput {
  kind: 'query';
  query: string;
  providerId: string;
  apiKey: string;
  chatModel: string;
  embeddingModel?: string;
  topK?: number;               // default 4
  systemPrompt?: string;       // default conservative
  history?: ChatMessage[];
}

interface RagQueryOutput {
  kind: 'query';
  answer: string;
  citations: DocumentChunk[];
}
```

## Ingest Pipeline

1. For each document, **split** `content` into chunks with
   `splitText(content, metadata, { chunkSize, chunkOverlap })`.
2. Embed every chunk via `embedDocuments(chunkTexts)`.
3. Store vectors in an `InMemoryVectorStore` — a flat array plus
   cosine similarity.
4. Report `{ chunksIndexed: chunks.length }`.

Defaults (`src/main/agents/rag/text-splitter.ts`):

- `chunkSize = 1000` characters
- `chunkOverlap = 150` characters

This is a **character-window** splitter — simple and deterministic.
Good enough for Markdown and prose; swap for a token-aware splitter if
precise token budgets matter.

## Query Pipeline

1. Embed the query → `embedQuery(query)`.
2. Retrieve top-K chunks by cosine similarity.
3. Build the message list:

   ```ts
   [
     {
       role: 'system',
       content: `${systemPrompt}\n\nContext:\n[1] <chunk>\n\n[2] <chunk>`,
     },
     ...history,
     { role: 'user', content: query },
   ]
   ```

4. Stream the chat response; each token is emitted as
   `{ kind: 'text', payload: { text } }`.
5. Return `{ answer, citations }` — the answer plus the chunks used.

Default system prompt:

```
Answer using only the provided context. If the answer is not present,
say you do not know.
```

The prompt is deliberately conservative — the agent is supposed to
refuse to invent facts outside the retrieved window. Override
`systemPrompt` for other tones.

## The Vector Store

`InMemoryVectorStore` (`src/main/agents/rag/vector-store.ts`):

- `add(chunk, embedding)` / `addMany(chunks, embeddings)`
- `search(queryEmbedding, topK)` — returns the top-K chunks by cosine
  similarity
- `size()` / `clear()`

This store:

- is **in-memory** and **per agent instance**
- does not persist across app restarts (today)
- is fine for hundreds of chunks; replace with a persistent / ANN
  store (e.g. `hnswlib-node`, already a dependency) when indices grow

The workspace-level constant
`workspace/data/vector_store/` is reserved for a persistent store —
see `WorkspaceService.getVectorStorePath()`.

## The Embedding Factory

`createEmbeddingModel({ providerId, apiKey, model })` returns an
`EmbeddingModel` with two methods:

```ts
interface EmbeddingModel {
  embedDocuments(texts: string[]): Promise<number[][]>;
  embedQuery(text: string): Promise<number[]>;
}
```

Under the hood it calls the OpenAI-compatible `embeddings.create` API.
`text-embedding-3-small` is the default. The factory sorts response
items by index before returning (providers are not required to return
vectors in input order).

## Choosing Chunk Size And Overlap

Broad guidance:

- **Prose / docs:** 800–1500 chars with 100–200 overlap.
- **Code:** prefer function-level or file-level chunks — the default
  splitter is naive for code.
- **Short notes:** small `chunkSize` (300–500) so each note lands as
  one chunk.

Tuning has measurable effects on retrieval quality — see the
[RAG best-practices guide](https://learn.microsoft.com/en-us/azure/developer/ai/advanced-retrieval-augmented-generation)
for trade-offs.

## Choosing `topK`

- `topK = 4` is the default and works for most queries.
- Raise to 6–10 for research queries that need more breadth.
- Small `topK` with a good splitter often beats large `topK` with a
  naive splitter — tighter context windows yield more focused answers.

## Events Emitted

Only the query path streams. `text` events carry each token of the
answer. The ingest path reports progress but does not emit token
events.

## Cancellation

`ctx.signal` is checked between pipeline stages (embedding, retrieval,
streaming) and passed to the provider calls.

## Known Limits

- Single in-memory store per agent instance. Multiple workspaces →
  multiple agent instances (the app doesn't do this automatically
  yet).
- No on-disk persistence of embeddings. Re-ingesting on every launch
  is required until persistence lands.
- No hybrid retrieval (BM25 + dense) out of the box. Pure cosine.
- No query rewriting / decomposition / multi-hop. One shot.

## Typical Flows

### Indexing A Workspace

The renderer (or a background task) enumerates resources, extracts
text per file type (`pdf-parse`, `mammoth`, plain), and submits a
single `ingest` task:

```ts
await window.task.submit({
  type: 'agent',
  input: {
    agentType: 'rag',
    input: {
      kind: 'ingest',
      documents: extractedDocs,
      providerId: 'openai',
      apiKey: '...',  // or resolved from Settings
    },
  },
});
```

### Asking A Question

```ts
await window.task.submit({
  type: 'agent',
  input: {
    agentType: 'rag',
    input: {
      kind: 'query',
      query: 'What did the 1912 report say about the foghorn tower?',
      providerId: 'openai',
      apiKey: '...',
      chatModel: 'gpt-4.1',
      topK: 6,
    },
  },
});
```

The task produces a streamed answer plus a `citations` array the UI
can surface beneath it.

## When To Use RAG Instead Of Plain Writer

Use RAG when the answer must come from the user's own documents —
research questions, "what did X say about Y", summarization with
source anchoring.

Use the Writer for generative writing, rewriting, or text shaping that
doesn't need to be tied to specific source chunks.

Use **both** by retrieving first and feeding the result into the
Writer — see [RAG_AUGMENTATION.md](./RAG_AUGMENTATION.md).
