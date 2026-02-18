/**
 * ragChain.ts — Query phase of the RAG pipeline.
 *
 * Builds a fully composed LCEL (LangChain Expression Language) chain:
 *
 *   question
 *     → { context: retriever → formatDocs, question: passthrough }
 *     → ChatPromptTemplate
 *     → ChatOpenAI (streaming)
 *     → StringOutputParser
 *     → AsyncIterableIterator<string>
 *
 * Separation from ragLoader.ts means the retriever is built once during
 * the indexing phase and reused cheaply here on every query.
 */

import { ChatOpenAI } from '@langchain/openai'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { StringOutputParser } from '@langchain/core/output_parsers'
import { RunnableSequence, RunnablePassthrough } from '@langchain/core/runnables'
import type { BaseRetriever } from '@langchain/core/retrievers'
import type { Document } from '@langchain/core/documents'

// ---------------------------------------------------------------------------
// Grounded answering prompt
// ---------------------------------------------------------------------------

/**
 * Strict grounding prompt: the model must answer only from the provided
 * context. This reduces hallucination and keeps responses document-anchored.
 *
 * {context} — concatenated chunk text injected at runtime
 * {question} — the user's query
 */
const RAG_PROMPT = ChatPromptTemplate.fromTemplate(`\
You are a helpful assistant. Answer the question based ONLY on the context below.
If the answer cannot be found in the context, respond with: "I don't know based on the provided document."
Do not make up information. Be concise and precise.

---
Context:
{context}
---

Question: {question}

Answer:`)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Concatenates retrieved Document chunks into a single context string.
 * Each chunk is separated by a blank line and prefixed with its source
 * metadata for traceability.
 */
function formatDocuments(docs: Document[]): string {
  return docs
    .map((doc, i) => {
      const source = doc.metadata?.source ? `[Source: ${doc.metadata.source}]` : `[Chunk ${i + 1}]`
      return `${source}\n${doc.pageContent}`
    })
    .join('\n\n')
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface RagChainOptions {
  retriever: BaseRetriever
  apiKey: string
  modelId?: string
  /** AbortSignal for cancellation support */
  signal?: AbortSignal
}

export interface RagChain {
  /** Stream tokens as they arrive from the LLM. */
  stream: (question: string) => AsyncGenerator<string>
  /** Single-shot query, returns the complete answer string. */
  invoke: (question: string) => Promise<string>
}

// ---------------------------------------------------------------------------
// Chain builder
// ---------------------------------------------------------------------------

/**
 * Creates a reusable RAG chain bound to the given retriever.
 *
 * The chain is composed using LCEL (RunnableSequence), which:
 * - enables lazy evaluation (nothing runs until .stream()/.invoke() is called)
 * - provides a uniform streaming interface via AsyncIterableIterator
 * - supports middleware like retry, fallback, and tracing without code changes
 */
export function buildRagChain(options: RagChainOptions): RagChain {
  const { retriever, apiKey, modelId = 'gpt-4o-mini', signal } = options

  // LLM with streaming enabled — tokens arrive as they are generated
  const llm = new ChatOpenAI({
    apiKey,
    model: modelId,
    streaming: true,
    temperature: 0 // deterministic answers for RAG (grounding > creativity)
  })

  /**
   * LCEL chain composition:
   *
   * Input: string (the user question)
   *
   * Step 1 — Parallel fan-out:
   *   - `context`: invoke the retriever with the question, then format the docs
   *   - `question`: pass the original question through unchanged
   *
   * Step 2 — Format prompt template with {context} and {question}
   *
   * Step 3 — Generate with ChatOpenAI (streaming)
   *
   * Step 4 — Parse the AI message into a plain string
   */
  const chain = RunnableSequence.from([
    {
      // Retrieve relevant chunks and serialize them into a single string
      context: retriever.pipe(formatDocuments),
      // Pass the original question through to the prompt template
      question: new RunnablePassthrough()
    },
    RAG_PROMPT,
    llm,
    new StringOutputParser()
  ])

  return {
    async *stream(question: string): AsyncGenerator<string> {
      console.log(`[RAG] Querying: "${question}"`)

      const streamIterable = await chain.stream(question, {
        signal
      })

      for await (const token of streamIterable) {
        if (signal?.aborted) break
        yield token
      }
    },

    async invoke(question: string): Promise<string> {
      console.log(`[RAG] Invoking: "${question}"`)
      return chain.invoke(question, { signal })
    }
  }
}
